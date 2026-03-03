import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { User, Lock, Database, Bell } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'system'>('profile');
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');

  const profileForm = useForm({
    defaultValues: {
      name: profile?.name ?? '',
      avatar_url: profile?.avatar_url ?? '',
    },
  });

  const passwordForm = useForm({
    defaultValues: { new_password: '', confirm_password: '' },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: { name: string; avatar_url?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ name: values.name, avatar_url: values.avatar_url })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    },
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
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'system', label: 'System', icon: Database },
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
                  {(profile?.name ?? 'U')[0].toUpperCase()}
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
                <input {...profileForm.register('name')} className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Avatar URL</label>
                <input {...profileForm.register('avatar_url')} placeholder="https://..." className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>

              <div className="flex items-center justify-between pt-2">
                {profileSaved && <span className="text-sm text-green-600">✓ Profile updated</span>}
                <div className="ml-auto">
                  <button type="submit" disabled={updateProfileMutation.isPending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60">
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
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
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input type="password" {...passwordForm.register('new_password', { required: true })} placeholder="Min. 8 characters" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <input type="password" {...passwordForm.register('confirm_password', { required: true })} placeholder="Repeat password" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              {pwError && <p className="text-sm text-destructive">{pwError}</p>}
              {pwSaved && <p className="text-sm text-green-600">✓ Password changed successfully</p>}
              <button type="submit" disabled={updatePasswordMutation.isPending} className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="max-w-xl space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Database className="h-4 w-4" /> Database Connection</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Supabase URL</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{import.meta.env.VITE_SUPABASE_URL ? '\u2713 Configured' : '\u2717 Missing'}</code>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Anon Key</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{import.meta.env.VITE_SUPABASE_ANON_KEY ? '\u2713 Configured' : '\u2717 Missing'}</code>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">Worker API</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{import.meta.env.VITE_API_BASE_URL ?? 'localhost:8787'}</code>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Bell className="h-4 w-4" /> Application Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">App Name</span>
                <span>The Marketing Solution</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Domain</span>
                <span>hellotms.com.bd</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Admin Panel</span>
                <span>admin.hellotms.com.bd</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">Currency</span>
                <span>BDT (৳)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
