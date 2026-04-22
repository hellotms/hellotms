import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { invoicesApi, auditApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { formatBDT, formatDate, formatDateTime } from '@/lib/utils';
import { ArrowLeft, Send, Download, Plus, Trash2, Edit, Save, X, Loader2, CheckCircle2 } from 'lucide-react';
import type { Invoice, InvoiceItem, Collection } from '@hellotms/shared';
import { numberToWords } from '@hellotms/shared';
import { useForm } from 'react-hook-form';
import { toast } from '@/components/Toast';

import { useAuth } from '@/context/AuthContext';
import { DocumentHistory } from '@/components/DocumentHistory';

type InvoiceWithRelations = Invoice & {
  companies: { id: string; name: string; email: string; phone: string; address: string } | null;
  projects: { id: string; title: string; advance_received: number; location?: string | null } | null;
  invoice_items: InvoiceItem[];
};

export default function InvoiceDetailPage() {
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

  const sendForm = useForm({ defaultValues: { recipients: [{ name: '', email: '' }] } });
  const newItemForm = useForm({ defaultValues: { description: '', cost_price: 0, day_month: 1, quantity: 1, unit_price: 0 } });
  const editItemForm = useForm({ defaultValues: { description: '', cost_price: 0, day_month: 1, quantity: 1, unit_price: 0 } });

  const { data: invoice, isLoading } = useQuery<InvoiceWithRelations>({
    queryKey: ['invoice', id],
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

  // Fetch payment history from collections for this project
  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections-for-invoice', invoice?.project_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('collections')
        .select('id, amount, payment_date, method, note')
        .eq('project_id', invoice!.project_id)
        .order('payment_date', { ascending: true });
      return (data ?? []) as Collection[];
    },
    enabled: !!invoice?.project_id,
  });

  // Fetch ONLY standard (non-external) expenses for cost price display
  const { data: ledger = [] } = useQuery<any[]>({
    queryKey: ['ledger-for-invoice', invoice?.project_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('ledger_entries')
        .select('amount, is_external')
        .eq('project_id', invoice!.project_id)
        .is('deleted_at', null);
      return (data ?? []).filter((e: any) => e.is_external === false || e.is_external === null);
    },
    enabled: !!invoice?.project_id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from('invoices').update({ status }).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      auditApi.log({ action: 'update_invoice_status', entity_type: 'invoice', entity_id: id, after: { status } });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: async (patch: Partial<Invoice>) => {
      const { error } = await supabase.from('invoices').update(patch).eq('id', id!);
      if (error) throw error;

      // If multiplier_label is updated, sync it to all linked ledger entries
      if (patch.multiplier_label && invoice?.invoice_items) {
        const ledgerIds = invoice.invoice_items
          .map(item => item.ledger_id)
          .filter(Boolean) as string[];
        
        if (ledgerIds.length > 0) {
          await supabase
            .from('ledger_entries')
            .update({ multiplier_label: patch.multiplier_label })
            .in('id', ledgerIds);
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoice', id] }),
  });

  const sendMutation = useMutation({
    mutationFn: async (values: { recipients: { name: string; email: string }[] }) => {
      const result = await invoicesApi.send(id!, values.recipients) as { success: boolean; error?: string };
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
    mutationFn: async (values: { description: string; cost_price: number; day_month: number; quantity: number; unit_price: number }) => {
      const amount = values.quantity * values.day_month * values.unit_price;
      let finalLedgerId = null;

      if (invoice?.type === 'invoice' && invoice?.projects?.id) {
        const { data: newLedger, error: ledgerErr } = await supabase
          .from('ledger_entries')
          .insert({
            project_id: invoice.projects.id,
            type: 'expense',
            category: values.description || 'Invoice Item Cost',
            amount: (values.cost_price || 0) * values.quantity * (values.day_month || 1),
            quantity: values.quantity,
            day_month: values.day_month || 1,
            face_value: values.unit_price,
            entry_date: new Date().toISOString().slice(0, 10),
            paid_status: 'unpaid',
            paid_amount: 0,
            due_amount: (values.cost_price || 0) * values.quantity * (values.day_month || 1),
            is_external: false,
          })
          .select('id')
          .single();
        if (ledgerErr) throw ledgerErr;
        finalLedgerId = newLedger.id;
      }

      const { error } = await supabase.from('invoice_items').insert({
        ...values,
        amount,
        ledger_id: finalLedgerId,
        invoice_id: id
      });
      if (error) throw error;

      const newTotal = (invoice?.total_amount ?? 0) + amount;
      await supabase.from('invoices').update({ total_amount: newTotal }).eq('id', id!);
    },
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setIsAddingItem(false);
      newItemForm.reset({ description: '', cost_price: 0, day_month: 1, quantity: 1, unit_price: 0 });
      auditApi.log({ action: 'add_invoice_item', entity_type: 'invoice', entity_id: id, after: values });
    },
  });

  const editItemMutation = useMutation({
    mutationFn: async ({ itemId, ledgerId, values }: { itemId: string; ledgerId?: string | null; values: { description: string; cost_price: number; day_month: number; quantity: number; unit_price: number } }) => {
      const amount = values.quantity * values.day_month * values.unit_price;
      const { error } = await supabase.from('invoice_items').update({ ...values, amount }).eq('id', itemId);
      if (error) throw error;

      if (invoice?.type === 'invoice') {
        if (ledgerId) {
          await supabase.from('ledger_entries').update({
            quantity: values.quantity,
            day_month: values.day_month,
            face_value: values.unit_price,
            amount: values.cost_price * values.quantity * values.day_month,
            category: values.description,
          }).eq('id', ledgerId);
        } else if (values.cost_price > 0 && invoice?.projects?.id) {
          // Create a ledger if it didn't have one but now has cost
          const { data: newLedger } = await supabase
          .from('ledger_entries')
          .insert({
            project_id: invoice.projects.id, type: 'expense', category: values.description,
            amount: values.cost_price * values.quantity * values.day_month, 
            quantity: values.quantity, day_month: values.day_month, face_value: values.unit_price,
            entry_date: new Date().toISOString().slice(0, 10), paid_status: 'unpaid', paid_amount: 0, 
            due_amount: values.cost_price * values.quantity * values.day_month, is_external: false,
          })
          .select('id').single();
          if (newLedger) {
            await supabase.from('invoice_items').update({ ledger_id: newLedger.id }).eq('id', itemId);
          }
        }
      }

      const { data: items } = await supabase.from('invoice_items').select('amount').eq('invoice_id', id!);
      const newTotal = (items ?? []).reduce((s: number, i: { amount: number }) => s + i.amount, 0);
      await supabase.from('invoices').update({ total_amount: newTotal }).eq('id', id!);
    },
    onSuccess: (_, { itemId, values }) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setIsEditingItem(null);
      auditApi.log({ action: 'edit_invoice_item', entity_type: 'invoice', entity_id: id, after: { item_id: itemId, ...values } });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ itemId, ledgerId }: { itemId: string; ledgerId?: string | null }) => {
      const item = invoice?.invoice_items.find(i => i.id === itemId);

      const { error } = await supabase.from('invoice_items').delete().eq('id', itemId);
      if (error) throw error;

      if (item) {
        const newTotal = (invoice?.total_amount ?? 0) - item.amount;
        await supabase.from('invoices').update({ total_amount: Math.max(0, newTotal) }).eq('id', id!);
      }
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      setDeleteItemId(null);
      auditApi.log({ action: 'delete_invoice_item', entity_type: 'invoice', entity_id: id, before: { item_id: itemId } });
    },
  });

  const handleDownloadPdf = async () => {
    try {
      setPdfLoading(true);
      const result = await invoicesApi.getPdf(id!, false) as { pdfUrl?: string | null; error?: string };
      if (result.pdfUrl) {
        window.open(result.pdfUrl, '_blank');
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
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
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
        queryClient.invalidateQueries({ queryKey: ['document-history', id] });
        toast('PDF Regenerated successfully', 'success');
      } else {
        toast(result.error ?? 'Failed to regenerate PDF', 'error');
      }
    } catch { toast('Failed to regenerate PDF', 'error'); }
    finally { setPdfLoading(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  if (!invoice) return <div className="text-center py-12 text-muted-foreground">Invoice not found.</div>;

  // ── Computed financials ─────────────────────────────────────────────────────
  const subtotal = invoice.total_amount;
  const totalCostPrice = invoice.type === 'invoice' ? ledger.reduce((s, e) => s + Number(e.amount), 0) : 0;
  const discountValue = invoice.discount_value ?? 0;
  const invoiceNetPayable = Math.max(0, subtotal - discountValue);
  const totalReceived = invoice.type === 'invoice' ? collections.reduce((s, c) => s + c.amount, 0) + (invoice.projects?.advance_received ?? 0) : 0;
  const due = invoice.type === 'invoice' ? Math.max(0, invoiceNetPayable - totalReceived) : 0;

  // Invoice date (prefer explicit invoice_date, fallback to created_at)
  const displayDate = invoice.invoice_date || invoice.created_at;

  // Subject line (prefer subject, fallback to auto-generate)
  const subjectText = invoice.subject ||
    `${invoice.type === 'estimate' ? 'Estimate' : 'Invoice'} for ${invoice.projects?.title ?? ''}${invoice.projects?.location ? ` at ${invoice.projects.location}` : ''}`;

  const isDraft = invoice.status === 'draft';

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 w-full">
          <button onClick={() => navigate('/invoices')} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground mr-1">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <PageHeader
              title={`${invoice.type === 'estimate' ? 'Estimate' : 'Invoice'} ${invoice.invoice_number}`}
              description={`${invoice.companies?.name ?? ''} — ${invoice.projects?.title ?? ''}`}
              className="mb-0"
              actions={
                <div className="flex items-center gap-2 flex-wrap">
            {invoice.status === 'draft' && (
              <button onClick={() => updateStatusMutation.mutate('sent')} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">
                <Send className="h-4 w-4" /> Mark Sent
              </button>
            )}
            {invoice.status === 'sent' && (
              <button onClick={() => updateStatusMutation.mutate('paid')} className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-700 rounded-lg text-sm hover:bg-green-50 dark:bg-green-500/10">
                <CheckCircle2 className="h-4 w-4" /> Mark Paid
              </button>
            )}
            <button onClick={handleRegeneratePdf} disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-60" title="Regenerate PDF file">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Generate
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
        {/* ── Invoice Document (main card) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Invoice Paper */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">

            {/* ── Header: Bill To (left) + INVOICE label + Date/No table (right) ── */}
            <div className="p-8 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6 border-b border-border">
              {/* Left: Bill To */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  {invoice.type === 'estimate' ? 'Estimate To' : 'Invoice To'}
                </p>
                <p className="font-bold text-lg leading-snug">{invoice.companies?.name ?? '—'}</p>
                {invoice.companies?.address && (
                  <p className="text-sm text-muted-foreground mt-0.5">{invoice.companies.address}</p>
                )}
                {/* Subject line with inline edit */}
                <div className="mt-4 flex items-start gap-2 max-w-sm">
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-muted-foreground">Sub: </span>
                    {isEditingSubject ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          autoFocus
                          value={subjectDraft}
                          onChange={e => setSubjectDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              updateFieldMutation.mutate({ subject: subjectDraft });
                              setIsEditingSubject(false);
                            }
                            if (e.key === 'Escape') setIsEditingSubject(false);
                          }}
                          className="flex-1 border border-primary rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button onClick={() => { updateFieldMutation.mutate({ subject: subjectDraft }); setIsEditingSubject(false); }} className="text-primary"><Save className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setIsEditingSubject(false)} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <span className="text-sm text-foreground">{subjectText}</span>
                    )}
                  </div>
                  {!isEditingSubject && (
                    <button
                      onClick={() => { setSubjectDraft(invoice.subject ?? subjectText); setIsEditingSubject(true); }}
                      className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                      title="Edit subject"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Right: INVOICE heading + date/no table */}
              <div className="sm:text-right shrink-0">
                <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-foreground mb-4 leading-none">
                  {invoice.type === 'estimate' ? 'ESTIMATE' : 'INVOICE'}
                </h1>
                <StatusBadge status={invoice.status} />
                <table className="text-sm mt-3 sm:ml-auto border border-border rounded-lg overflow-hidden">
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="text-muted-foreground px-3 py-1.5 font-medium whitespace-nowrap bg-muted/40">Date</td>
                      <td className="px-3 py-1.5 font-semibold tabular-nums">
                        {isEditingDate ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="date"
                              value={dateDraft}
                              onChange={e => setDateDraft(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { updateFieldMutation.mutate({ invoice_date: dateDraft }); setIsEditingDate(false); }
                                if (e.key === 'Escape') setIsEditingDate(false);
                              }}
                              className="border border-primary rounded px-1.5 py-0.5 text-xs focus:outline-none"
                            />
                            <button onClick={() => { updateFieldMutation.mutate({ invoice_date: dateDraft }); setIsEditingDate(false); }} className="text-primary"><Save className="h-3 w-3" /></button>
                            <button onClick={() => setIsEditingDate(false)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            {formatDate(displayDate)}
                            <button
                              onClick={() => { setDateDraft((invoice.invoice_date || invoice.created_at || '').slice(0, 10)); setIsEditingDate(true); }}
                              className="text-muted-foreground hover:text-primary"
                              title="Edit date"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted-foreground px-3 py-1.5 font-medium whitespace-nowrap bg-muted/40">INV NO#</td>
                      <td className="px-3 py-1.5 font-bold text-primary tabular-nums">{invoice.invoice_number}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Line Items Table ── */}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white w-10">SL</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white w-24">
                      Cost Price
                      <span className="ml-1 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-900 px-1 py-0.5 rounded font-normal">admin only</span>
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white w-20">Qty</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white w-20">
                       {isDraft ? (
                         <select 
                           value={invoice.multiplier_label || 'Days'} 
                           onChange={(e) => updateFieldMutation.mutate({ multiplier_label: e.target.value })}
                           className="bg-transparent border-none focus:ring-0 cursor-pointer hover:text-white transition-colors p-0 font-semibold"
                         >
                           <option value="Day" className="text-foreground">Day</option>
                           <option value="Days" className="text-foreground">Days</option>
                           <option value="Month" className="text-foreground">Month</option>
                           <option value="Day/Month" className="text-foreground">Day/Month</option>
                         </select>
                       ) : (
                         invoice.multiplier_label || 'Days'
                       )}
                     </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white w-32">Sell Price (৳)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-white w-28">Total (৳)</th>
                    {isDraft && <th className="w-20" />}
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_items.map((item, idx) => (
                    <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${item.ledger_id ? 'bg-primary/5' : ''}`}>
                      {isEditingItem === item.id ? (
                        <td colSpan={isDraft ? 8 : 7} className="px-4 py-2">
                          <form onSubmit={editItemForm.handleSubmit(v => editItemMutation.mutate({ itemId: item.id, ledgerId: item.ledger_id, values: v }))} className="flex gap-2 items-center">
                            <span className="text-muted-foreground text-xs w-6">{idx + 1}</span>
                            <textarea {...editItemForm.register('description')} defaultValue={item.description} placeholder="Description" rows={2} className="flex-1 border border-border rounded px-2 py-1 text-xs bg-transparent resize-none" />
                            <input type="number" {...editItemForm.register('cost_price', { valueAsNumber: true })} defaultValue={item.cost_price || 0} disabled={!!item.ledger_id} placeholder="0" className="w-20 border border-border rounded px-2 py-1 text-xs bg-transparent disabled:opacity-60" title={item.ledger_id ? "Sourced from ledger, cannot edit cost here" : "Enter cost price"} />
                            <input type="number" {...editItemForm.register('quantity', { valueAsNumber: true })} defaultValue={item.quantity} className="w-14 border border-border rounded px-2 py-1 text-xs bg-transparent" />
                            <input type="number" {...editItemForm.register('day_month', { valueAsNumber: true })} defaultValue={item.day_month || 1} className="w-14 border border-border rounded px-2 py-1 text-xs bg-transparent" />
                            <input type="number" {...editItemForm.register('unit_price', { valueAsNumber: true })} defaultValue={item.unit_price} className="w-24 border border-border rounded px-2 py-1 text-xs bg-transparent" />
                            <button type="submit" className="text-primary"><Save className="h-4 w-4" /></button>
                            <button type="button" onClick={() => setIsEditingItem(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground italic">{item.description}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded bg-muted text-muted-foreground font-mono text-[11px]">
                              {item.cost_price && item.cost_price > 0 ? formatBDT(item.cost_price) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-center">{item.day_month || 1}</td>
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
                      <td colSpan={isDraft ? 8 : 7} className="px-4 py-2">
                        <form onSubmit={newItemForm.handleSubmit(v => addItemMutation.mutate(v))} className="flex gap-2 items-center">
                          <textarea autoFocus {...newItemForm.register('description', { required: true })} placeholder="Item details..." rows={2} className="flex-1 border border-border rounded px-2 py-1 text-xs bg-transparent resize-none" />
                          <input type="number" {...newItemForm.register('cost_price', { valueAsNumber: true })} placeholder="0" className="w-20 border border-border rounded px-2 py-1 text-xs bg-transparent" />
                          <input type="number" min="1" {...newItemForm.register('quantity', { valueAsNumber: true })} className="w-14 border border-border rounded px-2 py-1 text-xs bg-transparent" />
                          <input type="number" min="1" {...newItemForm.register('day_month', { valueAsNumber: true })} className="w-14 border border-border rounded px-2 py-1 text-xs bg-transparent" />
                          <input type="number" {...newItemForm.register('unit_price', { valueAsNumber: true })} placeholder="0" className="w-24 border border-border rounded px-2 py-1 text-xs bg-transparent" />
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

            {/* ── Footer: Other Comments (left) + Totals (right) ── */}
            <div className="border-t border-border p-6">
              <div className="flex flex-col sm:flex-row gap-8">

                {/* Other Comments — left */}
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-foreground mb-2 uppercase tracking-wide text-xs">Other Comments</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground text-xs leading-relaxed">
                    <li>Make all payments in Cash / A/C Cheque / PO favoring of <span className="font-semibold text-foreground">"THE MARKETING SOLUTION"</span></li>
                    <li>All rates are Excluding VAT and other Taxes.</li>
                    <li>Payment should be paid within 15 days after product delivery / submission of the bill.</li>
                  </ol>
                </div>

                {/* Totals — right */}
                <div className="sm:w-72 flex flex-col gap-1.5 text-sm shrink-0">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sub Total</span>
                    <span className="font-medium tabular-nums">{formatBDT(subtotal)}</span>
                  </div>
                  {totalCostPrice > 0 && invoice.type === 'invoice' && (
                    <div className="flex justify-between text-xs text-muted-foreground/70 italic">
                      <span>Total Cost Price</span>
                      <span className="tabular-nums">{formatBDT(totalCostPrice)}</span>
                    </div>
                  )}
                  {discountValue > 0 && (
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Discount {invoice.discount_type === 'percent' ? '(%)' : ''}</span>
                      <span className="tabular-nums">− {formatBDT(discountValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-border pt-1.5">
                    <span>Total Payable</span>
                    <span className="tabular-nums">{formatBDT(invoiceNetPayable)}</span>
                  </div>
                  {totalReceived > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 italic">
                      <span>Payments Received</span>
                      <span className="tabular-nums">− {formatBDT(totalReceived)}</span>
                    </div>
                  )}
                  {invoice.type === 'invoice' && (
                    <div className={`flex justify-between text-base font-bold border-t-2 pt-2 mt-1 ${due > 0 ? 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200'}`}>
                      <span>{due > 0 ? 'Balance Due' : 'Project Paid'}</span>
                      <span className="tabular-nums">{due > 0 ? formatBDT(due) : '✓ Paid'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount in Words */}
              <div className="mt-6 -mx-8 px-8 py-3.5 bg-muted/30 border-y border-border/40">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Amount in Words: </span>
                  Taka {numberToWords(invoice.type === 'estimate' ? invoiceNetPayable : (due > 0 ? due : invoiceNetPayable))} Only
                </p>
                <p className="text-[10px] text-muted-foreground italic text-right mt-1">
                  * This is a computer generated invoice, no signature is required.
                </p>
              </div>
            </div>

            {/* Notes (if any) */}
            {invoice.notes && (
              <div className="px-6 pb-6">
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Payment History */}
          {collections.length > 0 && invoice.type === 'invoice' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold">Payments Received</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {['Date', 'Method', 'Note', 'Amount'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {collections.map(c => (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">{formatDate(c.payment_date)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.method ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.note ?? '—'}</td>
                      <td className="px-4 py-2.5 font-semibold text-green-700">{formatBDT(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-4 border-t border-border flex flex-col items-end gap-2">
                <div className="flex justify-between w-52 text-sm">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-medium text-green-700">− {formatBDT(totalReceived)}</span>
                </div>
                <div className={`flex justify-between w-52 text-sm rounded-lg px-3 py-2 font-bold ${due > 0 ? 'bg-red-50 dark:bg-red-500/10 text-red-700' : 'bg-green-50 dark:bg-green-500/10 text-green-700'}`}>
                  <span>{due > 0 ? 'AMOUNT DUE' : 'FULLY PAID'}</span>
                  <span>{due > 0 ? formatBDT(due) : formatBDT(0)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Status</h3>
            <StatusBadge status={invoice.status} />
            <p className="text-xs text-muted-foreground mt-2">{invoice.type} · Created {formatDate(invoice.created_at)}</p>
          </div>

          {/* Due summary in sidebar */}
          {invoice.type === 'invoice' ? (
            <div className={`rounded-xl p-5 border ${due > 0 ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' : 'bg-green-50 dark:bg-green-500/10 border-green-200'}`}>
              <h3 className={`font-semibold mb-2 text-sm ${due > 0 ? 'text-red-800' : 'text-green-800'}`}>
                {due > 0 ? 'Outstanding Due' : 'Payment Status'}
              </h3>
              <p className={`text-2xl font-bold ${due > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {due > 0 ? formatBDT(due) : 'Fully Paid ✓'}
              </p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Total Payable</span><span>{formatBDT(invoiceNetPayable)}</span></div>
                <div className="flex justify-between"><span>Total Paid</span><span className="text-green-700">{formatBDT(totalReceived)}</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-2 text-sm">Total Amount</h3>
              <p className="text-2xl font-bold text-primary">{formatBDT(invoiceNetPayable)}</p>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-5">
            <DocumentHistory parentId={id!} type="invoice" />
          </div>
        </div>
      </div>

      {/* Send Modal */}
      <Modal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} title={`Send ${invoice.type === 'estimate' ? 'Estimate' : 'Invoice'} to Client`}>
        {sendSuccess ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-semibold text-foreground">{invoice.type === 'estimate' ? 'Estimate' : 'Invoice'} sent!</p>
            <p className="text-sm text-muted-foreground mt-1">The {invoice.type === 'estimate' ? 'estimate' : 'invoice'} has been emailed with a PDF attachment.</p>
            <button onClick={() => setIsSendOpen(false)} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">Close</button>
          </div>
        ) : (
          <form onSubmit={sendForm.handleSubmit(v => sendMutation.mutate(v))} className="space-y-4">
             <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {sendForm.watch('recipients').map((field, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg bg-muted/20 relative group">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Name</label>
                        <input 
                           {...sendForm.register(`recipients.${index}.name` as const, { required: true })} 
                           placeholder="Recipient Name" 
                           className="w-full border border-border rounded px-2.5 py-1.5 text-sm bg-card"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Email</label>
                        <input 
                           type="email" 
                           {...sendForm.register(`recipients.${index}.email` as const, { required: true })} 
                           placeholder="email@example.com" 
                           className="w-full border border-border rounded px-2.5 py-1.5 text-sm bg-card" 
                        />
                      </div>
                    </div>
                    {sendForm.watch('recipients').length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const current = sendForm.getValues('recipients');
                          sendForm.setValue('recipients', current.filter((_, i) => i !== index));
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
             </div>

             <button 
                type="button" 
                onClick={() => {
                  const current = sendForm.getValues('recipients');
                  sendForm.setValue('recipients', [...current, { name: '', email: '' }]);
                }}
                className="flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded"
             >
                <Plus className="h-3 w-3" /> Add Recipient
             </button>

            {sendError && <p className="text-sm text-destructive">{sendError}</p>}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
              <button type="button" onClick={() => setIsSendOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
              <button type="submit" disabled={sendMutation.isPending} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendMutation.isPending ? 'Sending...' : `Send to ${sendForm.watch('recipients').length} Recipients`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={() => {
          if (!deleteItemId) return;
          const it = invoice?.invoice_items?.find(i => i.id === deleteItemId);
          deleteItemMutation.mutate({ itemId: deleteItemId, ledgerId: it?.ledger_id });
        }}
        title="Delete Line Item"
        message={`Are you sure you want to remove this line item? The ${invoice.type === 'estimate' ? 'estimate' : 'invoice'} total will be updated.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
