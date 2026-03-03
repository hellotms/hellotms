import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { formatBDT, formatDate, slugify } from '@/lib/utils';
import { Plus, Receipt } from 'lucide-react';
import { invoiceSchema } from '@hellotms/shared';
import type { Invoice, Company, Project, InvoiceInput } from '@hellotms/shared';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { generateInvoiceNumber } from '@hellotms/shared';
import { Trash, Pencil } from 'lucide-react';
import { toast } from '@/components/Toast';

const STATUS_OPTIONS = ['all', 'draft', 'sent', 'paid', 'overdue'];

export default function InvoicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(searchParams.get('new') === '1');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return (data ?? []) as Company[];
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, title, company_id').order('title');
      return (data ?? []) as Project[];
    },
  });

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

  // Count for next invoice number
  const { data: invoiceCount } = useQuery<number>({
    queryKey: ['invoice-count'],
    queryFn: async () => {
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const form = useForm<InvoiceInput & { items: { description: string; quantity: number; unit_price: number; amount: number }[] }>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      type: 'invoice',
      status: 'draft',
      total_amount: 0,
      invoice_number: generateInvoiceNumber((invoiceCount ?? 0) + 1),
      items: [{ description: '', quantity: 1, unit_price: 0, amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const watchItems = form.watch('items');
  const computedTotal = watchItems.reduce((s, item) => s + (Number(item.quantity) * Number(item.unit_price)), 0);

  const createMutation = useMutation({
    mutationFn: async (values: InvoiceInput) => {
      const items = values.items.map(item => ({
        ...item,
        amount: item.quantity * item.unit_price,
      }));
      const total = items.reduce((s, i) => s + i.amount, 0);

      const { data: inv, error } = await supabase
        .from('invoices')
        .insert({ ...values, total_amount: total, items: undefined })
        .select()
        .single();
      if (error) throw error;

      // Insert items
      await supabase.from('invoice_items').insert(items.map(i => ({ ...i, invoice_id: inv.id })));

      return inv;
    },
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-count'] });
      setIsOpen(false);
      navigate(`/invoices/${inv.id}`);
    },
    onError: (error: any) => {
      toast(`Failed to create invoice: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast('Invoice deleted successfully!', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to delete invoice: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const handleDelete = (inv: Invoice) => {
    if (window.confirm(`Are you sure you want to permanently delete Invoice ${inv.invoice_number}?\nThis cannot be undone.`)) {
      deleteMutation.mutate(inv.id);
    }
  };

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
            title="Edit / View Invoice"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }}
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

      {/* Create Invoice Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Invoice" size="xl">
        <form onSubmit={form.handleSubmit((v) => createMutation.mutate({ ...v, total_amount: computedTotal }))} className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Invoice Number *</label>
              <input {...form.register('invoice_number')} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company *</label>
              <select {...form.register('company_id')} className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">Select...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project *</label>
              <select {...form.register('project_id')} className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">Select...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select {...form.register('type')} className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                <option value="invoice">Invoice</option>
                <option value="estimate">Estimate</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select {...form.register('status')} className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input type="date" {...form.register('due_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-sm">Line Items</h4>
              <button type="button" onClick={() => append({ description: '', quantity: 1, unit_price: 0, amount: 0 })} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add line
              </button>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {['Description', 'Qty', 'Unit Price (৳)', 'Amount (৳)', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, i) => (
                    <tr key={field.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <input {...form.register(`items.${i}.description`)} placeholder="Service description" className="w-full border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
                      </td>
                      <td className="px-3 py-2 w-16">
                        <input type="number" {...form.register(`items.${i}.quantity`, { valueAsNumber: true })} className="w-full border border-border rounded px-2 py-1 text-xs" />
                      </td>
                      <td className="px-3 py-2 w-28">
                        <input type="number" {...form.register(`items.${i}.unit_price`, { valueAsNumber: true })} className="w-full border border-border rounded px-2 py-1 text-xs" />
                      </td>
                      <td className="px-3 py-2 w-24">
                        <span className="text-xs font-medium">
                          {formatBDT((watchItems[i]?.quantity ?? 0) * (watchItems[i]?.unit_price ?? 0))}
                        </span>
                      </td>
                      <td className="px-3 py-2 w-8">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(i)} className="text-destructive hover:text-destructive/80">
                            <Trash2icon />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-3">
              <div className="bg-muted/50 rounded-lg px-4 py-2 text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold text-lg text-foreground">{formatBDT(computedTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Inline trash icon to avoid import issues
function Trash2icon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}
