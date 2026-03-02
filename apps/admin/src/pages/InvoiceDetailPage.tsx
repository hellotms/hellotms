import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { invoicesApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { formatBDT, formatDate, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Send, Download, Printer, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import type { Invoice, InvoiceItem } from '@hellotms/shared';
import { useForm } from 'react-hook-form';

type InvoiceWithRelations = Invoice & {
  companies: { id: string; name: string; email: string; phone: string; address: string } | null;
  projects: { id: string; title: string } | null;
  invoice_items: InvoiceItem[];
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  const sendForm = useForm({ defaultValues: { recipient_email: '', recipient_name: '' } });
  const newItemForm = useForm({ defaultValues: { description: '', quantity: 1, unit_price: 0 } });
  const editItemForm = useForm({ defaultValues: { description: '', quantity: 1, unit_price: 0 } });

  const { data: invoice, isLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, companies(*), projects(id, title), invoice_items(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as InvoiceWithRelations;
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from('invoices').update({ status }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoice', id] }),
  });

  const sendMutation = useMutation({
    mutationFn: async (values: { recipient_email: string; recipient_name: string }) => {
      const result = await invoicesApi.send(id!, values.recipient_email, values.recipient_name) as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Failed to send invoice');
      return result;
    },
    onSuccess: () => {
      setSendSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
    onError: (err: unknown) => setSendError((err as Error).message),
  });

  const addItemMutation = useMutation({
    mutationFn: async (values: { description: string; quantity: number; unit_price: number }) => {
      const amount = values.quantity * values.unit_price;
      const { error } = await supabase.from('invoice_items').insert({ ...values, amount, invoice_id: id });
      if (error) throw error;
      // Update total
      const newTotal = (invoice?.total_amount ?? 0) + amount;
      await supabase.from('invoices').update({ total_amount: newTotal }).eq('id', id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setIsAddingItem(false);
      newItemForm.reset({ description: '', quantity: 1, unit_price: 0 });
    },
  });

  const editItemMutation = useMutation({
    mutationFn: async ({ itemId, values }: { itemId: string; values: { description: string; quantity: number; unit_price: number } }) => {
      const amount = values.quantity * values.unit_price;
      const { error } = await supabase.from('invoice_items').update({ ...values, amount }).eq('id', itemId);
      if (error) throw error;
      // Recalculate total
      const { data: items } = await supabase.from('invoice_items').select('amount').eq('invoice_id', id!);
      const newTotal = (items ?? []).reduce((s: number, i: { amount: number }) => s + i.amount, 0);
      await supabase.from('invoices').update({ total_amount: newTotal }).eq('id', id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setIsEditingItem(null);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const item = invoice?.invoice_items.find(i => i.id === itemId);
      const { error } = await supabase.from('invoice_items').delete().eq('id', itemId);
      if (error) throw error;
      if (item) {
        const newTotal = (invoice?.total_amount ?? 0) - item.amount;
        await supabase.from('invoices').update({ total_amount: Math.max(0, newTotal) }).eq('id', id!);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setDeleteItemId(null);
    },
  });

  const handleDownloadPdf = async () => {
    const result = await invoicesApi.getPdf(id!) as { pdfUrl?: string | null };
    if (result.pdfUrl) {
      window.open(result.pdfUrl, '_blank');
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  if (!invoice) return <div className="text-center py-12 text-muted-foreground">Invoice not found.</div>;

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        description={`${invoice.companies?.name ?? ''} — ${invoice.projects?.title ?? ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {invoice.status === 'draft' && (
              <button onClick={() => updateStatusMutation.mutate('sent')} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">
                <Send className="h-4 w-4" /> Mark Sent
              </button>
            )}
            {invoice.status === 'sent' && (
              <button onClick={() => updateStatusMutation.mutate('paid')} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-700 rounded-lg text-sm hover:bg-green-50">
                Mark Paid
              </button>
            )}
            <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">
              <Download className="h-4 w-4" /> PDF
            </button>
            <button onClick={() => { setSendSuccess(false); setSendError(''); setIsSendOpen(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              <Send className="h-4 w-4" /> Send to Client
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header Info */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{invoice.invoice_number}</h2>
                <p className="text-muted-foreground text-sm mt-1">{invoice.projects?.title}</p>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground block">Issued</span><span className="font-medium">{formatDate(invoice.created_at)}</span></div>
              <div><span className="text-muted-foreground block">Due Date</span><span className="font-medium">{invoice.due_date ? formatDate(invoice.due_date) : '—'}</span></div>
              <div><span className="text-muted-foreground block">Sent At</span><span className="font-medium">{invoice.sent_at ? formatDateTime(invoice.sent_at) : '—'}</span></div>
            </div>
          </div>

          {/* Bill To */}
          {invoice.companies && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bill To</h3>
              <p className="font-semibold">{invoice.companies.name}</p>
              {invoice.companies.address && <p className="text-sm text-muted-foreground mt-1">{invoice.companies.address}</p>}
              {invoice.companies.email && <p className="text-sm text-muted-foreground">{invoice.companies.email}</p>}
              {invoice.companies.phone && <p className="text-sm text-muted-foreground">{invoice.companies.phone}</p>}
            </div>
          )}

          {/* Line Items */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold">Line Items</h3>
              {invoice.status === 'draft' && (
                <button onClick={() => setIsAddingItem(true)} className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <Plus className="h-3 w-3" /> Add line
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Description', 'Qty', 'Unit Price', 'Amount', invoice.status === 'draft' ? 'Actions' : ''].filter(Boolean).map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_items.map(item => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    {isEditingItem === item.id ? (
                      <td colSpan={5} className="px-4 py-2">
                        <form onSubmit={editItemForm.handleSubmit((v) => editItemMutation.mutate({ itemId: item.id, values: v }))} className="flex gap-2 items-center">
                          <input {...editItemForm.register('description')} defaultValue={item.description} placeholder="Description" className="flex-1 border border-border rounded px-2 py-1 text-xs" />
                          <input type="number" {...editItemForm.register('quantity', { valueAsNumber: true })} defaultValue={item.quantity} className="w-16 border border-border rounded px-2 py-1 text-xs" />
                          <input type="number" {...editItemForm.register('unit_price', { valueAsNumber: true })} defaultValue={item.unit_price} className="w-24 border border-border rounded px-2 py-1 text-xs" />
                          <button type="submit" className="text-primary"><Save className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setIsEditingItem(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3">{item.description}</td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3">{formatBDT(item.unit_price)}</td>
                        <td className="px-4 py-3 font-semibold">{formatBDT(item.amount)}</td>
                        {invoice.status === 'draft' && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => { setIsEditingItem(item.id); editItemForm.reset({ description: item.description, quantity: item.quantity, unit_price: item.unit_price }); }} className="text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => setDeleteItemId(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
                {isAddingItem && (
                  <tr className="border-b border-border bg-muted/20">
                    <td colSpan={5} className="px-4 py-2">
                      <form onSubmit={newItemForm.handleSubmit((v) => addItemMutation.mutate(v))} className="flex gap-2 items-center">
                        <input {...newItemForm.register('description')} placeholder="Description" className="flex-1 border border-border rounded px-2 py-1 text-xs" />
                        <input type="number" {...newItemForm.register('quantity', { valueAsNumber: true })} placeholder="Qty" className="w-16 border border-border rounded px-2 py-1 text-xs" />
                        <input type="number" {...newItemForm.register('unit_price', { valueAsNumber: true })} placeholder="Unit Price" className="w-24 border border-border rounded px-2 py-1 text-xs" />
                        <button type="submit" className="text-primary text-xs font-medium">Add</button>
                        <button type="button" onClick={() => setIsAddingItem(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                      </form>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex justify-end px-6 py-4 border-t border-border">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatBDT(invoice.total_amount)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Status</h3>
            <StatusBadge status={invoice.status} />
            <p className="text-xs text-muted-foreground mt-2">{invoice.type} • Created {formatDate(invoice.created_at)}</p>
          </div>

          {invoice.pdf_url && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-3">PDF</h3>
              <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Download className="h-4 w-4" /> Download PDF
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Send Modal */}
      <Modal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} title="Send Invoice to Client">
        {sendSuccess ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-semibold text-foreground">Invoice sent!</p>
            <p className="text-sm text-muted-foreground mt-1">The invoice has been emailed to the client.</p>
            <button onClick={() => setIsSendOpen(false)} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">Close</button>
          </div>
        ) : (
          <form onSubmit={sendForm.handleSubmit((v) => sendMutation.mutate(v))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Recipient Name *</label>
              <input {...sendForm.register('recipient_name', { required: true })} placeholder="e.g. Rahim Ahmed" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recipient Email *</label>
              <input type="email" {...sendForm.register('recipient_email', { required: true })} placeholder="client@example.com" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            {sendError && <p className="text-sm text-destructive">{sendError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsSendOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
              <button type="submit" disabled={sendMutation.isPending} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
                <Send className="h-4 w-4" />
                {sendMutation.isPending ? 'Sending...' : 'Send Invoice'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => deleteItemId && deleteItemMutation.mutate(deleteItemId)}
        title="Delete Line Item"
        message="Are you sure you want to remove this line item? The invoice total will be updated."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
