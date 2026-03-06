import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { mediaApi, staffApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ImageUpload } from '@/components/ImageUpload';
import { toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Calendar, Save, Edit2, Monitor, Smartphone, Globe, LogOut, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
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

    const { register, handleSubmit, reset } = useForm<ProfileInput>({
        defaultValues: {
            name: profile?.name,
            phone: profile?.phone ?? '',
            address: profile?.address ?? '',
        }
    });

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
                    Logged Devices
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
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-semibold text-lg">Logged Devices</h3>
                                <p className="text-sm text-muted-foreground">List of devices that have access to your account.</p>
                            </div>
                            <button
                                onClick={() => revokeOthersMutation.mutate()}
                                disabled={revokeOthersMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                            >
                                <LogOut className="h-4 w-4" /> Logout from other devices
                            </button>
                        </div>

                        {sessionsLoading ? (
                            <div className="py-12 text-center text-muted-foreground">Loading sessions...</div>
                        ) : (
                            <div className="divide-y divide-border">
                                {sessionsData?.data?.map((sess) => {
                                    const isCurrent = sess.id === currentSessionId;
                                    const ua = sess.user_agent || '';
                                    const isMobile = /Mobile|Android|iPhone/i.test(ua);

                                    return (
                                        <div key={sess.id} className="py-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                    {isMobile ? <Smartphone className="h-5 w-5 text-muted-foreground" /> : <Monitor className="h-5 w-5 text-muted-foreground" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">
                                                            {ua.split(')')[0]?.split('(')[1] || 'Unknown Device'}
                                                        </span>
                                                        {isCurrent && (
                                                            <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 text-[10px] font-bold uppercase tracking-wider">Current Session</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {ua.includes('Chrome') ? 'Google Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser'} · {sess.ip}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase">
                                                        Last active: {formatDate(sess.updated_at)}
                                                    </p>
                                                </div>
                                            </div>

                                            {!isCurrent && (
                                                <button
                                                    onClick={() => revokeMutation.mutate(sess.id)}
                                                    className="p-2 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors"
                                                    title="Revoke session"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl p-5 flex items-start gap-4">
                        <Globe className="h-5 w-5 text-blue-600 mt-1" />
                        <div>
                            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300">Security Tip</h4>
                            <p className="text-sm text-blue-800/70 dark:text-blue-400/70 mt-1">
                                If you see any device or location you don't recognize, we recommend revoking that session and changing your password immediately.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
