import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { staffApi, auditApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Modal, ConfirmModal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { useForm } from 'react-hook-form';
import { cn, getInitials } from '@/lib/utils';
import { UserPlus, Search, ShieldCheck, KeyRound, Trash2, Clock, Check, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type Role = {
    id: string;
    name: string;
    label: string;
};

type StaffMember = {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    is_active: boolean;
    created_at: string;
    last_password_reset_at?: string;
    roles: { id: string; name: string; label: string } | null;
};

export default function StaffManagementPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [tempPasswordModal, setTempPasswordModal] = useState<{ name: string; email: string; password: string } | null>(null);
    const [confirmTarget, setConfirmTarget] = useState<{ type: 'deactivate' | 'activate' | 'delete' | 'reset', member: StaffMember } | null>(null);

    const form = useForm();

    const { data: staff = [], isLoading: staffLoading } = useQuery<StaffMember[]>({
        queryKey: ['staff-management'],
        queryFn: async () => {
            const { data, error } = await supabase.from('profiles').select('*, roles(id, name, label)').order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []) as unknown as StaffMember[];
        }
    });

    const { data: roles = [] } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: async () => {
            const { data } = await supabase.from('roles').select('id, name, label').order('label');
            return (data ?? []) as Role[];
        }
    });

    const processedStaff = useMemo(() => {
        return [...staff]
            .sort((a, b) => {
                const getRank = (n?: string) => n === 'super_admin' ? 0 : (n === 'admin' ? 1 : 2);
                const rA = getRank(a.roles?.name); const rB = getRank(b.roles?.name);
                return rA !== rB ? rA - rB : a.name.localeCompare(b.name);
            })
            .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.email.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [staff, searchTerm]);

    const inviteMutation = useMutation({
        mutationFn: (v: any) => staffApi.invite({ email: v.email, name: v.name, role_id: v.role_id }),
        onSuccess: (data: any, vars: any) => {
            auditApi.log({ action: 'invite_staff', entity_type: 'staff', after: { email: vars.email, role_id: vars.role_id } });
            queryClient.invalidateQueries({ queryKey: ['staff-management'] });
            setIsInviteOpen(false);
            if (data?.tempPassword) setTempPasswordModal({ name: data.name || 'Staff', email: data.email || '', password: data.tempPassword });
            toast('Invitation sent!', 'success');
        },
        onError: (e: any) => toast(e.message, 'error')
    });

    const staffMutation = useMutation({
        mutationFn: async ({ action, member, role_id }: any) => {
            if (action === 'role') return staffApi.changeRole(member.id, role_id);
            if (action === 'activate') return staffApi.activate(member.id);
            if (action === 'deactivate') return staffApi.deactivate(member.id);
            if (action === 'reset') return staffApi.resetPassword(member.id);
            if (action === 'delete') { const { error } = await supabase.rpc('delete_user_by_id', { user_id: member.id }); if (error) throw error; }
        },
        onSuccess: (res: any, vars: any) => {
            auditApi.log({ action: `${vars.action}_staff`, entity_type: 'staff', entity_id: vars.member.id, after: { role_id: vars.role_id } });
            toast(`${vars.action.charAt(0).toUpperCase() + vars.action.slice(1)} successful`, 'success');
            setConfirmTarget(null);
            if (res?.tempPassword) setTempPasswordModal({ name: vars.member.name, email: vars.member.email, password: res.tempPassword });
            queryClient.invalidateQueries({ queryKey: ['staff-management'] });
        },
        onError: (e: any) => toast(e.message, 'error')
    });

    return (
        <div className="space-y-6 pb-20 max-w-[1400px] mx-auto px-4">
            <div className="flex items-center gap-4">
                <Link to="/cms?tab=admin" className="p-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <PageHeader title="Staff Management" description="Manage team members, roles, and administrative access" />
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                    <h2 className="font-bold text-xl text-foreground flex items-center gap-2">Team Directory</h2>
                    <button
                        onClick={() => setIsInviteOpen(true)}
                        className="px-5 py-2 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:opacity-90 flex items-center gap-2 uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                        <UserPlus className="h-3.5 w-3.5" /> Invite Staff
                    </button>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm min-h-[500px] space-y-6">
                    <div className="flex items-center gap-4 bg-muted/30 p-2.5 rounded-2xl border border-border/50">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                            <input placeholder="Locate staff member by name or digital address..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-transparent border-none pl-11 pr-4 py-2 text-sm outline-none font-medium text-foreground placeholder:text-muted-foreground/40" />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 border-b border-border text-left">
                                <tr><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Team Member</th><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Role</th><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorization</th><th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right tracking-[0.2em] pr-8">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {staffLoading ? (
                                    <tr><td colSpan={4} className="py-24 text-center animate-pulse font-black text-muted-foreground/30 uppercase tracking-[0.5em]">Synchronizing Directory...</td></tr>
                                ) : (
                                    processedStaff.map((m) => {
                                        let isCoolingDown = false; let cooldownMinutes = 0;
                                        if (m.last_password_reset_at) {
                                            const diff = Date.now() - new Date(m.last_password_reset_at).getTime();
                                            if (diff < 30 * 60000) { isCoolingDown = true; cooldownMinutes = Math.ceil((30 * 60000 - diff) / 60000); }
                                        }
                                        return (
                                            <tr key={m.id} className="hover:bg-muted/10 transition-colors group">
                                                <td className="px-6 py-4"><div className="flex items-center gap-4"><div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black relative border border-primary/5 transition-all group-hover:bg-primary/20">{m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover rounded-2xl" /> : getInitials(m.name)}</div><div><p className="font-black text-foreground text-sm">{m.name}</p><p className="text-[10px] font-bold text-muted-foreground tracking-tight">{m.email}</p></div></div></td>
                                                <td className="px-6 py-4"><div className="flex items-center gap-2"><select value={m.roles?.id || ''} onChange={e => staffMutation.mutate({ action: 'role', member: m, role_id: e.target.value })} className="bg-muted/50 border border-transparent hover:border-border rounded-xl px-2.5 py-1 text-[11px] font-black uppercase tracking-tighter outline-none cursor-pointer">{roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div></td>
                                                <td className="px-6 py-4"><button onClick={() => setConfirmTarget({ type: m.is_active ? 'deactivate' : 'activate', member: m })} className={cn("text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg border shadow-sm transition-all", m.is_active ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20")}>{m.is_active ? 'Authorized' : 'Suspended'}</button></td>
                                                <td className="px-6 py-4 text-right pr-4"><div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => setConfirmTarget({ type: 'reset', member: m })} disabled={isCoolingDown} title={isCoolingDown ? `Locked for ${cooldownMinutes}m` : "Reset Access"} className={cn("p-2 rounded-xl transition-all", isCoolingDown ? "text-muted-foreground/30" : "text-amber-500 hover:bg-amber-500/10")}>{isCoolingDown ? <Clock className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}</button><button onClick={() => setConfirmTarget({ type: 'delete', member: m })} className="p-2 text-red-100 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></button></div></td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ConfirmModal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} onConfirm={() => confirmTarget && staffMutation.mutate({ action: confirmTarget.type, member: confirmTarget.member })} loading={staffMutation.isPending} danger={confirmTarget?.type === 'delete' || confirmTarget?.type === 'deactivate'} title={`${confirmTarget?.type.charAt(0).toUpperCase()}${confirmTarget?.type.slice(1)} Staff Member`} message={confirmTarget?.type === 'reset' ? `Perform security reset for ${confirmTarget.member.name}? New temporary credentials will be issued. (30m cooldown enforced)` : `Confirm ${confirmTarget?.type} for ${confirmTarget?.member.name}?`} />

            <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="System Enlistment" description="Issue a secure invitation to a new staff member.">
                <form onSubmit={form.handleSubmit(v => inviteMutation.mutate({ email: v.s_mail, name: v.s_name, role_id: v.s_role }))} className="space-y-6">
                    <div className="space-y-4">
                        <div><label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Full Name</label><input {...form.register('s_name', { required: true })} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none" /></div>
                        <div><label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Staff-ID (Email)</label><input type="email" {...form.register('s_mail', { required: true })} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10 outline-none" /></div>
                        <div><label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Strategic Role</label><select {...form.register('s_role', { required: true })} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none cursor-pointer">{roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
                    </div>
                    <button type="submit" disabled={inviteMutation.isPending} className="w-full py-3.5 bg-primary text-primary-foreground font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90">{inviteMutation.isPending ? 'Syncing...' : 'Initiate Invite'}</button>
                </form>
            </Modal>

            {tempPasswordModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center space-y-6">
                            <div className="h-24 w-24 rounded-3xl bg-green-500/10 flex items-center justify-center mx-auto text-green-500 border border-green-500/10"><Check className="h-12 w-12" /></div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-foreground">Secure Credentials</h2>
                                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Credential set for <span className="text-foreground">{tempPasswordModal.name}</span></p>
                            </div>
                            <div className="relative group">
                                <code className="block w-full bg-muted border border-border rounded-3xl p-8 font-mono text-xl font-black tracking-[0.1em] text-primary select-all cursor-pointer hover:bg-muted/80 transition-all uppercase">{tempPasswordModal.password}</code>
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-xl">Temporary PIN</div>
                                <button onClick={() => { navigator.clipboard.writeText(tempPasswordModal.password); toast('Copied!', 'success'); }} className="mt-4 flex items-center gap-2 mx-auto text-[10px] font-black text-muted-foreground hover:text-primary uppercase tracking-widest"><Save className="h-3.5 w-3.5" /> Transfer to Clipboard</button>
                            </div>
                            <button onClick={() => setTempPasswordModal(null)} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20">Finalize & Exit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
