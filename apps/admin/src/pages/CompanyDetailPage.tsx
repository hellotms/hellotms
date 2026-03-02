import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { formatBDT, formatDate } from '@/lib/utils';
import { ArrowLeft, Building2, FolderOpen, Receipt } from 'lucide-react';
import { useState } from 'react';
import { useDateFilter } from '@/context/DateFilterContext';
import { DateRangePicker } from '@/components/DateRangePicker';
import type { Company, Project, Invoice } from '@hellotms/shared';

const TABS = ['Projects', 'Financials', 'Invoices'] as const;
type Tab = typeof TABS[number];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('Projects');
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
      const { data } = await supabase.from('projects').select('*').eq('company_id', id!).order('event_start_date', { ascending: false });
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
        .order('created_at', { ascending: false });
      return (data ?? []) as Invoice[];
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  if (!company) return <div className="py-20 text-center text-muted-foreground">Company not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/companies')} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <PageHeader title={company.name} description={company.address ?? company.email ?? ''} />
      </div>

      {/* Company Info Card */}
      <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-4">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-7 w-7 text-primary" />
        </div>
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
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
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
                <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
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
              { label: 'Revenue', value: financials?.income ?? 0, color: 'text-emerald-600' },
              { label: 'Expense', value: financials?.expense ?? 0, color: 'text-red-500' },
              { label: 'Profit', value: financials?.profit ?? 0, color: 'text-blue-600' },
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
                <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-purple-600" />
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
    </div>
  );
}
