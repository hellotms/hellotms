import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/StatCard';
import { DateRangePicker } from '@/components/DateRangePicker';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useDateFilter } from '@/context/DateFilterContext';
import { formatBDT, formatDate, getInitials } from '@/lib/utils';
import {
  DollarSign, TrendingDown, TrendingUp, AlertCircle,
  FolderOpen, CheckCircle2, Users, MessageSquare
} from 'lucide-react';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { fromISO, toISO } = useDateFilter();
  const navigate = useNavigate();

  // KPIs from ledger entries in date range
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis', fromISO, toISO],
    queryFn: async () => {
      const [incomeRes, expenseRes, projectsRes, collectionsRes, leadsRes, dueInvoicesRes] = await Promise.all([
        supabase
          .from('ledger_entries')
          .select('amount')
          .eq('type', 'income')
          .gte('entry_date', fromISO)
          .lte('entry_date', toISO)
          .is('deleted_at', null),
        supabase
          .from('ledger_entries')
          .select('amount')
          .eq('type', 'expense')
          .gte('entry_date', fromISO)
          .lte('entry_date', toISO)
          .is('deleted_at', null),
        supabase
          .from('projects')
          .select('id, status')
          .gte('event_start_date', fromISO)
          .lte('event_start_date', toISO),
        supabase
          .from('collections')
          .select('amount')
          .gte('payment_date', fromISO)
          .lte('payment_date', toISO),
        supabase
          .from('leads')
          .select('id, status')
          .gte('created_at', fromISO)
          .lte('created_at', toISO),
        // Due = sum of sent/overdue invoices total - total collected
        supabase
          .from('invoices')
          .select('total_amount, project_id')
          .in('status', ['sent', 'overdue']),
      ]);

      const totalRevenue = (incomeRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const totalExpense = (expenseRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const totalCollected = (collectionsRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const totalInvoicedDue = (dueInvoicesRes.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
      const activeProjects = (projectsRes.data ?? []).filter(p => p.status === 'active').length;
      const completedProjects = (projectsRes.data ?? []).filter(p => p.status === 'completed').length;

      return {
        totalRevenue,
        totalExpense,
        netProfit: totalRevenue - totalExpense,
        // Due = total outstanding invoices (sent/overdue) - what's already been paid
        totalDue: Math.max(0, totalInvoicedDue - totalCollected),
        activeProjects,
        completedProjects,
        leadsCount: leadsRes.data?.length ?? 0,
      };
    },
  });

  // Revenue vs Expense trend (by month)
  const { data: trendData } = useQuery({
    queryKey: ['dashboard-trend', fromISO, toISO],
    queryFn: async () => {
      const { data } = await supabase
        .from('ledger_entries')
        .select('type, amount, entry_date')
        .gte('entry_date', fromISO)
        .lte('entry_date', toISO)
        .is('deleted_at', null)
        .order('entry_date');

      if (!data) return [];

      const map: Record<string, { date: string; revenue: number; expense: number; profit: number }> = {};
      data.forEach((row) => {
        const month = row.entry_date.slice(0, 7); // YYYY-MM
        if (!map[month]) map[month] = { date: month, revenue: 0, expense: 0, profit: 0 };
        if (row.type === 'income') map[month].revenue += Number(row.amount);
        else map[month].expense += Number(row.amount);
      });

      return Object.values(map).map(m => ({ ...m, profit: m.revenue - m.expense }));
    },
  });

  // Active projects
  const { data: activeProjectsList } = useQuery({
    queryKey: ['dashboard-active-projects', fromISO, toISO],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title, status, event_start_date, companies(name)')
        .eq('status', 'active')
        .order('event_start_date', { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  // Due invoices
  const { data: dueInvoices } = useQuery({
    queryKey: ['dashboard-due-invoices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, due_date, status, companies(name)')
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(6);
      return data ?? [];
    },
  });

  // Project status breakdown
  const { data: projectStatusData } = useQuery({
    queryKey: ['dashboard-project-status', fromISO, toISO],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('status')
        .gte('event_start_date', fromISO)
        .lte('event_start_date', toISO);
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((p) => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  // Recent audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ['dashboard-audit-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, created_at, profiles(name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(6);
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  // Per-Project P&L
  const { data: projectPnL } = useQuery({
    queryKey: ['dashboard-project-pnl', fromISO, toISO],
    queryFn: async () => {
      // 1. Get projects in range
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, status, companies(name)')
        .gte('event_start_date', fromISO)
        .lte('event_start_date', toISO);

      if (!projects || projects.length === 0) return [];

      const pIds = projects.map(p => p.id);

      // 2. Get Income and Expense for these projects
      const { data: ledger } = await supabase
        .from('ledger_entries')
        .select('project_id, type, amount')
        .in('project_id', pIds)
        .is('deleted_at', null);

      const pnlMap: Record<string, { income: number; expense: number }> = {};
      pIds.forEach(id => pnlMap[id] = { income: 0, expense: 0 });

      ledger?.forEach(row => {
        if (row.project_id && pnlMap[row.project_id]) {
          if (row.type === 'income') pnlMap[row.project_id].income += Number(row.amount);
          else pnlMap[row.project_id].expense += Number(row.amount);
        }
      });

      return projects.map(p => {
        const stats = pnlMap[p.id];
        const profit = stats.income - stats.expense;
        const margin = stats.income > 0 ? (profit / stats.income) * 100 : 0;
        return {
          id: p.id,
          title: p.title,
          company: (p.companies as unknown as { name: string } | null)?.name ?? '—',
          status: p.status,
          income: stats.income,
          expense: stats.expense,
          profit,
          margin
        };
      }).sort((a, b) => b.profit - a.profit); // Sort highest profit first
    }
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your business performance"
        actions={<DateRangePicker />}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={kpis?.totalRevenue ?? 0} isCurrency icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
        <StatCard title="Total Expense" value={kpis?.totalExpense ?? 0} isCurrency icon={TrendingDown} iconColor="text-red-600" iconBg="bg-red-50" />
        <StatCard title="Net Profit" value={kpis?.netProfit ?? 0} isCurrency icon={TrendingUp} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Total Due" value={kpis?.totalDue ?? 0} isCurrency icon={AlertCircle} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <StatCard title="Active Projects" value={kpis?.activeProjects ?? 0} icon={FolderOpen} iconColor="text-blue-600" iconBg="bg-blue-50" onClick={() => navigate('/projects?status=active')} />
        <StatCard title="Completed" value={kpis?.completedProjects ?? 0} icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" onClick={() => navigate('/projects?status=completed')} />
        <StatCard title="Contact Forms" value={kpis?.leadsCount ?? 0} icon={MessageSquare} iconColor="text-purple-600" iconBg="bg-purple-50" onClick={() => navigate('/leads')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue vs Expense Line Chart */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Revenue vs Expense Trend</h3>
          {trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatBDT(v)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} name="Expense" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={false} name="Profit" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              No data for selected period
            </div>
          )}
        </div>

        {/* Project Status Pie */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Project Status</h3>
          {projectStatusData && projectStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={projectStatusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {projectStatusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {projectStatusData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="capitalize text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Per-Project P&L Table */}
      <div className="bg-card border border-border rounded-xl p-6 overflow-hidden">
        <h3 className="text-base font-semibold text-foreground mb-4">Project Profit & Loss</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-muted/50 border-y border-border">
                <th className="px-4 py-3 font-semibold text-foreground">Project Name</th>
                <th className="px-4 py-3 font-semibold text-foreground">Company</th>
                <th className="px-4 py-3 font-semibold text-foreground">Status</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Income (Ledger)</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Expense (Ledger)</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Net Profit</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projectPnL?.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.company}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-mono">{formatBDT(p.income)}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-mono">{formatBDT(p.expense)}</td>
                  <td className={`px-4 py-3 text-right font-bold font-mono ${p.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {p.profit > 0 ? '+' : ''}{formatBDT(p.profit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {p.margin.toFixed(1)}%
                  </td>
                </tr>
              ))}
              {!projectPnL?.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No projects found in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Active projects */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Active Projects</h3>
            <button onClick={() => navigate('/projects?status=active')} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {activeProjectsList?.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{(p.companies as unknown as { name: string } | null)?.name ?? '—'} · {formatDate(p.event_start_date)}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
            {!activeProjectsList?.length && (
              <p className="text-sm text-muted-foreground text-center py-6">No active projects</p>
            )}
          </div>
        </div>

        {/* Due invoices */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Due Invoices</h3>
            <button onClick={() => navigate('/invoices')} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {dueInvoices?.map((inv) => (
              <div
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {(inv.companies as unknown as { name: string } | null)?.name ?? '—'}
                    {inv.due_date ? ` · Due ${formatDate(inv.due_date)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-foreground">{formatBDT(Number(inv.total_amount))}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
            {!dueInvoices?.length && (
              <p className="text-sm text-muted-foreground text-center py-6">No due invoices</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {auditLogs?.map((log) => {
            const p = log.profiles as unknown as { name: string; avatar_url?: string | null } | null;
            return (
              <div key={log.id} className="flex items-center gap-3 text-sm">
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                    {getInitials(p?.name ?? 'S')}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-foreground font-medium capitalize truncate">{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground capitalize truncate">{log.entity_type}</span>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">{formatDate(log.created_at)}</span>
              </div>
            );
          })}
          {!auditLogs?.length && (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
