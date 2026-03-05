import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Plus, Save, Trash2, Globe, Phone, Mail, LayoutDashboard } from 'lucide-react';
import { toast } from '@/components/Toast';
import { useForm, useFieldArray } from 'react-hook-form';
import type { SiteSettings } from '@hellotms/shared';
import { mediaApi, auditApi } from '@/lib/api';
import { ImageUpload } from '@/components/ImageUpload';

type CmsFormValues = {
  hero_title: string;
  site_motto: string;
  hero_subtitle: string;
  about_text: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  whatsapp_number: string;
  cta_label: string;
  cta_url: string;
  company_logo_url: string;
  services: { title: string; description: string; icon: string }[];
};

export default function CmsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'services' | 'contact'>('general');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const newServiceForm = useForm({ defaultValues: { title: '', description: '', icon: '' } });

  const form = useForm<CmsFormValues>({
    defaultValues: {
      hero_title: '',
      site_motto: '',
      hero_subtitle: '',
      about_text: '',
      contact_phone: '', contact_email: '', contact_address: '',
      facebook_url: '', instagram_url: '', youtube_url: '', whatsapp_number: '',
      cta_label: '',
      cta_url: '',
      company_logo_url: '',
      services: [],
    },
  });

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({ control: form.control, name: 'services' });

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as SiteSettings;
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        hero_title: settings.hero_title ?? '',
        site_motto: settings.site_motto ?? '',
        hero_subtitle: settings.hero_subtitle ?? '',
        about_text: settings.about_content ?? '',
        contact_phone: (settings.contact_info as { phone?: string })?.phone ?? '',
        contact_email: (settings.contact_info as { email?: string })?.email ?? '',
        contact_address: (settings.contact_info as { address?: string })?.address ?? '',
        facebook_url: settings.socials?.facebook ?? '',
        instagram_url: settings.socials?.instagram ?? '',
        youtube_url: settings.socials?.youtube ?? '',
        whatsapp_number: settings.whatsapp ?? '',
        cta_label: settings.hero_cta_primary_label ?? '',
        cta_url: settings.hero_cta_primary_url ?? '',
        company_logo_url: settings.company_logo_url ?? '',
        services: (settings.services ?? []).map((s) => ({
          title: (s as { title?: string; name?: string }).title ?? (s as { name?: string }).name ?? '',
          description: (s as { description?: string }).description ?? '',
          icon: (s as { icon?: string }).icon ?? '',
        })),
      });
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: CmsFormValues) => {
      const payload = {
        hero_title: values.hero_title,
        site_motto: values.site_motto,
        hero_subtitle: values.hero_subtitle,
        about_content: values.about_text,
        hero_cta_primary_label: values.cta_label,
        hero_cta_primary_url: values.cta_url,
        whatsapp: values.whatsapp_number,
        services: values.services,
        contact_info: {
          phone: values.contact_phone,
          email: values.contact_email,
          address: values.contact_address,
        },
        socials: {
          facebook: values.facebook_url,
          instagram: values.instagram_url,
          youtube: values.youtube_url,
        },
        company_logo_url: await mediaApi.uploadAndCleanMedia(
          values.company_logo_url,
          settings?.company_logo_url,
          'cms',
          'logo',
          'company_logo'
        ),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('site_settings').update(payload).eq('id', 1);
      if (error) throw error;

      auditApi.log({
        action: 'update_cms_content',
        entity_type: 'site_settings',
        entity_id: '1',
        after: payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setIsEditing(false);
      toast('Website content updated successfully!', 'success');
    },
    onError: (e: Error) => {
      toast(e.message || 'Failed to save changes', 'error');
    },
  });

  const TABS = [
    { id: 'general', label: 'General', icon: LayoutDashboard },
    { id: 'services', label: 'Services', icon: Globe },
    { id: 'contact', label: 'Contact & Social', icon: Phone },
  ] as const;

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div>
      <PageHeader
        title="Website CMS"
        description="Manage public website content"
        actions={
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 border border-border bg-card px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                Edit Website Content
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    form.reset();
                  }}
                  className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={form.handleSubmit((v) => saveMutation.mutate(v))}
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Tabs */}
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

      <form className="space-y-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 pb-6 border-b border-border mb-2">
              <div className="w-32 h-32 shrink-0">
                <ImageUpload
                  label="Company Logo"
                  value={form.watch('company_logo_url')}
                  onChange={(val) => form.setValue('company_logo_url', val as string, { shouldDirty: true })}
                  disabled={!isEditing}
                  aspect={1}
                />
              </div>
              <div className="flex-1 space-y-4 pt-1">
                <h3 className="font-semibold text-lg">Identity & Branding</h3>
                <p className="text-sm text-muted-foreground">Upload your company logo and define your primary site motto. This logo appears in the admin sidebar and header.</p>
              </div>
            </div>

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Hero Section</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Hero Title</label>
              <input {...form.register('hero_title')} disabled={!isEditing} placeholder="Capture Every Moment" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site Motto (Tagline)</label>
              <input {...form.register('site_motto')} disabled={!isEditing} placeholder="Creative Solution for Your Business" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hero Subtitle</label>
              <textarea {...form.register('hero_subtitle')} disabled={!isEditing} rows={2} placeholder="Professional event photography and management..." className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none disabled:bg-muted/30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">CTA Button Label</label>
                <input {...form.register('cta_label')} disabled={!isEditing} placeholder="Get a Quote" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CTA Button URL</label>
                <input {...form.register('cta_url')} disabled={!isEditing} placeholder="/contact" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
              </div>
            </div>

            <hr className="border-border" />
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">About Section</h3>
            <div>
              <label className="block text-sm font-medium mb-1">About Text</label>
              <textarea {...form.register('about_text')} disabled={!isEditing} rows={5} placeholder="Write about your company..." className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none disabled:bg-muted/30" />
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold">Services</h3>
              <button type="button" onClick={() => setIsAddingService(true)} disabled={!isEditing} className="flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline">
                <Plus className="h-3 w-3" /> Add Service
              </button>
            </div>
            <div className="divide-y divide-border">
              {serviceFields.map((field, i) => (
                <div key={field.id} className="p-4 grid grid-cols-[1fr_1fr_auto_auto] gap-4 items-start">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Title</label>
                    <input {...form.register(`services.${i}.title`)} disabled={!isEditing} className="w-full border border-border rounded px-2 py-1.5 text-sm disabled:bg-muted/30" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Description</label>
                    <input {...form.register(`services.${i}.description`)} disabled={!isEditing} className="w-full border border-border rounded px-2 py-1.5 text-sm disabled:bg-muted/30" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Icon / Emoji</label>
                    <input {...form.register(`services.${i}.icon`)} disabled={!isEditing} placeholder="📸" className="w-16 border border-border rounded px-2 py-1.5 text-sm text-center disabled:bg-muted/30" />
                  </div>
                  <div className="pt-5">
                    <button type="button" onClick={() => setDeleteIdx(i)} disabled={!isEditing} className="text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {serviceFields.length === 0 && (
                <div className="py-10 text-center text-muted-foreground text-sm">No services yet. Add your first service.</div>
              )}
            </div>
          </div>
        )}

        {/* Contact & Social Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <div className="relative"><Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input {...form.register('contact_phone')} disabled={!isEditing} placeholder="+880 1XXX XXXXXX" className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm disabled:bg-muted/30" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                  <input {...form.register('whatsapp_number')} disabled={!isEditing} placeholder="+88017XXXXXXXX" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <div className="relative"><Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input {...form.register('contact_email')} disabled={!isEditing} placeholder="hello@hellotms.com.bd" className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm disabled:bg-muted/30" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input {...form.register('contact_address')} disabled={!isEditing} placeholder="Dhaka, Bangladesh" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Social Profiles</h3>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: 'Facebook URL', field: 'facebook_url' as const, placeholder: 'https://facebook.com/hellotms' },
                  { label: 'Instagram URL', field: 'instagram_url' as const, placeholder: 'https://instagram.com/hellotms' },
                  { label: 'YouTube URL', field: 'youtube_url' as const, placeholder: 'https://youtube.com/@hellotms' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    <input {...form.register(field)} disabled={!isEditing} placeholder={placeholder} className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Add Service Modal */}
      <Modal isOpen={isAddingService} onClose={() => setIsAddingService(false)} title="Add Service">
        <form onSubmit={newServiceForm.handleSubmit((v) => { appendService(v); setIsAddingService(false); newServiceForm.reset(); })} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service Title *</label>
            <input {...newServiceForm.register('title', { required: true })} placeholder="e.g. Wedding Photography" className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea {...newServiceForm.register('description')} rows={2} placeholder="Short description..." className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Icon / Emoji</label>
            <input {...newServiceForm.register('icon')} placeholder="📷" className="w-20 border border-border rounded-lg px-3 py-2 text-sm text-center" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAddingService(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90">Add Service</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteIdx !== null}
        onClose={() => setDeleteIdx(null)}
        onConfirm={() => { if (deleteIdx !== null) { removeService(deleteIdx); setDeleteIdx(null); } }}
        title="Remove Service"
        message="Remove this service from the website? (Save changes to apply.)"
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
