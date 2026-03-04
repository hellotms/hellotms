import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { formatBDT, formatDate } from '@/lib/utils';
import { Plus, Receipt, Trash, Pencil, Trash2, ReceiptText } from 'lucide-react';
import type { Invoice, Company, Project } from '@hellotms/shared';
import { generateInvoiceNumber } from '@hellotms/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from '@/components/Toast';
import { auditApi } from '@/lib/api';

const STATUS_OPTIONS = ['all', 'draft', 'sent', 'paid', 'overdue'];

type LedgerRow = {
  id: string;
  category: string;
  amount: number;
  note?: string | null;
  entry_date: string;
  quantity?: number | null;
  face_value?: number | null;
};

type InvoiceLineItem = {
  description: string;
  costPrice: number; // admin-only, NOT saved to DB or PDF
  quantity: number;
  unit_price: number;
  amount: number;
};

export default function InvoicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Read pre-selection from URL (e.g. coming from a project page)
  const preProjectId = searchParams.get('project') ?? '';
  const preCompanyId = searchParams.get('company') ?? '';

  const [isOpen, setIsOpen] = useState(searchParams.get('new') === '1');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);

  // Creation form state — pre-initialize with URL params
  const [selectedCompanyId, setSelectedCompanyId] = useState(preCompanyId);
  const [selectedProjectId, setSelectedProjectId] = useState(preProjectId);
  const [invoiceNum, setInvoiceNum] = useState('');
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'estimate'>('invoice');
  const [invoiceStatus, setInvoiceStatus] = useState('draft');
  const [dueDate, setDueDate] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  // Queries
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return (data ?? []) as Company[];
    },
  });

  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, title, company_id').order('title');
      return (data ?? []) as Project[];
    },
  });

  const filteredProjects = selectedCompanyId
    ? allProjects.filter(p => p.company_id === selectedCompanyId)
    : allProjects;

  // Auto-fetch ledger entries when project is selected
  const { data: ledgerEntries = [], isFetching: ledgerLoading } = useQuery<LedgerRow[]>({
    queryKey: ['ledger-for-invoice', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data } = await supabase
        .from('ledger_entries')
        .select('id, category, amount, note, entry_date, quantity, face_value')
        .eq('project_id', selectedProjectId)
        .eq('type', 'expense')
        .is('deleted_at', null)
        .order('entry_date', { ascending: true });
      return (data ?? []) as LedgerRow[];
    },
    enabled: !!selectedProjectId,
  });

  // Fetch project details for advance payment
  const { data: projectDetails } = useQuery({
    queryKey: ['invoice-project-details', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('advance_received')
        .eq('id', selectedProjectId)
        .single();
      return data;
    },
    enabled: !!selectedProjectId,
  });

  // Fetch collections for this project
  const { data: collections = [] } = useQuery({
    queryKey: ['invoice-collections', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data } = await supabase
        .from('collections')
        .select('amount')
        .eq('project_id', selectedProjectId);
      return data ?? [];
    },
    enabled: !!selectedProjectId,
  });

  const advanceReceived = Number(projectDetails?.advance_received || 0);
  const totalCollections = collections.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalReceived = advanceReceived + totalCollections;

  // Auto-populate line items when ledger entries change
  useEffect(() => {
    if (ledgerEntries.length > 0) {
      setLineItems(ledgerEntries.map(e => {
        const qty = Number(e.quantity ?? 1);
        const sellPrice = Number(e.face_value ?? 0);
        return {
          description: e.category + (e.note ? ` — ${e.note}` : ''),
          costPrice: e.amount,
          quantity: qty,
          unit_price: sellPrice,
          amount: qty * sellPrice,
        };
      }));
    }
  }, [ledgerEntries]);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: async () => {
      let q = supabase.from('invoices').select('*, companies(name), projects(title)').order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: invoiceCount } = useQuery<number>({
    queryKey: ['invoice-count'],
    queryFn: async () => {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  // Set invoice number when modal opens
  useEffect(() => {
    if (isOpen) {
      setInvoiceNum(generateInvoiceNumber((invoiceCount ?? 0) + 1));
    }
  }, [isOpen, invoiceCount]);

  // Reset form when modal closes
  const closeModal = () => {
    setIsOpen(false);
    setSelectedCompanyId('');
    setSelectedProjectId('');
    setLineItems([]);
    setDiscountValue(0);
    setDiscountType('flat');
    setNotes('');
    setDueDate('');
  };

  // Line item helpers
  const updateItem = (idx: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.amount = Number(updated.quantity) * Number(updated.unit_price);
      return updated;
    }));
  };

  const removeItem = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));

  const addBlankItem = () => setLineItems(prev => [...prev, { description: '', costPrice: 0, quantity: 1, unit_price: 0, amount: 0 }]);

  const subtotal = lineItems.reduce((s, item) => s + item.amount, 0);
  const totalCost = lineItems.reduce((s, item) => s + (item.costPrice * item.quantity), 0);
  const discountAmt = discountType === 'percent'
    ? subtotal * (discountValue / 100)
    : discountValue;
  const totalPayable = Math.max(0, subtotal - discountAmt - totalReceived);
  const adminProfit = subtotal - discountAmt - totalCost;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId || !selectedProjectId) throw new Error('Please select a Company and Project.');
      if (lineItems.every(i => i.amount === 0)) throw new Error('At least one line item must have a price.');

      const items = lineItems.map(i => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        amount: i.amount,
      }));

      const { data: { user } } = await supabase.auth.getUser();

      const { data: inv, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNum,
          company_id: selectedCompanyId,
          project_id: selectedProjectId,
          type: invoiceType,
          status: invoiceStatus,
          due_date: dueDate || null,
          total_amount: subtotal,
          discount_type: discountType,
          discount_value: discountAmt,
          notes: notes || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        await supabase.from('invoice_items').insert(items.map(i => ({ ...i, invoice_id: inv.id })));
      }
      return inv;
    },
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-count'] });
      closeModal();
      toast('Invoice created successfully', 'success');
      auditApi.log({
        action: 'create_invoice',
        entity_type: 'invoice',
        entity_id: inv.id,
        after: {
          invoice_number: invoiceNum,
          company_id: selectedCompanyId,
          project_id: selectedProjectId,
          total_amount: subtotal
        }
      });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDeleteTarget(null);
      toast('Invoice deleted successfully!', 'success');
      auditApi.log({
        action: 'delete_invoice',
        entity_type: 'invoice',
        entity_id: id
      });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const columns: ColumnDef<Invoice & { companies: { name: string } | null; projects: { title: string } | null }, unknown>[] = [
    {
      accessorKey: 'invoice_number',
      header: 'Invoice #',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-purple-600" />
          <span className="font-medium">{row.original.invoice_number}</span>
        </div>
      ),
    },
    { accessorKey: 'companies', header: 'Company', cell: ({ getValue }) => (getValue() as { name: string } | null)?.name ?? '—' },
    { accessorKey: 'projects', header: 'Project', cell: ({ getValue }) => (getValue() as { title: string } | null)?.title ?? '—' },
    { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'total_amount', header: 'Amount', cell: ({ getValue }) => <span className="font-semibold">{formatBDT(Number(getValue()))}</span> },
    { accessorKey: 'due_date', header: 'Due Date', cell: ({ getValue }) => getValue() ? formatDate(getValue() as string) : '—' },
    { accessorKey: 'created_at', header: 'Created', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${row.original.id}`); }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
            title="View / Edit Invoice"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row.original); }}
            className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-muted-foreground hover:text-destructive"
            title="Delete Invoice"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create and manage client invoices"
        actions={
          <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> New Invoice
          </button>
        }
      />

      <div className="flex gap-2 mb-4">
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'border border-border text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <DataTable
            data={invoices as (Invoice & { companies: { name: string } | null; projects: { title: string } | null })[]}
            columns={columns}
            searchKey="invoice_number"
            searchPlaceholder="Search invoices..."
            onRowClick={(row) => navigate(`/invoices/${row.id}`)}
          />
        )}
      </div>

      {/* ── Create Invoice Modal ─── */}
      <Modal isOpen={isOpen} onClose={closeModal} title="Create Invoice" size="xl">
        <div className="space-y-5">
          {/* Step 1: Meta fields */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Invoice #</label>
              <input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Company *</label>
              <select
                value={selectedCompanyId}
                onChange={e => { setSelectedCompanyId(e.target.value); setSelectedProjectId(''); setLineItems([]); }}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"
              >
                <option value="">Select company...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Project *</label>
              <select
                value={selectedProjectId}
                onChange={e => { setSelectedProjectId(e.target.value); setLineItems([]); }}
                disabled={!selectedCompanyId}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card disabled:opacity-50"
              >
                <option value="">Select project...</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Type</label>
              <select value={invoiceType} onChange={e => setInvoiceType(e.target.value as 'invoice' | 'estimate')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                <option value="invoice">Invoice</option>
                <option value="estimate">Estimate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Status</label>
              <select value={invoiceStatus} onChange={e => setInvoiceStatus(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-sm flex items-center gap-1.5">
                <ReceiptText className="h-4 w-4 text-primary" /> Line Items
                {ledgerLoading && <span className="text-xs text-muted-foreground">(loading...)</span>}
                {ledgerEntries.length > 0 && !ledgerLoading && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{ledgerEntries.length} from project</span>
                )}
              </h4>
              <button type="button" onClick={addBlankItem} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add line
              </button>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold w-8">SL</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Description</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold w-24">
                      Cost Price
                      <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-normal">admin only</span>
                    </th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold w-16">Qty</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold w-28">Sell Price (৳)</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold w-24">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          value={item.description}
                          onChange={e => updateItem(i, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-muted text-muted-foreground font-mono text-[11px]">
                          {item.costPrice > 0 ? formatBDT(item.costPrice) : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                          min={1}
                          className="w-full border border-border rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unit_price || ''}
                          onChange={e => updateItem(i, 'unit_price', Number(e.target.value))}
                          placeholder="0"
                          className="w-full border border-border rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold text-foreground">{formatBDT(item.amount)}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeItem(i)} className="text-destructive/60 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-muted-foreground text-xs">
                        {selectedProjectId ? 'No expense entries found. Add lines manually.' : 'Select a project to auto-populate from transactions.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount + Notes Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discount */}
            <div className="bg-muted/40 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium">Discount</h4>
              <div className="flex gap-3 items-center">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="discountType" checked={discountType === 'flat'} onChange={() => setDiscountType('flat')} />
                    <span>৳ Flat</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" name="discountType" checked={discountType === 'percent'} onChange={() => setDiscountType('percent')} />
                    <span>% Percent</span>
                  </label>
                </div>
                <input
                  type="number"
                  value={discountValue || ''}
                  onChange={e => setDiscountValue(Number(e.target.value))}
                  placeholder="0"
                  min={0}
                  className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              {discountAmt > 0 && (
                <p className="text-xs text-muted-foreground">Discount: − {formatBDT(discountAmt)}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional notes for this invoice..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col items-end gap-1.5 text-sm relative overflow-hidden">
            {/* Admin Profit Badge */}
            <div className="absolute top-4 left-4 border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs">
              <span className="block font-semibold mb-0.5">Admin Profit Prediction</span>
              <span className="font-mono text-sm">{formatBDT(adminProfit)}</span>
              <span className="block text-[10px] opacity-70 mt-0.5">Not printed on invoice</span>
            </div>

            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">Sub Total:</span>
              <span className="font-medium">{formatBDT(subtotal)}</span>
            </div>
            <div className="flex justify-between w-64 text-muted-foreground text-xs border-b border-border/50 pb-1.5 mb-0.5">
              <span>Total Cost Price:</span>
              <span className="font-mono">{formatBDT(totalCost)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between w-64 text-red-600">
                <span>Discount:</span>
                <span>− {formatBDT(discountAmt)}</span>
              </div>
            )}
            {totalReceived > 0 && (
              <div className="flex justify-between w-64 text-teal-600">
                <span>Payments Received:</span>
                <span>− {formatBDT(totalReceived)}</span>
              </div>
            )}
            <div className="flex justify-between w-64 border-t border-primary/20 pt-1.5">
              <span className="font-semibold text-foreground">Total Payable:</span>
              <span className="font-bold text-lg text-primary">{formatBDT(totalPayable)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !selectedCompanyId || !selectedProjectId}
              className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 font-medium"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete Invoice"
        message={`Are you sure you want to permanently delete Invoice "${deleteTarget?.invoice_number}"? This action cannot be undone.`}
        confirmLabel="Delete Invoice"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
