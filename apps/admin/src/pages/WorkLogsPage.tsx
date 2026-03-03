import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
    ClipboardList, Search, RefreshCw, User, Filter,
    ShieldCheck, Pencil, Trash2, UserPlus, LogIn, LogOut,
    Image, FileText, AlertCircle, ChevronDown
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    created_at: string;
    profiles?: { name: string; email: string } | null;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    staff_invited: { label: 'Staff Invited', icon: UserPlus, color: 'text-blue-400 bg-blue-400/10' },
    staff_deactivated: { label: 'Staff Deactivated', icon: LogOut, color: 'text-red-400 bg-red-400/10' },
    staff_activated: { label: 'Staff Activated', icon: LogIn, color: 'text-green-400 bg-green-400/10' },
    role_changed: { label: 'Role Changed', icon: ShieldCheck, color: 'text-purple-400 bg-purple-400/10' },
    role_created: { label: 'Role Created', icon: ShieldCheck, color: 'text-indigo-400 bg-indigo-400/10' },
    role_deleted: { label: 'Role Deleted', icon: Trash2, color: 'text-red-400 bg-red-400/10' },
    project_updated: { label: 'Project Updated', icon: Pencil, color: 'text-amber-400 bg-amber-400/10' },
    invoice_sent: { label: 'Invoice Sent', icon: FileText, color: 'text-teal-400 bg-teal-400/10' },
    media_uploaded: { label: 'Media Uploaded', icon: Image, color: 'text-orange-400 bg-orange-400/10' },
};

const getConfig = (action: string) => ACTION_CONFIG[action] ?? { label: action.replace(/_/g, ' '), icon: AlertCircle, color: 'text-muted-foreground bg-muted/50' };

export default function WorkLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [expanded, setExpanded] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('audit_logs')
            .select('*, profiles(name, email)')
            .order('created_at', { ascending: false })
            .limit(200);
        setLogs(data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const actionTypes = ['all', ...Array.from(new Set(logs.map(l => l.action)))];

    const filtered = logs.filter(l => {
        if (actionFilter !== 'all' && l.action !== actionFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            const name = (l.profiles?.name ?? '').toLowerCase();
            const email = (l.profiles?.email ?? '').toLowerCase();
            return name.includes(q) || email.includes(q) || l.action.includes(q) || l.entity_type.includes(q);
        }
        return true;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Work Logs</h1>
                    <p className="text-muted-foreground text-sm mt-1">Full audit trail of all admin activity</p>
                </div>
                <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm transition-colors">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user, action, entity..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                        className="pl-9 pr-8 py-2.5 rounded-lg border border-border bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-40">
                        {actionTypes.map(a => <option key={a} value={a}>{a === 'all' ? 'All Actions' : a.replace(/_/g, ' ')}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {/* Log list */}
            {loading ? (
                <div className="flex items-center justify-center h-48"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No logs found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(log => {
                        const cfg = getConfig(log.action);
                        const Icon = cfg.icon;
                        const isOpen = expanded === log.id;
                        const hasDetails = (log.before && Object.keys(log.before).length > 0) || (log.after && Object.keys(log.after).length > 0);
                        return (
                            <div key={log.id} className="bg-card border border-border rounded-xl overflow-hidden">
                                <div className="flex items-center gap-3 p-4" onClick={() => hasDetails && setExpanded(isOpen ? null : log.id)}
                                    style={hasDetails ? { cursor: 'pointer' } : undefined}>
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-medium text-foreground capitalize">{cfg.label}</p>
                                            <span className="text-xs text-muted-foreground">·</span>
                                            <p className="text-xs text-muted-foreground">{log.entity_type}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <User className="h-3 w-3 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground">{log.profiles?.name ?? 'System'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                                        <p className="text-xs text-muted-foreground/60">{format(new Date(log.created_at), 'MMM d, HH:mm')}</p>
                                    </div>
                                    {hasDetails && <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />}
                                </div>
                                {isOpen && hasDetails && (
                                    <div className="border-t border-border px-4 py-3 bg-muted/20 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {log.before && Object.keys(log.before).length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Before</p>
                                                <pre className="text-xs bg-background/50 rounded-lg p-3 overflow-auto text-foreground/70 border border-border">
                                                    {JSON.stringify(log.before, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                        {log.after && Object.keys(log.after).length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground mb-1.5">After</p>
                                                <pre className="text-xs bg-background/50 rounded-lg p-3 overflow-auto text-foreground/70 border border-border">
                                                    {JSON.stringify(log.after, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
