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
import { formatBDT, formatDate, formatDateTime, getInitials } from '@/lib/utils';
import {
  DollarSign, TrendingDown, TrendingUp, AlertCircle,
  FolderOpen, CheckCircle2, Users, MessageSquare
} from 'lucide-react';
import { formatAuditLogMessage } from '@/components/AuditLogFormatter';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { fromISO, toISO } = useDateFilter();
  const navigate = useNavigate();

  // KPIs from ledger entries in date range
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis', fromISO, toISO],
    queryFn: async () => {
      // For created_at (timestamp), we need to ensure the end date covers the whole day in BD Time (GMT+6)
      const endTimestamp = toISO && !toISO.includes('T') ? `${toISO}T23:59:59.999+06:00` : toISO;
      const startTimestamp = fromISO && !fromISO.includes('T') ? `${fromISO}T00:00:00.000+06:00` : fromISO;

      const [expenseRes, activeProjectsRes, allProjectsRes, collectionsRes, leadsRes] = await Promise.all([
        supabase
          .from('ledger_entries')
          .select('amount, paid_amount, due_amount, is_external, paid_status')
          .eq('type', 'expense')
          .gte('entry_date', fromISO)
          .lte('entry_date', toISO)
          .is('deleted_at', null),
        supabase
          .from('projects')
          .select('id, status, invoice_amount, advance_received')
          .eq('status', 'active')
          .is('deleted_at', null),
        supabase
          .from('projects')
          .select('id, status, invoice_amount, advance_received, created_at')
          .gte('created_at', startTimestamp)
          .lte('created_at', endTimestamp)
          .is('deleted_at', null),
        supabase
          .from('collections')
          .select('amount')
          .gte('payment_date', fromISO)
          .lte('payment_date', toISO)
          .is('deleted_at', null),
        supabase
          .from('leads')
          .select('id, status')
          .gte('created_at', startTimestamp)
          .lte('created_at', endTimestamp),
      ]);

      const totalInvoiced = (allProjectsRes.data ?? []).reduce((s, p) => s + Number(p.invoice_amount || 0), 0);
      const totalAdvance = (allProjectsRes.data ?? []).reduce((s, p) => s + Number(p.advance_received || 0), 0);
      const totalCollections = (collectionsRes.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      
      const collectionReceived = totalAdvance + totalCollections;
      const collectionDue = Math.max(0, totalInvoiced - collectionReceived);

      const standardExpenses = (expenseRes.data ?? []).filter(e => !e.is_external).reduce((s, r) => s + Number(r.amount), 0);
      const otherExpenses = (expenseRes.data ?? []).filter(e => e.is_external).reduce((s, r) => s + Number(r.amount), 0);
      const netExpenses = standardExpenses + otherExpenses;
      const netProfit = totalInvoiced - netExpenses;
      const profitRatio = totalInvoiced > 0 ? (netProfit / totalInvoiced) * 100 : 0;

      // Vendor Due = Sum of all due_amount from ledger entries (V-Cash Due)
      const vendorDue = (expenseRes.data ?? []).reduce((s, r) => s + Number(r.due_amount || 0), 0);

      const activeProjects = activeProjectsRes.data?.length ?? 0;
      const completedProjects = (allProjectsRes.data ?? []).filter(p => p.status === 'completed').length;
      const leadsCount = leadsRes.data?.length ?? 0;

      return {
        totalInvoiced,
        collectionReceived,
        collectionDue,
        netExpenses,
        netProfit,
        vendorDue,
        profitRatio,
        activeProjects,
        completedProjects,
        leadsCount,
      };
    },
  });

  // Revenue vs Expense trend (smart: daily for <=30 days, monthly for longer)
  const rangeDays = Math.ceil((new Date(toISO).getTime() - new Date(fromISO).getTime()) / (1000 * 60 * 60 * 24));
  const useDaily = rangeDays <= 31;

  const { data: trendData } = useQuery({
    queryKey: ['dashboard-trend', fromISO, toISO],
    queryFn: async () => {
      // Get Expenses from ledger
      const { data: ledger } = await supabase
        .from('ledger_entries')
        .select('type, amount, entry_date')
        .eq('type', 'expense')
        .gte('entry_date', fromISO)
        .lte('entry_date', toISO)
        .is('deleted_at', null)
        .order('entry_date');

      // Get Advances from projects
      const endTimestamp = toISO && !toISO.includes('T') ? `${toISO}T23:59:59.999+06:00` : toISO;
      const startTimestamp = fromISO && !fromISO.includes('T') ? `${fromISO}T00:00:00.000+06:00` : fromISO;
      const { data: advances } = await supabase
        .from('projects')
        .select('advance_received, invoice_amount, created_at')
        .gte('created_at', startTimestamp)
        .lte('created_at', endTimestamp)
        .is('deleted_at', null)
        .order('created_at');

      const map: Record<string, { date: string; invoiced: number; expense: number; profit: number }> = {};

      // Pre-fill all intervals with zeros
      const start = new Date(fromISO);
      const end = new Date(toISO);

      if (useDaily) {
        // Daily: fill each day
        let d = new Date(start);
        while (d <= end) {
          const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
          map[key] = { date: key, invoiced: 0, expense: 0, profit: 0 };
          d.setDate(d.getDate() + 1);
        }
      } else {
        // Monthly: fill each month
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        while (current <= end) {
          const key = current.toISOString().slice(0, 7); // YYYY-MM
          map[key] = { date: key, invoiced: 0, expense: 0, profit: 0 };
          current.setMonth(current.getMonth() + 1);
        }
      }

      ledger?.forEach((row) => {
        const key = useDaily ? row.entry_date.slice(0, 10) : row.entry_date.slice(0, 7);
        if (map[key]) map[key].expense += Number(row.amount);
      });

      advances?.forEach((row) => {
        // Parse UTC timestamp to Local Date String to ensure correct day grouping
        const d = new Date(row.created_at);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const localDateStr = `${yyyy}-${mm}-${dd}`;
        
        const key = useDaily ? localDateStr : localDateStr.slice(0, 7);
        if (map[key]) map[key].invoiced += Number(row.invoice_amount || 0);
      });

      return Object.values(map)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(m => ({ ...m, profit: m.invoiced - m.expense }));
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
        .is('deleted_at', null)
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
        .is('deleted_at', null)
        .order('due_date', { ascending: true })
        .limit(6);
      return data ?? [];
    },
  });

  // Project status breakdown
  const { data: projectStatusData } = useQuery({
    queryKey: ['dashboard-project-status', fromISO, toISO],
    queryFn: async () => {
      const endTimestamp = toISO && !toISO.includes('T') ? `${toISO}T23:59:59.999+06:00` : toISO;
      const startTimestamp = fromISO && !fromISO.includes('T') ? `${fromISO}T00:00:00.000+06:00` : fromISO;
      
      const { data } = await supabase
        .from('projects')
        .select('status')
        .gte('created_at', startTimestamp)
        .lte('created_at', endTimestamp)
        .is('deleted_at', null);
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
        .select('id, action, entity_type, created_at, before, after, profiles(name, avatar_url)')
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
      const endTimestamp = toISO && !toISO.includes('T') ? `${toISO}T23:59:59.999+06:00` : toISO;
      const startTimestamp = fromISO && !fromISO.includes('T') ? `${fromISO}T00:00:00.000+06:00` : fromISO;
      // 1. Get projects with any financial activity in range OR created in range
      const [entryIds, collIds] = await Promise.all([
        supabase.from('ledger_entries').select('project_id').gte('entry_date', fromISO).lte('entry_date', toISO).is('deleted_at', null),
        supabase.from('collections').select('project_id').gte('payment_date', fromISO).lte('payment_date', toISO).is('deleted_at', null)
      ]);

      const activityProjectIds = Array.from(new Set([
        ...(entryIds.data?.map(e => e.project_id).filter(Boolean) || []),
        ...(collIds.data?.map(c => c.project_id).filter(Boolean) || [])
      ])) as string[];

      // Filter to only include projects that are either (created in range) OR (have activity in range)
      let query = supabase
        .from('projects')
        .select('id, title, status, payment_status, advance_received, invoice_amount, event_start_date, created_at, companies(name)')
        .is('deleted_at', null);

      if (activityProjectIds.length > 0) {
        // Use and() inside or() to correctly group the date range condition
        query = query.or(`and(created_at.gte.${startTimestamp},created_at.lte.${endTimestamp}),id.in.(${activityProjectIds.join(',')})`);
      } else {
        query = query.gte('created_at', startTimestamp).lte('created_at', endTimestamp);
      }

      const { data: projects } = await query;

      if (!projects || projects.length === 0) return [];

      const pIds = projects.map(p => p.id);

      // 2. Get Income from collections and Expense from ledger 
      const [ledgerRes, collectionsRes] = await Promise.all([
        supabase
          .from('ledger_entries')
          .select('project_id, amount, paid_amount, due_amount, is_external')
          .eq('type', 'expense')
          .in('project_id', pIds)
          .is('deleted_at', null),
        supabase
          .from('collections')
          .select('project_id, amount')
          .in('project_id', pIds)
          .is('deleted_at', null)
      ]);

      const pnlMap: Record<string, { income: number; standardExpense: number; vCashAdv: number; vCashDue: number; othersExpense: number }> = {};
      pIds.forEach(id => pnlMap[id] = { income: 0, standardExpense: 0, vCashAdv: 0, vCashDue: 0, othersExpense: 0 });

      ledgerRes.data?.forEach(row => {
        if (row.project_id && pnlMap[row.project_id]) {
          if (row.is_external) {
            pnlMap[row.project_id].othersExpense += Number(row.amount);
          } else {
            pnlMap[row.project_id].standardExpense += Number(row.amount);
            pnlMap[row.project_id].vCashAdv += Number(row.paid_amount || 0);
            pnlMap[row.project_id].vCashDue += Number(row.due_amount || 0);
          }
        }
      });

      collectionsRes.data?.forEach(row => {
        if (row.project_id && pnlMap[row.project_id]) {
          pnlMap[row.project_id].income += Number(row.amount);
        }
      });

      return projects.map(p => {
        const stats = pnlMap[p.id];
        const totalReceived = stats.income + Number(p.advance_received || 0);
        const invoiceAmount = Number(p.invoice_amount || 0);
        const clientDue = Math.max(0, invoiceAmount - totalReceived);
        const totalNetExpense = stats.standardExpense + stats.othersExpense;
        const netProfit = invoiceAmount - totalNetExpense;
        const margin = invoiceAmount > 0 ? (netProfit / invoiceAmount) * 100 : 0;
        
        // Turnover days
        let turnoverDays = 0;
        if (p.event_start_date && p.created_at) {
          const start = new Date(p.created_at).getTime();
          const end = new Date(p.event_start_date).getTime();
          turnoverDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          if (turnoverDays < 0) turnoverDays = 0;
        }

        return {
          id: p.id,
          title: p.title,
          company: (p.companies as unknown as { name: string } | null)?.name ?? '—',
          status: p.status,
          invoiceAmount,
          totalReceived,
          clientDue,
          standardExpense: stats.standardExpense,
          vCashAdv: stats.vCashAdv,
          vCashDue: stats.vCashDue,
          othersExpense: stats.othersExpense,
          netExpenses: totalNetExpense,
          netProfit,
          margin,
          turnoverDays,
          payment_status: p.payment_status
        };
      }).sort((a, b) => b.netProfit - a.netProfit);
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
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard title="Total Invoiced" value={kpis?.totalInvoiced ?? 0} isCurrency icon={DollarSign} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-500/10" />
        <StatCard title="Collection Received" value={kpis?.collectionReceived ?? 0} isCurrency icon={TrendingUp} iconColor="text-teal-600 dark:text-teal-400" iconBg="bg-teal-50 dark:bg-teal-500/10" />
        <StatCard title="Collection Due" value={kpis?.collectionDue ?? 0} isCurrency icon={AlertCircle} iconColor="text-orange-600 dark:text-orange-400" iconBg="bg-orange-50 dark:bg-orange-500/10" />
        <StatCard title="Net Expenses" value={kpis?.netExpenses ?? 0} isCurrency icon={TrendingDown} iconColor="text-red-600 dark:text-red-400" iconBg="bg-red-50 dark:bg-red-500/10" />
        <StatCard title="Net Profit" value={kpis?.netProfit ?? 0} isCurrency icon={TrendingUp} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-50 dark:bg-blue-500/10" />
        <StatCard title="Vendor Due" value={kpis?.vendorDue ?? 0} isCurrency icon={TrendingDown} iconColor="text-pink-600 dark:text-pink-400" iconBg="bg-pink-50 dark:bg-pink-500/10" />
        <StatCard title="Profit Ratio" value={`${(kpis?.profitRatio ?? 0).toFixed(1)}%`} icon={TrendingUp} iconColor="text-indigo-600 dark:text-indigo-400" iconBg="bg-indigo-50 dark:bg-indigo-500/10" />
        <StatCard title="Active Project" value={kpis?.activeProjects ?? 0} icon={FolderOpen} iconColor="text-blue-600 dark:text-blue-400" iconBg="bg-blue-50 dark:bg-blue-500/10" onClick={() => navigate('/projects?status=active')} />
        <StatCard title="Completed" value={kpis?.completedProjects ?? 0} icon={CheckCircle2} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-50 dark:bg-emerald-500/10" onClick={() => navigate('/projects?status=completed')} />
        <StatCard title="Contact Form" value={kpis?.leadsCount ?? 0} icon={MessageSquare} iconColor="text-purple-600 dark:text-purple-400" iconBg="bg-purple-50 dark:bg-purple-500/10" onClick={() => navigate('/leads')} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend Line Chart */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Revenue Trend</h3>
          {trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={15}
                  tickFormatter={(str) => {
                    if (str.length === 10) {
                      // Daily: YYYY-MM-DD → "Apr 03"
                      const [y, m, d] = str.split('-');
                      const date = new Date(Number(y), Number(m) - 1, Number(d));
                      return date.toLocaleString('default', { month: 'short', day: '2-digit' });
                    }
                    // Monthly: YYYY-MM → "Jan"
                    const [y, m] = str.split('-');
                    const date = new Date(Number(y), Number(m) - 1);
                    return date.toLocaleString('default', { month: 'short' });
                  }}
                />
                <YAxis 
                  tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} 
                  tick={{ fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)',
                    backgroundColor: 'rgba(var(--background), 0.8)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                  itemStyle={{ fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  formatter={(v: number) => [formatBDT(v), '']} 
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="invoiced" stroke="#10b981" strokeWidth={3} dot={false} name="Revenue" animationDuration={1500} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} dot={false} name="Net Expenses" animationDuration={1500} />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} strokeDasharray="5 5" name="Net Profit" animationDuration={1500} />
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
        <h3 className="text-base font-semibold text-foreground mb-4">Project Information</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-muted/50 border-y border-border">
                <th className="px-4 py-3 font-semibold text-foreground">Project Name</th>
                <th className="px-4 py-3 font-semibold text-foreground">Company</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right border-l border-border/10">Quoted Amount</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Client Collection</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Client Due</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right border-l border-border/10">Expenses</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">V-Cash Adv.</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">V-Cash Due</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right text-orange-600">Other expense</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right border-l border-border/10">Net Expenses</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Net profit</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Profit Ratio</th>
                <th className="px-4 py-3 font-semibold text-foreground text-right">Turn Over Days</th>
                <th className="px-4 py-3 font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projectPnL?.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="hover:bg-muted/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground sticky left-0 bg-card/80 backdrop-blur-sm z-10">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.company}</td>
                  <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 font-mono font-bold border-l border-border/10">{formatBDT(p.invoiceAmount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">{formatBDT(p.totalReceived)}</td>
                  <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400 font-mono">{formatBDT(p.clientDue)}</td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-mono border-l border-border/10">{formatBDT(p.standardExpense)}</td>
                  <td className="px-4 py-3 text-right text-teal-600 dark:text-teal-400 font-mono">{formatBDT(p.vCashAdv)}</td>
                  <td className="px-4 py-3 text-right text-pink-600 dark:text-pink-400 font-mono">{formatBDT(p.vCashDue)}</td>
                  <td className="px-4 py-3 text-right text-orange-500 font-mono">{formatBDT(p.othersExpense)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold border-l border-border/10">{formatBDT(p.netExpenses)}</td>
                  <td className={`px-4 py-3 text-right font-bold font-mono ${p.netProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {p.netProfit > 0 ? '+' : ''}{formatBDT(p.netProfit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                    {p.margin.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{p.turnoverDays} days</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      p.payment_status === 'paid' 
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                        : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                    }`}>
                      {p.payment_status === 'paid' ? 'Received' : 'Pending'}
                    </span>
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
                  <span className="text-foreground text-sm truncate">
                    <span className="font-semibold">{p?.name ?? 'System'}</span>{' '}
                    {formatAuditLogMessage(log)}
                  </span>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs">{formatDateTime(log.created_at)}</span>
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
