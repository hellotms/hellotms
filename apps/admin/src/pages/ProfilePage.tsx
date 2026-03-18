import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { mediaApi, staffApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Modal, ConfirmModal } from '@/components/Modal';
import { ImageUpload } from '@/components/ImageUpload';
import { toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Calendar, Save, Edit2, Monitor, Smartphone, Globe, LogOut, Trash2 } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { Profile } from '@hellotms/shared';

type ProfileInput = {
    name: string;
    phone?: string;
    address?: string;
};

export default function ProfilePage() {
    const { profile, role, session } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url ?? '');
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [showRevokeOthers, setShowRevokeOthers] = useState(false);

    const { register, handleSubmit, reset, watch: watchProfile } = useForm<ProfileInput>({
        defaultValues: {
            name: profile?.name,
            phone: profile?.phone ?? '',
            address: profile?.address ?? '',
        }
    });

    const {
        register: registerPass,
        handleSubmit: handlePassSubmit,
        reset: resetPass,
        formState: { errors: passErrors }
    } = useForm({
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
    });

    const [pwSaved, setPwSaved] = useState(false);
    const [pwError, setPwError] = useState('');

    const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
        queryKey: ['my-sessions'],
        queryFn: () => staffApi.getSessions(),
        enabled: activeTab === 'security',
    });

    const revokeMutation = useMutation({
        mutationFn: (id: string) => staffApi.revokeSession(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
            toast('Session revoked successfully', 'success');
        }
    });

    const revokeOthersMutation = useMutation({
        mutationFn: () => {
            const token = session?.access_token;
            let sessionId = '';
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    sessionId = payload.session_id;
                } catch (e) { }
            }
            return staffApi.revokeOtherSessions(sessionId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-sessions'] });
            toast('Other sessions revoked', 'success');
        }
    });

    // Helper to get session ID from JWT
    const getCurrentSessionId = () => {
        if (!session?.access_token) return null;
        try {
            const payload = JSON.parse(atob(session.access_token.split('.')[1]));
            return payload.session_id;
        } catch (e) { return null; }
    };

    const currentSessionId = getCurrentSessionId();

    const updatePasswordMutation = useMutation({
        mutationFn: async (values: any) => {
            if (values.newPassword !== values.confirmPassword) throw new Error('Passwords do not match');
            if (values.newPassword.length < 8) throw new Error('Password must be at least 8 characters');
            
            const { error } = await supabase.auth.updateUser({ password: values.newPassword });
            if (error) throw error;
        },
        onSuccess: () => {
            resetPass();
            setPwSaved(true);
            setPwError('');
            setTimeout(() => setPwSaved(false), 3000);
            toast('Password updated successfully', 'success');
        },
        onError: (e: Error) => {
            setPwError(e.message);
            toast(e.message, 'error');
        },
    });

    const updateMutation = useMutation({
        mutationFn: async (values: ProfileInput) => {
            let finalAvatarUrl: string | null = avatarUrl;
            if (avatarUrl !== profile?.avatar_url) {
                finalAvatarUrl = await mediaApi.uploadAndCleanMedia(
                    avatarUrl,
                    profile?.avatar_url ?? null,
                    'profiles',
                    'avatar',
                    values.name
                );
            }

            const { error } = await supabase.from('profiles').update({
                name: values.name,
                phone: values.phone || null,
                address: values.address || null,
                avatar_url: finalAvatarUrl || null,
            }).eq('id', profile!.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            setIsEditing(false);
            toast('Profile updated successfully', 'success');
        },
        onError: (e: any) => {
            toast(`Failed to update profile: ${e.message}`, 'error');
        }
    });

    if (!profile) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <PageHeader
                title="Account Settings"
                description="Manage your profile information and security settings"
            />

            {/* Tab Navigation */}
            <div className="flex border-b border-border mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Profile Details
                    {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'security' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Security & Devices
                    {activeTab === 'security' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
            </div>

            {activeTab === 'profile' ? (
                <div className="bg-card border border-border rounded-xl p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-semibold text-xl">Profile Information</h2>
                        {!isEditing && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                            >
                                <Edit2 className="h-4 w-4" /> Edit Profile
                            </button>
                        )}
                    </div>

                    <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-8">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pb-8 border-b border-border">
                            <div className="w-24 h-24 shrink-0 relative group">
                                <ImageUpload
                                    value={avatarUrl}
                                    onChange={(val) => setAvatarUrl(val as string)}
                                    aspect={1}
                                    disabled={!isEditing}
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
                                <p className="text-muted-foreground">{profile.email}</p>
                                <div className="flex items-center gap-4 text-sm mt-3">
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                                        <ShieldCheck className="h-4 w-4" /> {role?.name ?? 'Staff'}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                        <Calendar className="h-4 w-4" /> Joined {formatDate(profile.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground">Full Name *</label>
                                <input {...register('name', { required: true })} disabled={!isEditing} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-75 disabled:bg-muted/50" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground">Phone Number</label>
                                <input {...register('phone')} type="tel" disabled={!isEditing} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-75 disabled:bg-muted/50" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1.5 text-foreground">Address</label>
                                <textarea {...register('address')} rows={3} disabled={!isEditing} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y disabled:opacity-75 disabled:bg-muted/50" />
                            </div>
                        </div>

                        {isEditing && (
                            <div className="flex justify-end gap-3 pt-6 border-t border-border">
                                <button type="button" onClick={() => { setIsEditing(false); reset(); setAvatarUrl(profile?.avatar_url ?? ''); }} className="px-6 py-2.5 rounded-lg font-medium border border-border hover:bg-muted transition-colors disabled:opacity-60" disabled={updateMutation.isPending}>Cancel</button>
                                <button type="submit" disabled={updateMutation.isPending} className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"><Save className="h-4 w-4" /> {updateMutation.isPending ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        )}
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Change Password Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-card border border-border rounded-xl p-6 h-full shadow-sm">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                Security Settings
                            </h3>
                            <form onSubmit={handlePassSubmit((v) => updatePasswordMutation.mutate(v))} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Current Password</label>
                                    <input 
                                        type="password" 
                                        {...registerPass('currentPassword', { required: true })}
                                        placeholder="••••••••"
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">New Password</label>
                                    <input 
                                        type="password" 
                                        {...registerPass('newPassword', { required: true, minLength: 8 })}
                                        placeholder="Min 8 characters"
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" 
                                    />
                                    {passErrors.newPassword && <p className="text-[10px] text-red-500 font-bold ml-1">Minimum 8 characters required</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Confirm Password</label>
                                    <input 
                                        type="password" 
                                        {...registerPass('confirmPassword', { required: true })}
                                        placeholder="Repeat new password"
                                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner" 
                                    />
                                </div>
                                
                                {pwError && (
                                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-shake">
                                        {pwError}
                                    </div>
                                )}
                                
                                {pwSaved && (
                                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-xs font-bold flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4" /> Password updated!
                                    </div>
                                )}
                                
                                <button
                                    type="submit"
                                    disabled={updatePasswordMutation.isPending}
                                    className="w-full py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-60 transition-all shadow-lg active:scale-[0.98]"
                                >
                                    {updatePasswordMutation.isPending ? 'Updating...' : 'Change Password'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Logged Devices Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <Monitor className="h-5 w-5 text-primary" />
                                        Logged Devices
                                    </h3>
                                    <p className="text-sm text-muted-foreground font-medium">Active sessions across your devices.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => queryClient.invalidateQueries({ queryKey: ['my-sessions'] })}
                                        className="px-4 py-2 text-xs font-bold border border-border rounded-xl hover:bg-muted transition-all active:scale-95"
                                    >
                                        Refresh
                                    </button>
                                    <button
                                        onClick={() => setShowRevokeOthers(true)}
                                        disabled={revokeOthersMutation.isPending}
                                        className="flex items-center gap-2 px-5 py-2 text-xs font-black uppercase tracking-widest bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-red-500/20"
                                    >
                                        <LogOut className="h-4 w-4" /> Logout Others
                                    </button>
                                </div>
                            </div>

                            {/* Revoke Others Confirmation Modal */}
                            <ConfirmModal
                                isOpen={showRevokeOthers}
                                onClose={() => setShowRevokeOthers(false)}
                                onConfirm={() => {
                                    revokeOthersMutation.mutate();
                                    setShowRevokeOthers(false);
                                }}
                                title="Logout from other devices?"
                                message="This will immediately revoke access for all other devices presently logged into your account. You will remain logged into this current device."
                                confirmLabel="Logout Others"
                                danger={true}
                                loading={revokeOthersMutation.isPending}
                            />

                            {/* Individual Revoke Confirmation Modal */}
                            <ConfirmModal
                                isOpen={!!revokingId}
                                onClose={() => setRevokingId(null)}
                                onConfirm={() => {
                                    if (revokingId) revokeMutation.mutate(revokingId);
                                    setRevokingId(null);
                                }}
                                title="Revoke Device Access?"
                                message="Are you sure you want to log out this specific device? It will lose all access until you log in again on that device."
                                confirmLabel="Revoke Access"
                                danger={true}
                                loading={revokeMutation.isPending}
                            />

                            {sessionsLoading ? (
                                <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                                    <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <span className="text-xs font-black uppercase tracking-wider">Retrieving sessions...</span>
                                </div>
                            ) : !sessionsData?.data || sessionsData.data.length === 0 ? (
                                <div className="py-16 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
                                    <p className="text-sm text-muted-foreground font-medium">No active sessions found.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-border bg-muted/5 rounded-2xl border border-border px-5 py-2">
                                    {sessionsData?.data?.map((sess) => {
                                        const isCurrent = sess.id === currentSessionId;
                                        const ua = sess.user_agent || '';
                                        
                                        // Better Device Detection
                                        let deviceName = 'Unknown Device';
                                        if (ua.includes('iPhone')) deviceName = 'iPhone';
                                        else if (ua.includes('iPad')) deviceName = 'iPad';
                                        else if (ua.includes('Android')) deviceName = 'Android Device';
                                        else if (ua.includes('Windows')) deviceName = 'Windows PC';
                                        else if (ua.includes('Macintosh')) deviceName = 'MacBook';
                                        else if (ua.includes('Linux')) deviceName = 'Linux PC';

                                        // Better Browser Detection
                                        let browser = 'Unknown Browser';
                                        if (ua.includes('Edg/')) browser = 'Edge';
                                        else if (ua.includes('Chrome/')) browser = 'Chrome';
                                        else if (ua.includes('Firefox/')) browser = 'Firefox';
                                        else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

                                        const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);

                                        return (
                                            <div key={sess.id} className="py-6 flex items-center justify-between group">
                                                <div className="flex items-center gap-5">
                                                    <div className={cn(
                                                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md transform group-hover:scale-110",
                                                        isCurrent ? "bg-primary text-white shadow-primary/20" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                    )}>
                                                        {isMobile ? <Smartphone className="h-7 w-7" /> : <Monitor className="h-7 w-7" />}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-black text-sm tracking-tight text-foreground uppercase">
                                                                {deviceName}
                                                            </span>
                                                            {isCurrent && (
                                                                <span className="px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600 text-[9px] font-black uppercase tracking-[0.15em] border border-green-500/20 shadow-sm shadow-green-500/5">Current</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-bold italic">
                                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                                                                <Globe className="h-3 w-3" />
                                                                {browser}
                                                            </div>
                                                            <span className="font-mono text-[10px] bg-primary/5 text-primary px-2 py-0.5 rounded-md border border-primary/10">{sess.ip}</span>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground/50 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                            <Calendar className="h-3 w-3" />
                                                            Updated {formatDate(sess.updated_at)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {!isCurrent && (
                                                    <button
                                                        onClick={() => setRevokingId(sess.id)}
                                                        className="p-3 text-muted-foreground hover:text-white hover:bg-red-500 rounded-2xl transition-all active:scale-90 shadow-sm hover:shadow-red-500/40"
                                                        title="Revoke access"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/20 rounded-2xl p-6 flex items-start gap-5 shadow-sm">
                            <ShieldCheck className="h-6 w-6 text-blue-500 mt-1" />
                            <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase tracking-widest text-blue-600">Security Recommendation</h4>
                                <p className="text-sm text-blue-800/70 dark:text-blue-200/50 leading-relaxed font-medium">
                                    Regularly review your active sessions. If you notice any suspicious activity, immediately revoke the session and update your password to maintain account integrity.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
