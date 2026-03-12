import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, CascadeConfirmModal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { auditApi } from '@/lib/api';
import { formatBDT, formatDate } from '@/lib/utils';
import { useDateFilter } from '@/context/DateFilterContext';
import { DateRangePicker } from '@/components/DateRangePicker';
import { ProjectForm } from '@/components/ProjectForm';
import { CompanyForm } from '@/components/CompanyForm';
import { ArrowLeft, Plus, Pencil, Building2, FolderOpen, Receipt, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { slugify } from '@/lib/utils';
import { mediaApi } from '@/lib/api';
import type { Company, Project, Invoice, ProjectInput, CompanyInput } from '@hellotms/shared';

const TABS = ['Projects', 'Financials', 'Invoices'] as const;
type Tab = typeof TABS[number];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Projects');
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { fromISO, toISO } = useDateFilter();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id!)
        .is('deleted_at', null)
        .single();
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
    queryKey: ['company-financials', id],
    queryFn: async () => {
      // 1. Get all projects for this company to calculate totals
      const pIds = projects.map(p => p.id);
      if (pIds.length === 0) return null;

      // 2. Fetch all necessary data for these projects
      const [ledgerRes, collectionsRes] = await Promise.all([
        supabase
          .from('ledger_entries')
          .select('project_id, type, amount, is_external, paid_status, paid_amount, due_amount')
          .in('project_id', pIds)
          .is('deleted_at', null),
        supabase
          .from('collections')
          .select('project_id, amount, payment_date')
          .in('project_id', pIds)
          .is('deleted_at', null)
      ]);

      const ledger = ledgerRes.data ?? [];
      const collections = collectionsRes.data ?? [];

      // Metrics calculation
      const totalInvoiceAmount = projects.reduce((s, p) => s + Number(p.invoice_amount || 0), 0);
      const totalAdvance = projects.reduce((s, p) => s + Number(p.advance_received || 0), 0);
      const totalCollected = collections.reduce((s, r) => s + Number(r.amount), 0);
      const totalReceived = totalCollected + totalAdvance;

      const totalStandardExpenses = ledger
        .filter(r => r.type === 'expense' && !r.is_external)
        .reduce((s, r) => s + Number(r.amount), 0);

      const othersExpenses = ledger
        .filter(r => r.type === 'expense' && r.is_external)
        .reduce((s, r) => s + Number(r.amount), 0);

      const dueVendor = ledger
        .filter(r => r.type === 'expense' && r.paid_status === 'unpaid')
        .reduce((s, r) => s + Number(r.amount), 0);
      
      const vCashAdv = ledger
        .filter(r => r.type === 'expense' && !r.is_external)
        .reduce((s, r) => s + Number((r as any).paid_amount ?? (r.paid_status === 'paid' ? r.amount : 0)), 0);
      
      const vCashDue = ledger
        .filter(r => r.type === 'expense' && !r.is_external)
        .reduce((s, r) => s + Number((r as any).due_amount ?? (r.paid_status === 'paid' ? 0 : r.amount)), 0);

      const netExpenses = totalStandardExpenses + othersExpenses;
      const quotedAmount = totalInvoiceAmount;
      const netProfit = quotedAmount - netExpenses;

      // Turnover Avg: Calculate individual project turnovers first (mirror logic from ProjectDetailPage)
      let turnoverDaysSum = 0;
      let turnoverCount = 0;

      projects.forEach(p => {
        const pQuoted = Number(p.invoice_amount || 0);
        const pAdvance = Number(p.advance_received || 0);
        const pCollections = collections.filter(c => c.project_id === p.id);
        const pCollected = pCollections.reduce((s, c) => s + Number(c.amount), 0);
        const pTotalReceived = pAdvance + pCollected;
        
        const isPaid = p.payment_status === 'paid' || (pQuoted > 0 && pTotalReceived >= pQuoted);
        const startDateStr = p.proposal_date || p.event_start_date;

        if (startDateStr) {
          const start = new Date(startDateStr);
          let end = new Date();
          if (isPaid && p.paid_at) {
            end = new Date(p.paid_at);
          } else if (isPaid && pCollections.length > 0) {
            end = new Date(Math.max(...pCollections.map(c => new Date(c.payment_date).getTime())));
          }
          const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          turnoverDaysSum += days;
          turnoverCount++;
        }
      });

      const avgTurnOverDays = turnoverCount > 0 ? turnoverDaysSum / turnoverCount : 0;
      const profitRatio = quotedAmount > 0 ? (netProfit / quotedAmount) * 100 : 0;

      return {
        quotedAmount,
        totalReceived,
        totalStandardExpenses,
        vCashAdv,
        vCashDue,
        dueClient: quotedAmount - totalReceived,
        othersExpenses,
        dueVendor,
        netExpenses,
        netProfit,
        profitRatio,
        avgTurnOverDays
      };
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

  const createProjectMutation = useMutation({
    mutationFn: async (values: ProjectInput) => {
      const finalCoverUrl = await mediaApi.uploadAndCleanMedia(
        values.cover_image_url as string | File | null,
        null,
        'projects',
        'cover',
        values.title
      );

      const payload = {
        ...values,
        event_end_date: values.event_end_date || values.event_start_date,
        proposal_date: values.proposal_date || null,
        invoice_amount: values.invoice_amount ? Number(values.invoice_amount) : null,
        advance_received: values.advance_received ? Number(values.advance_received) : 0,
        description: values.description || null,
        cover_image_url: finalCoverUrl || null,
        notes: values.notes || null,
        location: values.location || null,
        company_id: id!
      };
      const { data, error } = await supabase.from('projects').insert(payload).select().single();
      if (error) throw error;
      auditApi.log({ action: 'create_project', entity_type: 'project', entity_id: data.id, after: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-projects', id] });
      queryClient.invalidateQueries({ queryKey: ['company-financials', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
      setIsProjectModalOpen(false);
      toast('Project created successfully!', 'success');
    },
    onError: (error: any) => toast(`Failed to create project: ${error.message}`, 'error')
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ values, logoUrl }: { values: CompanyInput, logoUrl: string }) => {
      const finalLogoUrl = await mediaApi.uploadAndCleanMedia(
        logoUrl,
        company?.logo_url,
        'companies',
        'logo',
        values.name
      );
      const payload = { ...values, slug: values.slug || slugify(values.name), logo_url: finalLogoUrl || undefined };
      const { error } = await supabase.from('companies').update(payload).eq('id', id!);
      if (error) throw error;
      auditApi.log({ action: 'update_company', entity_type: 'company', entity_id: id!, after: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      setIsEditModalOpen(false);
      toast('Company updated successfully!', 'success');
    },
    onError: (error: any) => toast(`Failed to update company: ${error.message}`, 'error')
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
        <div className="flex-1 flex items-center gap-4">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-12 w-12 rounded-xl object-cover bg-white dark:bg-[#1c1c1c] shadow-sm border border-border" />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <PageHeader title={company.name} description={company.address ?? company.email ?? ''} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Project</span>
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="p-2 border border-border rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Edit Company"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(company)}
            className="p-2 border border-border rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
            title="Delete Company"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Company Info Bar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Phone', value: company.phone },
            { label: 'Email', value: company.email },
            { label: 'Member since', value: formatDate(company.created_at) },
          ].map(({ label, value }) => (
            <div key={label} className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5 truncate" title={value ?? ''}>{value ?? '—'}</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[
            { label: 'Quoted Amount', value: financials?.quotedAmount ?? 0, isCurrency: true },
            { label: 'Client Collection', value: financials?.totalReceived ?? 0, isCurrency: true, color: 'text-emerald-500' },
            { label: 'Client Due', value: financials?.dueClient ?? 0, isCurrency: true, color: 'text-blue-500' },
            { label: 'Expenses', value: financials?.totalStandardExpenses ?? 0, isCurrency: true, color: 'text-red-500' },
            { label: 'V-Cash Adv.', value: financials?.vCashAdv ?? 0, isCurrency: true, color: 'text-orange-500' },
            { label: 'V-Cash Due', value: financials?.vCashDue ?? 0, isCurrency: true, color: 'text-amber-500' },
            { label: 'Other expense', value: financials?.othersExpenses ?? 0, isCurrency: true, color: 'text-red-500/70' },
            { label: 'Net Expenses', value: financials?.netExpenses ?? 0, isCurrency: true, color: 'text-red-600' },
            { label: 'Net Profit', value: financials?.netProfit ?? 0, isCurrency: true, color: financials && financials.netProfit >= 0 ? 'text-blue-600' : 'text-red-600' },
            { label: 'Profit Ratio', value: `${financials?.profitRatio.toFixed(1)}%`, isCurrency: false, color: 'text-purple-500' },
            { label: 'Turn Over Days', value: `${Math.round(financials?.avgTurnOverDays ?? 0)} days`, isCurrency: false, color: 'text-muted-foreground' },
          ].map(({ label, value, isCurrency, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/20 transition-all">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className={`text-xl font-black mt-2 ${color ?? 'text-foreground'}`}>
                {isCurrency ? formatBDT(value as number) : value}
              </p>
            </div>
          ))}
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

      {/* Modals */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="New Project" size="lg">
        <ProjectForm
          companies={[company]}
          isPending={createProjectMutation.isPending}
          onSubmit={(v) => createProjectMutation.mutate(v)}
          onCancel={() => setIsProjectModalOpen(false)}
          defaultValues={{ company_id: company.id }}
        />
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Company">
        <CompanyForm
          isPending={updateCompanyMutation.isPending}
          onSubmit={(values, logoUrl) => updateCompanyMutation.mutate({ values, logoUrl })}
          onCancel={() => setIsEditModalOpen(false)}
          defaultValues={company}
        />
      </Modal>
    </div>
  );
}
