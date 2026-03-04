import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { User, Lock, Database, Bell, Sliders } from 'lucide-react';
import { toast } from '@/components/Toast';
import { ImageUpload } from '@/components/ImageUpload';
import { getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'system' | 'invoice'>('profile');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
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
    mutationFn: async (values: { name: string; avatar_url?: string; phone?: string; address?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ name: values.name, avatar_url: values.avatar_url, phone: values.phone, address: values.address })
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
    mutationFn: async (payload: { url?: string; top?: number; bottom?: number }) => {
      const updateData: any = {};
      if (payload.url !== undefined) updateData.invoice_pad_url = payload.url;
      if (payload.top !== undefined) updateData.pad_margin_top = payload.top;
      if (payload.bottom !== undefined) updateData.pad_margin_bottom = payload.bottom;

      const { error } = await supabase.from('site_settings').update(updateData).eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchSettings();
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
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'invoice', label: 'Invoice Pad', icon: Sliders },
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
                    currentUrl={profileForm.watch('avatar_url')}
                    onUploaded={(url) => profileForm.setValue('avatar_url', url, { shouldDirty: true })}
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
              {pwSaved && <p className="text-sm text-green-600">✓ Password changed successfully</p>}
              <button type="submit" disabled={updatePasswordMutation.isPending} className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Invoice settings Tab */}
      {activeTab === 'invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Sliders className="h-4 w-4" /> Invoice Pad Config</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Upload your pre-printed pad background (Header/Footer included) and set margins for the invoice content.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Pad Background Image</label>
                  <ImageUpload
                    currentUrl={siteSettings?.invoice_pad_url || null}
                    onUploaded={(url) => updatePadMutation.mutate({ url })}
                    label=""
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Recommended: A4 portrait (2480 x 3508 px). The white area is where content will be printed.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <label className="block text-sm font-medium mb-1">Top Margin (px)</label>
                    <input
                      type="number"
                      value={padMarginTop}
                      onChange={(e) => setPadMarginTop(Number(e.target.value))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bottom Margin (px)</label>
                    <input
                      type="number"
                      value={padMarginBottom}
                      onChange={(e) => setPadMarginBottom(Number(e.target.value))}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <button
                  onClick={() => updatePadMutation.mutate({ top: padMarginTop, bottom: padMarginBottom })}
                  disabled={updatePadMutation.isPending}
                  className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  {updatePadMutation.isPending ? 'Updating...' : 'Save Margin Settings'}
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <Bell className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="text-xs text-amber-700 space-y-1">
                <p className="font-bold uppercase">Pro Tip</p>
                <p>The margins prevent your content from overlapping with pre-printed headers and footers on your real pad.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">Live Preview (Demo Data)</h3>
            <div className="bg-muted border border-border rounded-xl p-4 flex justify-center overflow-hidden">
              {/* Scaled A4 Preview */}
              <div className="relative bg-white shadow-2xl origin-top" style={{ width: '350px', height: '495px', minWidth: '350px' }}>
                {siteSettings?.invoice_pad_url && (
                  <img src={siteSettings.invoice_pad_url} className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-100" />
                )}

                {/* Content Area within margins */}
                <div
                  className="absolute inset-x-0 bg-primary/5 border-y border-dashed border-primary/20 flex flex-col pointer-events-none"
                  style={{
                    top: `${(padMarginTop / 3508) * 100}%`,
                    bottom: `${(padMarginBottom / 3508) * 100}%`
                  }}
                >
                  <div className="p-4 space-y-4 opacity-40 grayscale translate-y-2">
                    <div className="flex justify-between items-start">
                      <div className="h-6 w-20 bg-gray-300 rounded" />
                      <div className="text-[6px] text-right space-y-0.5">
                        <div className="h-2 w-16 bg-gray-200 ml-auto rounded" />
                        <div className="h-2 w-12 bg-gray-100 ml-auto rounded" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 bg-gray-300 rounded" />
                      <div className="h-2 w-48 bg-gray-200 rounded" />
                    </div>
                    <div className="border border-gray-200 rounded overflow-hidden">
                      <div className="bg-gray-50 h-3 border-b border-gray-100" />
                      <div className="p-1 space-y-1">
                        <div className="h-2 w-full bg-gray-100 rounded" />
                        <div className="h-2 w-full bg-gray-100 rounded" />
                        <div className="h-2 w-2/3 bg-gray-100 rounded" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <div className="h-4 w-16 bg-primary/20 rounded" />
                    </div>
                  </div>
                  {/* Helper text for margins */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-[10px] font-bold text-primary/40 rotate-12 border border-primary/20 px-2 py-1 rounded">INVOICE CONTENT AREA</p>
                  </div>
                </div>

                {/* Margin labels */}
                <div className="absolute top-0 right-0 p-1">
                  <span className="text-[8px] bg-primary text-white px-1 py-0.5 rounded">Top: {padMarginTop}px</span>
                </div>
                <div className="absolute bottom-0 right-0 p-1">
                  <span className="text-[8px] bg-primary text-white px-1 py-0.5 rounded">Bottom: {padMarginBottom}px</span>
                </div>
              </div>
            </div>
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
