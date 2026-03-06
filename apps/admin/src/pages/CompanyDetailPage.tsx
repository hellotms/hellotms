import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, CascadeConfirmModal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { auditApi } from '@/lib/api';
import { formatBDT, formatDate } from '@/lib/utils';
import { ArrowLeft, Building2, FolderOpen, Receipt, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDateFilter } from '@/context/DateFilterContext';
import { DateRangePicker } from '@/components/DateRangePicker';
import type { Company, Project, Invoice } from '@hellotms/shared';

const TABS = ['Projects', 'Financials', 'Invoices'] as const;
type Tab = typeof TABS[number];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Projects');
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const { fromISO, toISO } = useDateFilter();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Company;
    },
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['company-projects', id],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*').eq('company_id', id!).is('deleted_at', null).order('event_start_date', { ascending: false });
      return (data ?? []) as Project[];
    },
    enabled: !!id,
  });

  const { data: financials } = useQuery({
    queryKey: ['company-financials', id, fromISO, toISO],
    queryFn: async () => {
      const { data: ledger } = await supabase
        .from('ledger_entries')
        .select('type, amount, project_id')
        .gte('entry_date', fromISO)
        .lte('entry_date', toISO)
        .is('deleted_at', null)
        .in('project_id', projects.map(p => p.id));

      const income = (ledger ?? []).filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
      const expense = (ledger ?? []).filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);

      const { data: collections } = await supabase
        .from('collections')
        .select('amount')
        .gte('payment_date', fromISO)
        .lte('payment_date', toISO)
        .is('deleted_at', null)
        .in('project_id', projects.map(p => p.id));

      const collected = (collections ?? []).reduce((s, r) => s + Number(r.amount), 0);

      return { income, expense, profit: income - expense, due: income - collected };
    },
    enabled: !!id && projects.length > 0,
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['company-invoices', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', id!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as Invoice[];
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (comp: Company) => {
      // 1. Insert to trash
      const { error: trashError } = await supabase.from('trash_bin').insert({
        entity_type: 'company',
        entity_id: comp.id,
        entity_name: comp.name,
        entity_data: comp,
        deleted_by: profile?.id,
      });
      if (trashError) throw trashError;

      // Soft delete company and cascade
      const now = new Date().toISOString();

      const { data: projs } = await supabase.from('projects').select('id').eq('company_id', comp.id);
      const projIds = projs?.map(p => p.id) || [];

      const { error } = await supabase.from('companies').update({ deleted_at: now }).eq('id', comp.id);
      if (error) throw error;

      if (projIds.length > 0) {
        await Promise.all([
          supabase.from('projects').update({ deleted_at: now }).in('id', projIds),
          supabase.from('invoices').update({ deleted_at: now }).in('project_id', projIds),
          supabase.from('collections').update({ deleted_at: now }).in('project_id', projIds),
          supabase.from('ledger_entries').update({ deleted_at: now }).in('project_id', projIds)
        ]);
      }

      auditApi.log({
        action: 'delete_company',
        entity_type: 'company',
        entity_id: comp.id,
        before: comp
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeleteTarget(null);
      toast('Company deleted successfully!', 'success');
      navigate('/companies');
    },
    onError: (error: any) => {
      toast(`Failed to delete company: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  if (!company) return <div className="py-20 text-center text-muted-foreground">Company not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/companies')} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <PageHeader title={company.name} description={company.address ?? company.email ?? ''} />
        </div>
        <button
          onClick={() => setDeleteTarget(company)}
          className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
          title="Delete Company"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Company Info Card */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-4">
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="h-14 w-14 rounded-xl object-cover bg-white dark:bg-[#1c1c1c] shrink-0 shadow-sm border border-border" />
        ) : (
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          {[
            { label: 'Phone', value: company.phone },
            { label: 'Email', value: company.email },
            { label: 'Address', value: company.address },
            { label: 'Member since', value: formatDate(company.created_at) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'Projects' && (
        <div className="space-y-3">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-blue-600 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.event_start_date)}{p.location ? ` · ${p.location}` : ''}</p>
                </div>
              </div>
              <StatusBadge status={p.status} />
            </div>
          ))}
          {projects.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No projects yet</p>}
        </div>
      )}

      {activeTab === 'Financials' && (
        <div>
          <div className="mb-4"><DateRangePicker /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Revenue', value: financials?.income ?? 0, color: 'text-emerald-600 text-emerald-600 dark:text-emerald-400' },
              { label: 'Expense', value: financials?.expense ?? 0, color: 'text-red-500' },
              { label: 'Profit', value: financials?.profit ?? 0, color: 'text-blue-600 text-blue-600 dark:text-blue-400' },
              { label: 'Due', value: financials?.due ?? 0, color: 'text-orange-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{formatBDT(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Invoices' && (
        <div className="space-y-3">
          {invoices.map(inv => (
            <div
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-purple-600 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(inv.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">{formatBDT(Number(inv.total_amount))}</span>
                <StatusBadge status={inv.status} />
              </div>
            </div>
          ))}
          {invoices.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No invoices yet</p>}
        </div>
      )}

      <CascadeConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Delete Company"
        targetName={deleteTarget?.name ?? ''}
        targetType="company"
        cascadeItems={[
          { icon: '📁', label: 'All projects', description: 'Every project associated with this company' },
          { icon: '🖼️', label: 'All gallery photos', description: 'Project photos stored in cloud storage' },
          { icon: '💰', label: 'All ledger entries & collections', description: 'Income, expense records and payment history' },
          { icon: '🧾', label: 'All invoices', description: 'Invoices and their line items' },
        ]}
        confirmLabel="Delete Company"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
