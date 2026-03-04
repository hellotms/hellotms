import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { staffApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Modal, ConfirmModal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, getInitials } from '@/lib/utils';
import { toast } from '@/components/Toast';
import { UserPlus, ShieldCheck, UserX, UserCheck, Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';

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

// ─── All available permission keys ────────────────────────────────────────────
const ALL_PERMISSIONS: { key: string; label: string; group: string }[] = [
  { key: 'view_dashboard', label: 'View Dashboard', group: 'Dashboard' },
  { key: 'view_reports', label: 'View Reports', group: 'Dashboard' },
  { key: 'manage_companies', label: 'Manage Companies', group: 'Companies' },
  { key: 'manage_projects', label: 'Manage Projects', group: 'Projects' },
  { key: 'view_projects', label: 'View Projects', group: 'Projects' },
  { key: 'manage_ledger', label: 'Manage Ledger', group: 'Finance' },
  { key: 'view_ledger', label: 'View Ledger', group: 'Finance' },
  { key: 'manage_invoices', label: 'Manage Invoices', group: 'Finance' },
  { key: 'send_invoice', label: 'Send Invoices', group: 'Finance' },
  { key: 'manage_staff', label: 'Manage Staff', group: 'Staff' },
  { key: 'view_staff', label: 'View Staff', group: 'Staff' },
  { key: 'manage_roles', label: 'Manage Roles', group: 'Staff' },
  { key: 'manage_leads', label: 'Manage Contact Forms', group: 'Leads' },
  { key: 'view_leads', label: 'View Leads', group: 'Leads' },
  { key: 'manage_cms', label: 'Manage CMS', group: 'Settings' },
  { key: 'manage_settings', label: 'Manage Settings', group: 'Settings' },
  { key: 'view_audit_logs', label: 'View Audit Logs', group: 'Settings' },
];

const PERMISSION_GROUPS = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.group)));

const TABS = ['Staff', 'Roles'] as const;
type Tab = (typeof TABS)[number];

