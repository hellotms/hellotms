import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mediaApi } from '@/lib/api';
import { toast } from '@/components/Toast';
import { ImageUpload } from '@/components/ImageUpload';
import { getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

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
    { id: 'profile', label: 'My Account Settings', icon: User },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Settings"
        description="Manage your personal profile and security"
      />

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6">Personal Information</h3>
                <form onSubmit={profileForm.handleSubmit((v) => updateProfileMutation.mutate(v))} className="space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b border-border">
                    {profileForm.watch('avatar_url') || profile?.avatar_url ? (
                      <img src={profileForm.watch('avatar_url') || profile?.avatar_url || ''} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-muted shadow-lg" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-black">
                        {getInitials(profile?.name ?? 'U')}
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Profile Photo</label>
                      <ImageUpload
                        value={profileForm.watch('avatar_url')}
                        onChange={(val) => profileForm.setValue('avatar_url', val as string, { shouldDirty: true })}
                        disabled={!isEditingProfile}
                        aspect={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Full Name <span className="text-red-500">*</span></label>
                      <input {...profileForm.register('name')} disabled={!isEditingProfile} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Address</label>
                      <input value={user?.email} disabled className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Mobile No.</label>
                      <input {...profileForm.register('phone')} disabled={!isEditingProfile} placeholder="+8801..." className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Address</label>
                      <input {...profileForm.register('address')} disabled={!isEditingProfile} placeholder="Dhaka, Bangladesh" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    {!isEditingProfile ? (
                      <button type="button" onClick={() => setIsEditingProfile(true)} className="px-6 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-bold transition-all">Edit Profile</button>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setIsEditingProfile(false); profileForm.reset(); }} className="px-6 py-2 border border-border rounded-lg text-sm font-bold hover:bg-muted transition-all">Cancel</button>
                        <button type="submit" disabled={updateProfileMutation.isPending} className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-60 transition-all">{updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}</button>
                      </>
                    )}
                  </div>
                </form>
              </section>
            </div>

            <div className="space-y-6">
              <section className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-bold mb-6">Security</h3>
                <form onSubmit={passwordForm.handleSubmit((v) => updatePasswordMutation.mutate(v))} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Current Password <span className="text-red-500">*</span></label>
                    <input type="password" {...passwordForm.register('current_password', { required: true })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">New Password <span className="text-red-500">*</span></label>
                    <input type="password" {...passwordForm.register('new_password', { required: true })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Confirm New Password <span className="text-red-500">*</span></label>
                    <input type="password" {...passwordForm.register('confirm_password', { required: true })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                  </div>
                  {pwError && <p className="text-xs text-destructive font-bold">{pwError}</p>}
                  {pwSaved && <p className="text-xs text-green-600 font-bold">✓ Password changed successfully</p>}
                  <button type="submit" disabled={updatePasswordMutation.isPending} className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-60 transition-all">
                    {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
