import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { invoicesApi, auditApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { formatBDT, formatDate, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Send, Download, Plus, Trash2, Edit, Save, X, Loader2 } from 'lucide-react';
import type { Invoice, InvoiceItem } from '@hellotms/shared';
import { numberToWords } from '@hellotms/shared';
import { useForm } from 'react-hook-form';
import { toast } from '@/components/Toast';

import { useAuth } from '@/context/AuthContext';

type InvoiceWithRelations = Invoice & {
  companies: { id: string; name: string; email: string; phone: string; address: string } | null;
  projects: { id: string; title: string; advance_received: number; location?: string | null } | null;
  invoice_items: InvoiceItem[];
};

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Inline edit state
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState('');

  const sendForm = useForm({ defaultValues: { recipient_email: '', recipient_name: '' } });
  const newItemForm = useForm({ defaultValues: { description: '', cost_price: 0, quantity: 1, unit_price: 0 } });
  const editItemForm = useForm({ defaultValues: { description: '', cost_price: 0, quantity: 1, unit_price: 0 } });

  const { data: estimate, isLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ['estimate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, companies(*), projects(id, title, advance_received, location), invoice_items(*)')
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
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      auditApi.log({ action: 'update_estimate_status', entity_type: 'invoice', entity_id: id, after: { status } });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async (patch: Partial<Invoice>) => {
      const { error } = await supabase.from('invoices').update(patch).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['estimate', id] }),
  });

  const sendMutation = useMutation({
    mutationFn: async (values: { recipient_email: string; recipient_name: string }) => {
      const result = await invoicesApi.send(id!, values.recipient_email, values.recipient_name) as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Failed to send estimate');
      return result;
    },
    onSuccess: () => {
      setSendSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
    },
    onError: (err: unknown) => setSendError((err as Error).message),
  });

  const addItemMutation = useMutation({
    mutationFn: async (values: { description: string; cost_price: number; quantity: number; unit_price: number }) => {
      const amount = values.quantity * values.unit_price;
      const { error } = await supabase.from('invoice_items').insert({
        ...values,
        amount,
        invoice_id: id
      });
      if (error) throw error;

      const newTotal = (estimate?.total_amount ?? 0) + amount;
      await supabase.from('invoices').update({ total_amount: newTotal }).eq('id', id!);
    },
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      setIsAddingItem(false);
      newItemForm.reset({ description: '', cost_price: 0, quantity: 1, unit_price: 0 });
      auditApi.log({ action: 'add_estimate_item', entity_type: 'invoice', entity_id: id, after: values });
    },
  });

  const editItemMutation = useMutation({
    mutationFn: async ({ itemId, values }: { itemId: string; values: { description: string; cost_price: number; quantity: number; unit_price: number } }) => {
      const amount = values.quantity * values.unit_price;
      const { error } = await supabase.from('invoice_items').update({ ...values, amount }).eq('id', itemId);
      if (error) throw error;

      const { data: items } = await supabase.from('invoice_items').select('amount').eq('invoice_id', id!);
      const newTotal = (items ?? []).reduce((s: number, i: { amount: number }) => s + i.amount, 0);
      await supabase.from('invoices').update({ total_amount: newTotal }).eq('id', id!);
    },
    onSuccess: (_, { itemId, values }) => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      setIsEditingItem(null);
      auditApi.log({ action: 'edit_estimate_item', entity_type: 'invoice', entity_id: id, after: { item_id: itemId, ...values } });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      const item = estimate?.invoice_items.find(i => i.id === itemId);
      const { error } = await supabase.from('invoice_items').delete().eq('id', itemId);
      if (error) throw error;

      if (item) {
        const newTotal = (estimate?.total_amount ?? 0) - item.amount;
        await supabase.from('invoices').update({ total_amount: Math.max(0, newTotal) }).eq('id', id!);
      }
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      setDeleteItemId(null);
      auditApi.log({ action: 'delete_estimate_item', entity_type: 'invoice', entity_id: id, before: { item_id: itemId } });
    },
  });

  const handleDownloadPdf = async () => {
    try {
      setPdfLoading(true);
      const result = await invoicesApi.getPdf(id!, false) as { pdfUrl?: string | null; error?: string };
      if (result.pdfUrl) {
        window.open(result.pdfUrl, '_blank');
        queryClient.invalidateQueries({ queryKey: ['estimate', id] });
      } else {
        toast(result.error ?? 'Failed to download PDF', 'error');
      }
    } catch { toast('Failed to download PDF', 'error'); }
    finally { setPdfLoading(false); }
  };

  const handleRegeneratePdf = async () => {
    try {
      setPdfLoading(true);
      const result = await invoicesApi.getPdf(id!, true) as { pdfUrl?: string | null; error?: string };
      if (result.pdfUrl) {
        queryClient.invalidateQueries({ queryKey: ['estimate', id] });
        toast('PDF Regenerated successfully', 'success');
      } else {
        toast(result.error ?? 'Failed to regenerate PDF', 'error');
      }
    } catch { toast('Failed to regenerate PDF', 'error'); }
    finally { setPdfLoading(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  if (!estimate) return <div className="text-center py-12 text-muted-foreground">Estimate not found.</div>;

  const subtotal = estimate.total_amount;
  const discountValue = estimate.discount_value ?? 0;
  const estimateNetPayable = Math.max(0, subtotal - discountValue);

  const displayDate = estimate.invoice_date || estimate.created_at;
  const subjectText = estimate.subject ||
    `Estimate for ${estimate.projects?.title ?? ''}${estimate.projects?.location ? ` at ${estimate.projects.location}` : ''}`;

  const isDraft = estimate.status === 'draft';

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 w-full">
          <button onClick={() => navigate('/estimates')} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground mr-1">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <PageHeader
              title={`Estimate ${estimate.invoice_number}`}
              description={`${estimate.companies?.name ?? ''} — ${estimate.projects?.title ?? ''}`}
              className="mb-0"
              actions={
                <div className="flex items-center gap-2 flex-wrap">
            {estimate.status === 'draft' && (
              <button onClick={() => updateStatusMutation.mutate('sent')} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">
                <Send className="h-4 w-4" /> Mark Sent
              </button>
            )}
            <button onClick={handleRegeneratePdf} disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-60">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Generate
            </button>
            <button onClick={handleDownloadPdf} disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-60">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download
            </button>
            <button onClick={() => { setSendSuccess(false); setSendError(''); setIsSendOpen(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              <Send className="h-4 w-4" /> Send to Client
            </button>
              </div>
            }
          />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6 border-b border-border">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Estimate To</p>
                <p className="font-bold text-lg leading-snug">{estimate.companies?.name ?? '—'}</p>
                {estimate.companies?.address && <p className="text-sm text-muted-foreground mt-0.5">{estimate.companies.address}</p>}
                
                <div className="mt-4 flex items-start gap-2 max-w-sm">
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-muted-foreground">Sub: </span>
                    {isEditingSubject ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          autoFocus
                          value={subjectDraft}
                          onChange={e => setSubjectDraft(e.target.value)}
                          className="flex-1 border border-primary rounded px-2 py-0.5 text-sm"
                        />
                        <button onClick={() => { updateFieldMutation.mutate({ subject: subjectDraft }); setIsEditingSubject(false); }} className="text-primary"><Save className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setIsEditingSubject(false)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <span className="text-sm text-foreground">{subjectText}</span>
                    )}
                  </div>
                  {!isEditingSubject && (
                    <button onClick={() => { setSubjectDraft(estimate.subject ?? subjectText); setIsEditingSubject(true); }} className="mt-0.5 text-muted-foreground hover:text-primary">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:text-right shrink-0">
                <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-foreground mb-4 leading-none text-red-600">ESTIMATE</h1>
                <StatusBadge status={estimate.status} />
                <table className="text-sm mt-3 sm:ml-auto border border-border rounded-lg overflow-hidden">
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="text-muted-foreground px-3 py-1.5 font-medium whitespace-nowrap bg-muted/40">Date</td>
                      <td className="px-3 py-1.5 font-semibold tabular-nums">
                        {isEditingDate ? (
                          <div className="flex items-center gap-1">
                            <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)} className="border border-primary rounded px-1.5 py-0.5 text-xs" />
                            <button onClick={() => { updateFieldMutation.mutate({ invoice_date: dateDraft }); setIsEditingDate(false); }} title="Save" className="text-primary"><Save className="h-3 w-3" /></button>
                            <button onClick={() => setIsEditingDate(false)} title="Cancel" className="text-muted-foreground"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            {formatDate(displayDate)}
                            <button onClick={() => { setDateDraft((estimate.invoice_date || estimate.created_at || '').slice(0, 10)); setIsEditingDate(true); }} className="text-muted-foreground hover:text-primary">
                              <Edit className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted-foreground px-3 py-1.5 font-medium whitespace-nowrap bg-muted/40">EST NO#</td>
                      <td className="px-3 py-1.5 font-bold text-primary tabular-nums">{estimate.invoice_number}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Line Items</h3>
                {isDraft && (
                  <button onClick={() => setIsAddingItem(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus className="h-3 w-3" /> Add line
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold w-10">SL</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold w-24">Cost</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold w-20">Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold w-32">Sell Price (৳)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold w-28">Total (৳)</th>
                    {isDraft && <th className="w-20" />}
                  </tr>
                </thead>
                <tbody>
                  {estimate.invoice_items.map((item, idx) => (
                    <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      {isEditingItem === item.id ? (
                        <td colSpan={isDraft ? 7 : 6} className="px-4 py-2">
                          <form onSubmit={editItemForm.handleSubmit(v => editItemMutation.mutate({ itemId: item.id, values: v }))} className="flex gap-2 items-center">
                            <span className="text-muted-foreground text-xs w-6">{idx + 1}</span>
                            <input {...editItemForm.register('description')} className="flex-1 border border-border rounded px-2 py-1 text-xs" />
                            <input type="number" {...editItemForm.register('cost_price', { valueAsNumber: true })} className="w-20 border border-border rounded px-2 py-1 text-xs" />
                            <input type="number" {...editItemForm.register('quantity', { valueAsNumber: true })} className="w-16 border border-border rounded px-2 py-1 text-xs" />
                            <input type="number" {...editItemForm.register('unit_price', { valueAsNumber: true })} className="w-24 border border-border rounded px-2 py-1 text-xs" />
                            <button type="submit" className="text-primary"><Save className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setIsEditingItem(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="px-4 py-3"><span className="text-[11px] font-mono opacity-60">{item.cost_price ? formatBDT(item.cost_price) : '—'}</span></td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3">{formatBDT(item.unit_price)}</td>
                          <td className="px-4 py-3 font-semibold">{formatBDT(item.amount)}</td>
                          {isDraft && (
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => { setIsEditingItem(item.id); editItemForm.reset(item as any); }} className="text-muted-foreground hover:text-primary"><Edit className="h-4 w-4" /></button>
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
                      <td colSpan={isDraft ? 7 : 6} className="px-4 py-2">
                        <form onSubmit={newItemForm.handleSubmit(v => addItemMutation.mutate(v))} className="flex gap-2 items-center">
                          <input autoFocus {...newItemForm.register('description', { required: true })} placeholder="Item details..." className="flex-1 border border-border rounded px-2 py-1 text-xs" />
                          <input type="number" {...newItemForm.register('cost_price', { valueAsNumber: true })} placeholder="0" className="w-20 border border-border rounded px-2 py-1 text-xs" />
                          <input type="number" min="1" {...newItemForm.register('quantity', { valueAsNumber: true })} className="w-16 border border-border rounded px-2 py-1 text-xs" />
                          <input type="number" {...newItemForm.register('unit_price', { valueAsNumber: true })} placeholder="0" className="w-24 border border-border rounded px-2 py-1 text-xs" />
                          <button type="submit" className="text-primary text-xs font-medium">Add</button>
                          <button type="button" onClick={() => setIsAddingItem(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                        </form>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            <div className="border-t border-border p-6">
              <div className="flex flex-col sm:flex-row gap-8">
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-foreground mb-2 uppercase tracking-wide text-xs">Other Comments</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground text-xs leading-relaxed">
                    <li>This is an estimate only. Final amount may vary.</li>
                    <li>Rates are excluding VAT and other Taxes.</li>
                    <li>Validity: 15 days from the date of issue.</li>
                  </ol>
                </div>
                <div className="sm:w-72 flex flex-col gap-1.5 text-sm shrink-0">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sub Total</span>
                    <span className="font-medium tabular-nums">{formatBDT(subtotal)}</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span className="tabular-nums">− {formatBDT(discountValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-border pt-1.5 text-lg text-primary">
                    <span>Total Estimate</span>
                    <span className="tabular-nums">{formatBDT(estimateNetPayable)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 -mx-8 px-8 py-3.5 bg-muted/30 border-y border-border/40">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Amount in Words: </span>
                  Taka {numberToWords(estimateNetPayable)} Only
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Status</h3>
            <StatusBadge status={estimate.status} />
            <p className="text-xs text-muted-foreground mt-2">Estimate · Created {formatDate(estimate.created_at)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-2 text-sm">Estimate Total</h3>
            <p className="text-2xl font-bold text-primary">{formatBDT(estimateNetPayable)}</p>
          </div>
          {estimate.pdf_url && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-3">Last PDF</h3>
              <a href={estimate.pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Download className="h-4 w-4" /> Download PDF
              </a>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} title="Send Estimate to Client">
        {sendSuccess ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-semibold">Estimate sent!</p>
            <button onClick={() => setIsSendOpen(false)} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">Close</button>
          </div>
        ) : (
          <form onSubmit={sendForm.handleSubmit(v => sendMutation.mutate(v))} className="space-y-4">
            <input {...sendForm.register('recipient_name', { required: true })} placeholder="Recipient Name" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            <input type="email" {...sendForm.register('recipient_email', { required: true })} placeholder="Recipient Email" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            {sendError && <p className="text-sm text-destructive">{sendError}</p>}
            <button type="submit" disabled={sendMutation.isPending} className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium">
              {sendMutation.isPending ? 'Sending...' : 'Send Estimate'}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => deleteItemMutation.mutate({ itemId: deleteItemId! })}
        title="Delete Item"
        message="Are you sure you want to remove this item from the estimate?"
        danger
      />
    </div>
  );
}
