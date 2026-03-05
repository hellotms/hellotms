import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { mediaApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ImageUpload } from '@/components/ImageUpload';
import { toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Calendar, Save } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Profile } from '@hellotms/shared';

type ProfileInput = {
    name: string;
    phone?: string;
    address?: string;
};

export default function ProfilePage() {
    const { profile, role } = useAuth();
    const queryClient = useQueryClient();
    const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url ?? '');

    const { register, handleSubmit } = useForm<ProfileInput>({
        defaultValues: {
            name: profile?.name,
            phone: profile?.phone ?? '',
            address: profile?.address ?? '',
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (values: ProfileInput) => {
            let finalAvatarUrl = avatarUrl;
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
            toast('Profile updated successfully', 'success');
        },
        onError: (e: any) => {
            toast(`Failed to update profile: ${e.message}`, 'error');
        }
    });

    if (!profile) return null;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <PageHeader
                title="My Profile"
                description="Manage your personal information and account settings"
            />

            <div className="bg-card border border-border rounded-xl p-8">
                <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-8">

                    {/* Header Info */}
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pb-8 border-b border-border">
                        <div className="w-24 h-24 shrink-0 relative group">
                            <ImageUpload
                                value={avatarUrl}
                                onChange={(val) => setAvatarUrl(val as string)}
                                aspect={1}
                            />
                        </div>

                        <div className="flex-1 space-y-2">
                            <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
                            <p className="text-muted-foreground">{profile.email}</p>
                            <div className="flex items-center gap-4 text-sm mt-3">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                                    <ShieldCheck className="h-4 w-4" /> {role?.label ?? 'Staff'}
                                </span>
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Calendar className="h-4 w-4" /> Joined {formatDate(profile.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <h3 className="font-semibold text-lg text-foreground">Personal Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground">Full Name *</label>
                                <input
                                    {...register('name', { required: true })}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-foreground">Phone Number</label>
                                <input
                                    {...register('phone')}
                                    type="tel"
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1.5 text-foreground">Address</label>
                                <textarea
                                    {...register('address')}
                                    rows={3}
                                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-border">
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
                        >
                            <Save className="h-4 w-4" />
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