// ─── Component ────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const queryClient = useQueryClient();
  const { can, role } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('Staff');

  // Staff modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState<{ name: string; email: string; password: string } | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<StaffMember | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);
  const [activateTarget, setActivateTarget] = useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<StaffMember | null>(null);
  const [inviteError, setInviteError] = useState('');

  // Role modals
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<Role | null>(null);

  const inviteForm = useForm({ defaultValues: { email: '', full_name: '', role_id: '' } });
  const roleForm = useForm({ defaultValues: { role_id: '' } });
  const roleEditForm = useForm<{ name: string; label: string; permissions: Record<string, boolean> }>();

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
    refetchInterval: 2000,
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('id, name, label, permissions').order('label');
      return (data ?? []) as Role[];
    },
  });

  // ── Staff mutations ────────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: async (values: { email: string; full_name: string; role_id: string }) => {
      const result = await staffApi.invite({ email: values.email, name: values.full_name, role_id: values.role_id, format: 'extended' }) as { success?: boolean; error?: string; tempPassword?: string; userId?: string };
      if (!result.success) throw new Error(result.error ?? 'Failed to send invite');
      return { tempPassword: result.tempPassword, email: values.email, name: values.full_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsInviteOpen(false);
      inviteForm.reset();
      if (data?.tempPassword) {
        setTempPasswordModal({ name: data.name, email: data.email, password: data.tempPassword });
      }
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ staffId, roleId }: { staffId: string; roleId: string }) => {
      const result = await staffApi.changeRole(staffId, roleId) as { success?: boolean; error?: string };
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      toast('Role changed successfully', 'success');
      setRoleChangeTarget(null);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const result = await staffApi.deactivate(staffId) as { success?: boolean; error?: string };
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      toast('Staff deactivated', 'success');
      setDeactivateTarget(null);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const activateMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const result = await staffApi.activate(staffId) as { success?: boolean; error?: string };
      if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      toast('Staff activated', 'success');
      setActivateTarget(null);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return await staffApi.resetPassword(staffId);
    },
    onSuccess: (data, staffId) => {
      toast('Password reset successfully. Email sent.', 'success');
      setResetPasswordTarget(null);
      const member = staff.find(s => s.id === staffId);
      if (member && data.tempPassword) {
        setTempPasswordModal({ name: member.name, email: member.email, password: data.tempPassword });
      }
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const { error } = await supabase.rpc('delete_user_by_id', { user_id: staffId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff'] }); setDeleteTarget(null); },
  });

  // ── Role mutations ─────────────────────────────────────────────────────────
  const saveRoleMutation = useMutation({
    mutationFn: async (values: { name: string; label: string; permissions: Record<string, boolean> }) => {
      if (editingRole) {
        const { error } = await supabase.from('roles').update(values).eq('id', editingRole.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('roles').insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setIsRoleOpen(false); setEditingRole(null); },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from('roles').delete().eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['roles'] }); setDeleteRoleTarget(null); },
  });

  const openCreateRole = () => {
    setEditingRole(null);
    roleEditForm.reset({ name: '', label: '', permissions: {} });
    setIsRoleOpen(true);
  };

  const openEditRole = (role: Role) => {
    if (role.name === 'super_admin') return; // Protective check
    setEditingRole(role);
    roleEditForm.reset({ name: role.name, label: role.label, permissions: role.permissions ?? {} });
    setIsRoleOpen(true);
  };

  const currentPermissions = roleEditForm.watch('permissions') ?? {};

  // Find how many active super_admins exist
  const activeSuperAdminsCount = staff.filter(s => s.is_active && s.roles?.name === 'super_admin').length;

  const handleDeactivateClick = (member: StaffMember) => {
    if (member.roles?.name === 'super_admin' && activeSuperAdminsCount <= 1) {
      alert("Cannot deactivate the last active Super Admin.");
      return;
    }
    setDeactivateTarget(member);
  };

  const handleRoleChangeClick = (member: StaffMember) => {
    if (member.roles?.name === 'super_admin' && activeSuperAdminsCount <= 1) {
      alert("Cannot change the role of the last active Super Admin.");
      return;
    }
    setRoleChangeTarget(member);
  };

  const handleDeleteClick = (member: StaffMember) => {
    if (member.roles?.name === 'super_admin' && activeSuperAdminsCount <= 1) {
      alert("Cannot delete the last active Super Admin.");
      return;
    }
    setDeleteTarget(member);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <PageHeader
          title="Staff & Roles"
          description="Manage team members, roles and permissions"
        />
        {(activeTab === 'Staff' && can('manage_staff')) && (
          <button
            onClick={() => { setInviteError(''); setIsInviteOpen(true); }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" /> Invite Staff
          </button>
        )}
        {activeTab === 'Roles' && can('manage_roles') && (
          <button
            onClick={openCreateRole}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Role
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab}
              {tab === 'Staff' && (
                <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{staff.length}</span>
              )}
              {tab === 'Roles' && (
                <span className="ml-1.5 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{roles.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Staff Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'Staff' && (
        isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Staff Member', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
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
                          <img src={member.avatar_url} alt={member.name} className="w-9 h-9 rounded-full object-cover bg-white" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                            {getInitials(member.name)}
                          </div>
                        )}
                        <NavLink to={`/staff/${member.id}`} className="group/name">
                          <p className="font-medium group-hover/name:text-primary transition-colors">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </NavLink>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-sm">
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate max-w-[120px]" title={member.roles?.label}>{member.roles?.label ?? '—'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={member.is_active ? 'active' : 'inactive'} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(member.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {can('manage_staff') && (
                          <>
                            {!(member.roles?.name === 'super_admin' && activeSuperAdminsCount <= 1) && (
                              <>
                                <button
                                  onClick={() => { setRoleChangeTarget(member); roleForm.reset({ role_id: member.roles?.id ?? '' }); }}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Change Role
                                </button>
                                {member.is_active ? (
                                  <button onClick={() => handleDeactivateClick(member)} className="text-xs text-destructive hover:underline">Deactivate</button>
                                ) : (
                                  <button onClick={() => setActivateTarget(member)} className="text-xs text-green-600 hover:underline">Activate</button>
                                )}
                                <button onClick={() => handleDeleteClick(member)} className="text-xs text-red-500 hover:underline">Delete</button>
                              </>
                            )}
                            {role?.name === 'super_admin' && (
                              <button onClick={() => setResetPasswordTarget(member)} className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                                <KeyRound className="h-3 w-3" /> Reset Password
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      No staff members yet. Invite your first team member.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Roles Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'Roles' && (
        rolesLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-3">
            {roles.length === 0 && (
              <div className="text-center py-12 bg-card border border-border rounded-xl text-muted-foreground text-sm">
                No roles defined yet. Create your first role.
              </div>
            )}
            {roles.map((role) => {
              const grantedCount = Object.values(role.permissions ?? {}).filter(Boolean).length;
              return (
                <div key={role.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">{role.label}</h3>
                        <code className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{role.name}</code>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {grantedCount} / {ALL_PERMISSIONS.length} permissions granted
                      </p>
                    </div>
                    {can('manage_roles') && role.name !== 'super_admin' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openEditRole(role)}
                          className="flex items-center gap-1 text-xs border border-border px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteRoleTarget(role)}
                          className="flex items-center gap-1 text-xs border border-red-200 text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Permission badges preview */}
                  {grantedCount > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ALL_PERMISSIONS.filter((p) => role.permissions?.[p.key]).map((p) => (
                        <span key={p.key} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          {p.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Invite Staff Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite Team Member">
        <form onSubmit={inviteForm.handleSubmit((v) => inviteMutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input {...inviteForm.register('full_name', { required: true })} placeholder="Rahim Ahmed" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email Address *</label>
            <input type="email" {...inviteForm.register('email', { required: true })} placeholder="staff@example.com" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role *</label>
            <select {...inviteForm.register('role_id', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select role...</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            {roles.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠ No roles found. Create a role first in the Roles tab.</p>
            )}
          </div>
          {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsInviteOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" disabled={inviteMutation.isPending || roles.length === 0} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              <UserPlus className="h-4 w-4" /> {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Change Role Modal ──────────────────────────────────────────────────── */}
      <Modal isOpen={!!roleChangeTarget} onClose={() => setRoleChangeTarget(null)} title={`Change Role — ${roleChangeTarget?.name}`}>
        <form onSubmit={roleForm.handleSubmit((v) => changeRoleMutation.mutate({ staffId: roleChangeTarget!.id, roleId: v.role_id }))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Role *</label>
            <select {...roleForm.register('role_id', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select role...</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
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

      {/* ── Create / Edit Role Modal ───────────────────────────────────────────── */}
      <Modal isOpen={isRoleOpen} onClose={() => { setIsRoleOpen(false); setEditingRole(null); }} title={editingRole ? `Edit Role — ${editingRole.label}` : 'Create New Role'}>
        <form onSubmit={roleEditForm.handleSubmit((v) => saveRoleMutation.mutate(v))} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Role Name <span className="text-xs text-muted-foreground">(slug)</span></label>
              <input
                {...roleEditForm.register('name', { required: true, pattern: /^[a-z_]+$/ })}
                placeholder="e.g. senior_staff"
                disabled={editingRole?.name === 'super_admin'}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Lowercase letters and underscores only</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Label</label>
              <input
                {...roleEditForm.register('label', { required: true })}
                placeholder="e.g. Senior Staff"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Permissions grid */}
          <div>
            <p className="text-sm font-medium mb-3">Permissions</p>
            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.filter((p) => p.group === group).map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={!!currentPermissions[p.key]}
                          onChange={(e) => {
                            roleEditForm.setValue('permissions', {
                              ...currentPermissions,
                              [p.key]: e.target.checked,
                            });
                          }}
                          className="rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-foreground group-hover:text-primary transition-colors">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => { setIsRoleOpen(false); setEditingRole(null); }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saveRoleMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              {saveRoleMutation.isPending ? 'Saving...' : editingRole ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Deactivate/Activate confirms ─────────────────────────────────────── */}
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
        isOpen={!!resetPasswordTarget}
        onClose={() => setResetPasswordTarget(null)}
        onConfirm={() => resetPasswordTarget && resetPasswordMutation.mutate(resetPasswordTarget.id)}
        title="Reset Staff Password"
        message={`Are you sure you want to reset the password for ${resetPasswordTarget?.name}? They will be emailed a new temporary password instantly.`}
        confirmLabel="Reset Password"
        danger
        loading={resetPasswordMutation.isPending}
      />
      <ConfirmModal
        isOpen={!!activateTarget}
        onClose={() => setActivateTarget(null)}
        onConfirm={() => activateTarget && activateMutation.mutate(activateTarget.id)}
        title="Activate Staff Member"
        message={`Re-activate ${activateTarget?.name}? They will regain access.`}
        confirmLabel="Activate"
      />
      <ConfirmModal
        isOpen={!!deleteRoleTarget}
        onClose={() => setDeleteRoleTarget(null)}
        onConfirm={() => deleteRoleTarget && deleteRoleMutation.mutate(deleteRoleTarget.id)}
        title="Delete Role"
        message={`Delete the "${deleteRoleTarget?.label}" role? Staff with this role will have no role assigned. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleteRoleMutation.isPending}
      />
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteStaffMutation.mutate(deleteTarget.id)}
        title="Delete Staff Member"
        message={`Are you sure you want to permanently delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        danger
        loading={deleteStaffMutation.isPending}
      />

      {/* ── Temp Password Modal ───────────────────────────────────────────────── */}
      {tempPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-center space-y-4">
              <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <UserPlus className="h-7 w-7 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Staff Invited Successfully!</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  An invitation email has been sent to <strong>{tempPasswordModal.email}</strong>
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left">
                <p className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide">⚠ Temporary Password — Share Securely</p>
                <p className="text-sm text-muted-foreground mb-3">
                  The staff member will be required to change this on first login.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background rounded-lg px-4 py-3 font-mono text-lg font-bold text-foreground tracking-widest border border-border select-all">
                    {tempPasswordModal.password}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(tempPasswordModal.password)}
                    className="px-3 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-xs"
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <button
                onClick={() => setTempPasswordModal(null)}
                className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Done — I've noted the password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
