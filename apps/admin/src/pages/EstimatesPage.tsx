import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { formatBDT, formatDate, formatDateTime } from '@/lib/utils';
import { Plus, Receipt, Trash, Pencil, Trash2, ReceiptText } from 'lucide-react';
import type { Invoice, Company, Project, LedgerEntry } from '@hellotms/shared';
import { generateInvoiceNumber } from '@hellotms/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from '@/components/Toast';
import { auditApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const STATUS_OPTIONS = ['all', 'draft', 'sent', 'paid', 'overdue'];

type LedgerRow = LedgerEntry;

type InvoiceLineItem = {
  description: string;
  costPrice: number; // admin-only, NOT saved to DB or PDF
  quantity: number;
  unit_price: number;
  amount: number;
  ledger_id?: string; // Optional: link to project ledger entry
};

export default function EstimatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
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
  const [estimateNum, setEstimateNum] = useState('');
  const [estimateStatus, setEstimateStatus] = useState('draft');
  const [dueDate, setDueDate] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [otherCompanyName, setOtherCompanyName] = useState('');
  const [otherProjectName, setOtherProjectName] = useState('');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  // Queries
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');
      return (data ?? []) as Company[];
    },
  });

  const { data: allProjects = [] } = useQuery<Project[]>({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title, company_id')
        .is('deleted_at', null)
        .order('title');
      return (data ?? []) as Project[];
    },
  });

  const filteredProjects = selectedCompanyId
    ? allProjects.filter(p => p.company_id === selectedCompanyId)
    : allProjects;

  // Auto-fetch ledger entries when project is selected
  const { data: ledgerEntries = [], isLoading: ledgerLoading } = useQuery<LedgerRow[]>({
    queryKey: ['ledger-for-estimate', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('project_id', selectedProjectId)
        .eq('type', 'expense')
        .eq('is_external', false)
        .is('deleted_at', null)
        .order('entry_date', { ascending: true });
      return (data ?? []) as LedgerRow[];
    },
    enabled: !!selectedProjectId,
  });

  // Fetch project details
  const { data: projectDetails } = useQuery({
    queryKey: ['estimate-project-details', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('advance_received, invoice_amount, payment_status, paid_at, proposal_date, event_start_date')
        .eq('id', selectedProjectId)
        .single();
      return data;
    },
    enabled: !!selectedProjectId,
  });

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setLineItems([]);
  };

  // Sync effect: Populate lineItems
  useEffect(() => {
    if (!selectedProjectId || !isOpen || ledgerLoading) return;
    setLineItems([]);
  }, [selectedProjectId, isOpen, ledgerEntries, ledgerLoading]);

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['estimates', statusFilter],
    queryFn: async () => {
      let q = supabase.from('invoices')
        .select('*, companies(name), projects(title)')
        .eq('type', 'estimate')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lastEstimateNumber } = useQuery<number>({
    queryKey: ['last-estimate-number'],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const prefix = `TMS/${year}/`;
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('type', 'estimate')
        .like('invoice_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastNum = parseInt(data[0].invoice_number.split('/').pop() || '0', 10);
        return isNaN(lastNum) ? 0 : lastNum;
      }
      return 0;
    },
  });

  // Set estimate number when modal opens
  useEffect(() => {
    if (isOpen) {
      setEstimateNum(generateInvoiceNumber((lastEstimateNumber ?? 0) + 1));
    }
  }, [isOpen, lastEstimateNumber]);

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
    setOtherCompanyName('');
    setOtherProjectName('');
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
  const discountAmt = discountType === 'percent'
    ? subtotal * (discountValue / 100)
    : discountValue;

  const estimateTotalPayable = Math.max(0, subtotal - discountAmt);

  const createMutation = useMutation({
    mutationFn: async () => {
      const isOtherCompany = selectedCompanyId === 'others';
      const isOtherProject = selectedProjectId === 'others';

      if (!selectedCompanyId) throw new Error('Please select a Company.');
      if (isOtherCompany && !otherCompanyName) throw new Error('Please enter a Company Name.');
      if (!selectedProjectId) throw new Error('Please select a Project.');
      if (isOtherProject && !otherProjectName) throw new Error('Please enter a Project Name.');
      if (lineItems.every(i => i.amount === 0)) throw new Error('At least one line item must have a price.');

      // Force a unique number
      let currentEstimateNum = estimateNum;
      let isUnique = false;
      let suffix = 1;
      let finalId = null;

      while (!isUnique) {
        const { data: inv, error } = await supabase
          .from('invoices')
          .insert({
            invoice_number: currentEstimateNum,
            company_id: isOtherCompany ? null : selectedCompanyId,
            project_id: isOtherProject ? null : selectedProjectId,
            other_company_name: isOtherCompany ? otherCompanyName : null,
            other_project_name: isOtherProject ? otherProjectName : null,
            type: 'estimate',
            status: estimateStatus,
            due_date: dueDate || null,
            total_amount: subtotal,
            discount_type: discountType,
            discount_value: discountAmt,
            notes: notes || null,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            const year = new Date().getFullYear();
            currentEstimateNum = `TMS/${year}/${String(parseInt(currentEstimateNum.split('/').pop() || '0', 10) + suffix).padStart(3, '0')}`;
            suffix++;
          } else {
            throw error;
          }
        } else {
          isUnique = true;
          finalId = inv.id;
        }
      }

      // Create items
      if (lineItems.length > 0) {
        await supabase.from('invoice_items').insert(lineItems.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          amount: i.amount,
          cost_price: i.costPrice,
          invoice_id: finalId
        })));
      }

      return { id: finalId, number: currentEstimateNum };
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      closeModal();
      toast('Estimate created successfully!', 'success');
      auditApi.log({
        action: 'create_estimate',
        entity_type: 'invoice',
        entity_id: res.id,
        after: {
          estimate_number: estimateNum,
          company_id: selectedCompanyId,
          project_id: selectedProjectId,
          total_amount: subtotal
        }
      });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (estimate: Invoice) => {
      const { error: trashError } = await supabase.from('trash_bin').insert({
        entity_type: 'invoice',
        entity_id: estimate.id,
        entity_name: `Estimate #${estimate.invoice_number}`,
        entity_data: estimate,
        deleted_by: profile?.id,
      });
      if (trashError) throw trashError;

      const { error } = await supabase.from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', estimate.id);
      if (error) throw error;
    },
    onSuccess: (_, estimate) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      setDeleteTarget(null);
      toast('Estimate moved to recycle bin', 'success');
      auditApi.log({
        action: 'delete_estimate',
        entity_type: 'invoice',
        entity_id: estimate.id,
        before: estimate
      });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const columns: ColumnDef<Invoice & { companies: { name: string } | null; projects: { title: string } | null }, unknown>[] = [
    {
      accessorKey: 'invoice_number',
      header: 'Estimate #',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="font-medium">{row.original.invoice_number}</span>
        </div>
      ),
    },
    { 
      accessorKey: 'companies', 
      header: 'Company', 
      cell: ({ row }) => row.original.other_company_name || row.original.companies?.name || '—' 
    },
    { 
      accessorKey: 'projects', 
      header: 'Project', 
      cell: ({ row }) => row.original.other_project_name || row.original.projects?.title || '—' 
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'total_amount', header: 'Amount', cell: ({ getValue }) => <span className="font-semibold">{formatBDT(Number(getValue()))}</span> },
    { accessorKey: 'due_date', header: 'Due Date', cell: ({ getValue }) => getValue() ? formatDate(getValue() as string) : '—' },
    { accessorKey: 'created_at', header: 'Created', cell: ({ getValue }) => formatDateTime(getValue() as string) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              navigate(`/estimates/${row.original.id}`); 
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary z-10"
            title="View / Edit Estimate"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              setDeleteTarget(row.original); 
            }}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-destructive z-10"
            title="Delete Estimate"
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
        title="Estimates"
        description="Create and manage client estimates"
        actions={
          <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> New Estimate
          </button>
        }
      />

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-primary text-white' : 'border border-border text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <DataTable
            data={estimates as (Invoice & { companies: { name: string } | null; projects: { title: string } | null })[]}
            columns={columns}
            searchKey="invoice_number"
            searchPlaceholder="Search estimates..."
            onRowClick={(row) => navigate(`/estimates/${row.id}`)}
          />
        )}
      </div>

      <Modal isOpen={isOpen} onClose={closeModal} title="Create Estimate" size="xl">
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Estimate # <span className="text-red-500">*</span></label>
              <input value={estimateNum} onChange={e => setEstimateNum(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Company <span className="text-red-500">*</span></label>
              <select
                value={selectedCompanyId}
                onChange={e => { setSelectedCompanyId(e.target.value); setSelectedProjectId(''); setLineItems([]); }}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card"
              >
                <option value="">Select company...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="others" className="font-bold text-primary italic">Others...</option>
              </select>
            </div>
            {selectedCompanyId === 'others' && (
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Custom Company Name <span className="text-red-500">*</span></label>
                <input 
                  value={otherCompanyName} 
                  onChange={e => setOtherCompanyName(e.target.value)} 
                  placeholder="Enter company name"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-primary/5 focus:bg-card transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Project <span className="text-red-500">*</span></label>
              <select
                value={selectedProjectId}
                onChange={e => handleProjectChange(e.target.value)}
                disabled={!selectedCompanyId}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card disabled:opacity-50"
              >
                <option value="">Select project...</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                {selectedCompanyId && <option value="others" className="font-bold text-primary italic">Others...</option>}
              </select>
            </div>
            {selectedProjectId === 'others' && (
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Custom Project Name <span className="text-red-500">*</span></label>
                <input 
                  value={otherProjectName} 
                  onChange={e => setOtherProjectName(e.target.value)} 
                  placeholder="Enter project name"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-primary/5 focus:bg-card transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Status</label>
              <select value={estimateStatus} onChange={e => setEstimateStatus(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Expiry Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-sm flex items-center gap-1.5">
                <ReceiptText className="h-4 w-4 text-primary" /> Line Items
              </h4>
              <button type="button" onClick={addBlankItem} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add line
              </button>
            </div>

            <div className="border border-border rounded-xl">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold w-8">SL</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Description <span className="text-red-500">*</span></th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold w-24">Cost (admin)</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold w-24">Qty <span className="text-red-500">*</span></th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold w-28">Sell Price (৳) <span className="text-red-500">*</span></th>
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
                          className="w-full border border-border rounded px-2 py-1 text-xs bg-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.costPrice || ''}
                          onChange={e => updateItem(i, 'costPrice', Number(e.target.value))}
                          placeholder="0"
                          className="w-full border border-border rounded px-2 py-1 text-xs bg-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                          min={1}
                          className="w-full border border-border rounded px-2 py-1 text-xs bg-transparent text-center"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={item.unit_price || ''}
                          onChange={e => updateItem(i, 'unit_price', Number(e.target.value))}
                          placeholder="0"
                          className="w-full border border-border rounded px-2 py-1 text-xs bg-transparent text-right"
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
                </tbody>
              </table>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/40 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium">Discount</h4>
              <div className="flex gap-3 items-center">
                <div className="flex gap-2">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" checked={discountType === 'flat'} onChange={() => setDiscountType('flat')} />
                    <span>৳ Flat</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input type="radio" checked={discountType === 'percent'} onChange={() => setDiscountType('percent')} />
                    <span>% Percent</span>
                  </label>
                </div>
                <input
                  type="number"
                  value={discountValue || ''}
                  onChange={e => setDiscountValue(Number(e.target.value))}
                  placeholder="0"
                  className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-muted-foreground">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Notes for this estimate..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col items-end gap-1.5 text-sm">
            <div className="flex justify-between w-64">
              <span className="text-muted-foreground">Sub Total:</span>
              <span className="font-medium">{formatBDT(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between w-64 text-red-600 dark:text-red-400">
                <span>Discount:</span>
                <span>− {formatBDT(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between w-64 border-t border-primary/20 pt-1.5">
              <span className="font-semibold text-foreground">Total Estimate:</span>
              <span className="font-bold text-lg text-primary">
                {formatBDT(estimateTotalPayable)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={closeModal} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">Cancel</button>
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Create Estimate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Estimate">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to move this estimate to the recycle bin?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
