import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { cn, getInitials, formatDate } from '@/lib/utils';
import { ShieldCheck, Users } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type StaffMember = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  roles: { id: string; name: string; label: string } | null;
};

type Role = {
  id: string;
  name: string;
  label: string;
  permissions: Record<string, boolean>;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const [roleFilter, setRoleFilter] = useState('all');

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, is_active, created_at, roles(id, name, label)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StaffMember[];
    },
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('id, name, label, permissions').order('label');
      return (data ?? []) as Role[];
    },
  });

  // ── Sorting & Filtering ────────────────────────────────────────────────────
  const processedStaff = useMemo(() => {
    let list = [...staff];

    // 1. Role Filter
    if (roleFilter !== 'all') {
      list = list.filter(s => s.roles?.id === roleFilter);
    }

    // 2. Hierarchical Sorting
    return list.sort((a, b) => {
      const getPriority = (s: StaffMember) => {
        if (s.roles?.name === 'super_admin') return 1;
        if (s.roles?.name === 'admin') return 2;
        return 3;
      };

      const pA = getPriority(a);
      const pB = getPriority(b);

      if (pA !== pB) return pA - pB;

      // Same priority: sort by created_at (descending)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [staff, roleFilter]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <PageHeader
          title="All Staff"
          description="View our team members and their roles"
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Filter by Role:</span>
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-muted border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary min-w-[150px] outline-none"
        >
          <option value="all">All Roles</option>
          {roles.map(r => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        <div className="ml-auto text-xs text-muted-foreground">
          Showing <strong>{processedStaff.length}</strong> members
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 animate-pulse text-muted-foreground">Loading staff members...</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Staff Member', 'Role', 'Status', 'Joined On'].map((h) => (
                    <th key={h} className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {processedStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 group">
                        <NavLink to={`/staff/${member.id}`} className="relative shrink-0">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-border shadow-sm group-hover:ring-primary/40 transition-all" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase ring-1 ring-border group-hover:ring-primary/40 transition-all">
                              {getInitials(member.name)}
                            </div>
                          )}
                        </NavLink>
                        <div className="min-w-0">
                          <NavLink to={`/staff/${member.id}`} className="font-semibold text-foreground hover:text-primary transition-colors block truncate">
                            {member.name}
                          </NavLink>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border shadow-sm",
                          member.roles?.name === 'super_admin' ? "bg-primary/5 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                        )}>
                          {member.roles?.label ?? 'No Role'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={member.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">
                      {formatDate(member.created_at)}
                    </td>
                  </tr>
                ))}
                {processedStaff.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-10 w-10 text-muted-foreground/20" />
                        <p className="text-muted-foreground">No staff members found matching your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </div>
  );
}
