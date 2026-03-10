import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { auditApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Modal, ConfirmModal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ShieldCheck, KeyRound, Shield, Check, Edit3, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const ALL_PERMISSIONS = [
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
    { key: 'manage_notices', label: 'Manage Notices', group: 'Notices' },
    { key: 'view_notices', label: 'View Notices', group: 'Notices' },
    { key: 'view_audit_logs', label: 'View Audit Logs', group: 'Settings' },
];

const PERMISSION_GROUPS = Array.from(new Set(ALL_PERMISSIONS.map(p => p.group)));

type Role = {
    id: string;
    name: string;
    label: string;
    permissions: Record<string, boolean>;
};

export default function RoleManagementPage() {
    const queryClient = useQueryClient();
    const [isEditingRole, setIsEditingRole] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [deleteRoleTarget, setDeleteRoleTarget] = useState<Role | null>(null);

    const roleEditForm = useForm<{ name: string; label: string; permissions: Record<string, boolean> }>();

    const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: async () => {
            const { data } = await supabase.from('roles').select('*').order('label');
            return (data ?? []) as Role[];
        }
    });

    useEffect(() => {
        if (roles.length > 0 && !selectedRole) {
            setSelectedRole(roles[0]);
        }
    }, [roles, selectedRole]);

    useEffect(() => {
        if (selectedRole) {
            roleEditForm.reset({
                name: selectedRole.name,
                label: selectedRole.label,
                permissions: selectedRole.permissions || {}
            });
            setIsEditingRole(false);
        }
    }, [selectedRole, roleEditForm]);

    const roleSaveMutation = useMutation({
        mutationFn: async (payload: any) => {
            if (selectedRole?.id) {
                const { error } = await supabase.from('roles').update({ label: payload.label, permissions: payload.permissions }).eq('id', selectedRole.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('roles').insert({ name: payload.name, label: payload.label, permissions: payload.permissions });
                if (error) throw error;
            }
        },
        onSuccess: (data: any, vars: any) => {
            auditApi.log({ action: selectedRole?.id ? 'update_role' : 'create_role', entity_type: 'role', entity_id: selectedRole?.id, after: vars });
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setIsEditingRole(false);
            setIsRoleModalOpen(false);
            toast('Role saved!', 'success');
        }
    });

    const deleteRoleMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('roles').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: (data: any, id: string) => {
            auditApi.log({ action: 'delete_role', entity_type: 'role', entity_id: id });
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setDeleteRoleTarget(null);
            setSelectedRole(roles[0] || null);
            toast('Role deleted', 'success');
        }
    });

    return (
        <div className="space-y-6 pb-20 max-w-[1400px] mx-auto px-4">
            <div className="flex items-center gap-4">
                <Link to="/cms?tab=admin" className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <PageHeader title="Role Management" description="Define security archetypes and granular system permissions" />
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                    <h2 className="font-bold text-xl text-foreground flex items-center gap-2">Security Layers</h2>
                    <button
                        onClick={() => { setSelectedRole(null); roleEditForm.reset({ name: '', label: '', permissions: {} }); setIsRoleModalOpen(true); }}
                        className="px-5 py-2 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:opacity-90 flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-3.5 w-3.5" /> Create New Role
                    </button>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[500px]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
                        <div className="md:col-span-1 border-r border-border pr-6 space-y-3">
                            <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-2 mb-4">Available Archetypes</h3>
                            {rolesLoading ? <div className="space-y-3 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/40 rounded-2xl" />)}</div> : roles.map(r => (
                                <button key={r.id} onClick={() => setSelectedRole(r)} className={cn("w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group", selectedRole?.id === r.id ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-[1.02]" : "bg-card border-border hover:border-primary/40 hover:bg-muted/20")}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", selectedRole?.id === r.id ? "bg-white/20 border-white/20" : "bg-primary/5 border-primary/10")}><Shield className="h-5 w-5" /></div>
                                        <div><p className="font-black text-sm leading-tight">{r.label}</p><p className={cn("text-[9px] font-bold uppercase", selectedRole?.id === r.id ? "text-white/60" : "text-muted-foreground")}>{Object.values(r.permissions ?? {}).filter(Boolean).length} Active Keys</p></div>
                                    </div>
                                    {r.name !== 'super_admin' && <button onClick={(e) => { e.stopPropagation(); setDeleteRoleTarget(r); }} className={cn("p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all", selectedRole?.id === r.id ? "hover:bg-red-500/40 text-white/50 hover:text-white" : "hover:bg-red-50 text-red-400")}><Trash2 className="h-3.5 w-3.5" /></button>}
                                </button>
                            ))}
                        </div>

                        <div className="md:col-span-2 space-y-6">
                            {selectedRole ? (
                                <div className="animate-in fade-in zoom-in-95 duration-200 h-full flex flex-col">
                                    <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                                        <div>
                                            <h3 className="text-xl font-black text-foreground">Permissions for {selectedRole.label}</h3>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1 flex items-center gap-1.5"><KeyRound className="h-3 w-3" /> Technical ID: {selectedRole.name}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {selectedRole.name !== 'super_admin' && (
                                                !isEditingRole ? (
                                                    <button onClick={() => setIsEditingRole(true)} className="px-5 py-2 bg-primary/10 text-primary text-xs font-black rounded-xl hover:bg-primary/20 flex items-center gap-2 uppercase tracking-widest"><Edit3 className="h-3.5 w-3.5" /> Edit Permissions</button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setIsEditingRole(false)} className="px-4 py-2 text-xs font-bold hover:bg-muted rounded-xl">Cancel</button>
                                                        <button
                                                            onClick={roleEditForm.handleSubmit(v => roleSaveMutation.mutate(v))}
                                                            disabled={roleSaveMutation.isPending}
                                                            className="px-5 py-2 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:opacity-90 shadow-lg shadow-primary/10 flex items-center gap-2 uppercase tracking-widest"
                                                        >
                                                            {roleSaveMutation.isPending ? 'Saving...' : 'Save Role'}
                                                        </button>
                                                    </>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-muted/20 border border-border/50 rounded-3xl p-8 overflow-y-auto custom-scrollbar">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
                                            {PERMISSION_GROUPS.map(g => (
                                                <div className="space-y-4" key={g}>
                                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" /> {g}</h4>
                                                    <div className="space-y-2.5">
                                                        {ALL_PERMISSIONS.filter(p => p.group === g).map(p => {
                                                            const perms = roleEditForm.watch('permissions') || {};
                                                            const isChecked = !!perms[p.key];
                                                            return (
                                                                <label key={p.key} className={cn("flex items-center gap-3 group/cb cursor-pointer p-2 rounded-xl transition-all", isEditingRole ? "hover:bg-background border border-transparent hover:border-border" : "cursor-default opacity-80")}>
                                                                    <div className={cn("h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all", isChecked ? "bg-primary border-primary shadow-lg shadow-primary/10" : "border-muted group-hover/cb:border-primary/50")}>
                                                                        {isChecked && <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[4px]" />}
                                                                        <input
                                                                            type="checkbox"
                                                                            className="hidden"
                                                                            disabled={!isEditingRole || selectedRole.name === 'super_admin'}
                                                                            checked={isChecked}
                                                                            onChange={e => roleEditForm.setValue('permissions', { ...perms, [p.key]: e.target.checked })}
                                                                        />
                                                                    </div>
                                                                    <span className={cn("text-xs font-bold transition-colors", isChecked ? "text-foreground" : "text-muted-foreground")}>{p.label}</span>
                                                                </label>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 space-y-4 py-32"><Shield className="h-16 w-16 stroke-[1px]" /><p className="font-black text-xs uppercase tracking-[0.4em]">Select an archetype to inspect permissions</p></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="New Security Archetype">
                <form onSubmit={roleEditForm.handleSubmit(v => roleSaveMutation.mutate(v))} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Technical Slug <span className="text-red-500">*</span></label><input {...roleEditForm.register('name', { required: true })} placeholder="e.g. site_admin" className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-mono" /></div>
                        <div><label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Display Name <span className="text-red-500">*</span></label><input {...roleEditForm.register('label', { required: true })} placeholder="e.g. Site Admin" className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" /></div>
                    </div>
                    <button type="submit" disabled={roleSaveMutation.isPending} className="w-full py-4 bg-primary text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 transition-all">{roleSaveMutation.isPending ? 'Finalizing...' : 'Create Role'}</button>
                </form>
            </Modal>

            <ConfirmModal isOpen={!!deleteRoleTarget} onClose={() => setDeleteRoleTarget(null)} onConfirm={() => deleteRoleTarget && deleteRoleMutation.mutate(deleteRoleTarget.id)} title="Purge Security Layer" danger message={`This will permanently remove the "${deleteRoleTarget?.label}" role. All linked staff will lose access immediately.`} />
        </div>
    );
}
