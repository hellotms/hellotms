import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { User, Lock, Database, Bell, Sliders } from 'lucide-react';
import { toast } from '@/components/Toast';
import { ImageUpload } from '@/components/ImageUpload';
import { getInitials } from '@/lib/utils';
import { mediaApi, auditApi } from '@/lib/api';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');
  const [padMarginTop, setPadMarginTop] = useState(150);
  const [padMarginBottom, setPadMarginBottom] = useState(100);

  const profileForm = useForm({
    defaultValues: {
      name: profile?.name ?? '',
      avatar_url: profile?.avatar_url ?? '',
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
    },
  });

  const passwordForm = useForm({
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: { name: string; avatar_url: string | File | null; phone?: string; address?: string }) => {
      // Handle potential image upload
      const finalAvatarUrl = await mediaApi.uploadAndCleanMedia(
        values.avatar_url,
        profile?.avatar_url,
        'profiles',
        'avatar',
        values.name
      );

      const { error } = await supabase
        .from('profiles')
        .update({ name: values.name, avatar_url: finalAvatarUrl, phone: values.phone, address: values.address })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      setIsEditingProfile(false);
      toast('Profile updated successfully!', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const updatePublicUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase.from('site_settings').update({ public_site_url: url }).eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings-layout'] });
      toast('Public site URL updated!', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const { data: siteSettings, refetch: refetchSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      if (data) {
        setPadMarginTop(data.pad_margin_top ?? 150);
        setPadMarginBottom(data.pad_margin_bottom ?? 100);
      }
      return data;
    },
  });

  const updatePadMutation = useMutation({
    mutationFn: async (payload: { url?: string | File | null; top?: number; bottom?: number }) => {
      const updateData: any = {};

      if (payload.url !== undefined) {
        updateData.invoice_pad_url = await mediaApi.uploadAndCleanMedia(
          payload.url,
          siteSettings?.invoice_pad_url,
          'site',
          'pad',
          'invoice-pad'
        );
      }

      if (payload.top !== undefined) updateData.pad_margin_top = payload.top;
      if (payload.bottom !== undefined) updateData.pad_margin_bottom = payload.bottom;

      const { error } = await supabase.from('site_settings').update(updateData).eq('id', 1);
      if (error) throw error;

      auditApi.log({
        action: 'update_invoice_pad_settings',
        entity_type: 'site_settings',
        entity_id: '1',
        after: updateData
      });
    },
    onSuccess: () => {
      refetchSettings();
      setIsEditingInvoice(false);
      toast('Invoice Pad settings updated!', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (values: { new_password: string; confirm_password: string }) => {
      if (values.new_password !== values.confirm_password) throw new Error('Passwords do not match');
      if (values.new_password.length < 8) throw new Error('Password must be at least 8 characters');
      const { error } = await supabase.auth.updateUser({ password: values.new_password });
      if (error) throw error;
    },
    onSuccess: () => {
      passwordForm.reset();
      setPwSaved(true);
      setPwError('');
      setTimeout(() => setPwSaved(false), 3000);
    },
    onError: (e: Error) => setPwError(e.message),
  });

  const TABS = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'password', label: 'Security', icon: Lock },
  ] as const;

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and application preferences" />

      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-xl">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                  {getInitials(profile?.name ?? 'U')}
                </div>
              )}
              <div>
                <p className="font-semibold">{profile?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={profileForm.handleSubmit((v) => updateProfileMutation.mutate(v))} className="space-y-4 pt-4 border-t border-border">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input {...profileForm.register('name')} disabled={!isEditingProfile} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted/30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Mobile No.</label>
                  <input {...profileForm.register('phone')} disabled={!isEditingProfile} placeholder="+8801..." className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input {...profileForm.register('address')} disabled={!isEditingProfile} placeholder="123 Dhaka, BD..." className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted/30" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Profile Photo</label>
                <div className="w-full max-w-sm">
                  <ImageUpload
                    value={profileForm.watch('avatar_url')}
                    onChange={(val) => profileForm.setValue('avatar_url', val as string, { shouldDirty: true })}
                    label=""
                    disabled={!isEditingProfile}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {!isEditingProfile ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        profileForm.reset();
                      }}
                      className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60"
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="max-w-md">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4">Change Password</h3>
            <form onSubmit={passwordForm.handleSubmit((v) => updatePasswordMutation.mutate(v))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <input type="password" {...passwordForm.register('current_password', { required: true })} placeholder="Verify identity" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input type="password" {...passwordForm.register('new_password', { required: true })} placeholder="Min. 8 characters" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <input type="password" {...passwordForm.register('confirm_password', { required: true })} placeholder="Repeat password" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              {pwError && <p className="text-sm text-destructive">{pwError}</p>}
              {pwSaved && <p className="text-sm text-green-600 text-green-600 dark:text-green-400">✓ Password changed successfully</p>}
              <button type="submit" disabled={updatePasswordMutation.isPending} className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
