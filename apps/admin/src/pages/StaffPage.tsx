import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { staffApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Modal, ConfirmModal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, getInitials } from '@/lib/utils';
import { UserPlus, ShieldCheck, UserX, UserCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';

type StaffMember = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  roles: { id: string; name: string; label: string } | null;
};

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<StaffMember | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);
  const [activateTarget, setActivateTarget] = useState<StaffMember | null>(null);
  const [inviteError, setInviteError] = useState('');

  const inviteForm = useForm({ defaultValues: { email: '', full_name: '', role_id: '' } });
  const roleForm = useForm({ defaultValues: { role_id: '' } });

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

  const { data: roles = [] } = useQuery<{ id: string; name: string; label: string }[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('id, name, label').order('label');
      return (data ?? []) as { id: string; name: string; label: string }[];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (values: { email: string; full_name: string; role_id: string }) => {
      const result = await staffApi.invite(values) as { success?: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Failed to send invite');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsInviteOpen(false);
      inviteForm.reset();
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ staffId, roleId }: { staffId: string; roleId: string }) => {
      const result = await staffApi.changeRole(staffId, roleId) as { success?: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Failed to change role');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setRoleChangeTarget(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const result = await staffApi.deactivate(staffId) as { success?: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Failed to deactivate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setDeactivateTarget(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const result = await staffApi.activate(staffId) as { success?: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Failed to activate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setActivateTarget(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Staff Management"
        description="Manage team members and their roles"
        actions={
          can('manage_staff') && (
            <button onClick={() => { setInviteError(''); setIsInviteOpen(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              <UserPlus className="h-4 w-4" /> Invite Staff
            </button>
          )
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {['Staff Member', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {getInitials(member.name)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-sm">
                      <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      {member.roles?.label ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={member.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(member.created_at)}</td>
                  <td className="px-4 py-3">
                    {can('manage_staff') && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setRoleChangeTarget(member); roleForm.reset({ role_id: member.roles?.id ?? '' }); }}
                          className="text-xs text-primary hover:underline"
                        >
                          Change Role
                        </button>
                        {member.is_active ? (
                          <button onClick={() => setDeactivateTarget(member)} className="text-xs text-destructive hover:underline">Deactivate</button>
                        ) : (
                          <button onClick={() => setActivateTarget(member)} className="text-xs text-green-600 hover:underline">Activate</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">No staff members yet. Invite your first team member.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Team Member">
        <form onSubmit={inviteForm.handleSubmit((v) => inviteMutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input {...inviteForm.register('full_name', { required: true })} placeholder="Rahim Ahmed" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email Address *</label>
            <input type="email" {...inviteForm.register('email', { required: true })} placeholder="staff@hellotms.com.bd" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role *</label>
            <select {...inviteForm.register('role_id', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Select role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" disabled={inviteMutation.isPending} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              <UserPlus className="h-4 w-4" />
              {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Role Modal */}
      <Modal isOpen={!!roleChangeTarget} onClose={() => setRoleChangeTarget(null)} title={`Change Role — ${roleChangeTarget?.name}`}>
        <form onSubmit={roleForm.handleSubmit((v) => changeRoleMutation.mutate({ staffId: roleChangeTarget!.id, roleId: v.role_id }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Role *</label>
            <select {...roleForm.register('role_id', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm">
              <option value="">Select role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setRoleChangeTarget(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" disabled={changeRoleMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              {changeRoleMutation.isPending ? 'Saving...' : 'Change Role'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget.id)}
        title="Deactivate Staff Member"
        message={`Are you sure you want to deactivate ${deactivateTarget?.name}? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        danger
      />

      <ConfirmModal
        isOpen={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={() => activateTarget && activateMutation.mutate(activateTarget.id)}
        title="Activate Staff Member"
        message={`Re-activate ${activateTarget?.name}? They will regain access.`}
        confirmLabel="Activate"
      />
    </div>
  );
}
