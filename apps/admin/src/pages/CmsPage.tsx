import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Modal, ConfirmModal } from '@/components/Modal';
import { Plus, Save, Trash2, Globe, Phone, Mail, LayoutDashboard, Sliders, Database, Bell } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'general' | 'services' | 'contact' | 'invoice' | 'system'>('general');
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingSystem, setIsEditingSystem] = useState(false);
  const [isEditingInvoice, setIsEditingInvoice] = useState(false);
  const [isAddingService, setIsAddingService] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [padMarginTop, setPadMarginTop] = useState(150);
  const [padMarginBottom, setPadMarginBottom] = useState(100);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
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
      setPadMarginTop(settings.pad_margin_top ?? 150);
      setPadMarginBottom(settings.pad_margin_bottom ?? 100);
      setPublicUrl(settings.public_site_url ?? '');
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
    mutationFn: async (values: Partial<CmsFormValues>) => {
      const payload: any = {};

      if (values.hero_title !== undefined) payload.hero_title = values.hero_title;
      if (values.site_motto !== undefined) payload.site_motto = values.site_motto;
      if (values.hero_subtitle !== undefined) payload.hero_subtitle = values.hero_subtitle;
      if (values.about_text !== undefined) payload.about_content = values.about_text;
      if (values.cta_label !== undefined) payload.hero_cta_primary_label = values.cta_label;
      if (values.cta_url !== undefined) payload.hero_cta_primary_url = values.cta_url;
      if (values.whatsapp_number !== undefined) payload.whatsapp = values.whatsapp_number;
      if (values.services !== undefined) payload.services = values.services;

      if (values.contact_phone !== undefined || values.contact_email !== undefined || values.contact_address !== undefined) {
        payload.contact_info = {
          phone: values.contact_phone ?? (settings?.contact_info as any)?.phone,
          email: values.contact_email ?? (settings?.contact_info as any)?.email,
          address: values.contact_address ?? (settings?.contact_info as any)?.address,
        };
      }

      if (values.facebook_url !== undefined || values.instagram_url !== undefined || values.youtube_url !== undefined) {
        payload.socials = {
          facebook: values.facebook_url ?? settings?.socials?.facebook,
          instagram: values.instagram_url ?? settings?.socials?.instagram,
          youtube: values.youtube_url ?? settings?.socials?.youtube,
        };
      }

      if (values.company_logo_url !== undefined) {
        payload.company_logo_url = await mediaApi.uploadAndCleanMedia(
          values.company_logo_url,
          settings?.company_logo_url,
          'cms',
          'logo',
          'company_logo'
        );
      }

      payload.updated_at = new Date().toISOString();
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
      setIsEditingGeneral(false);
      setIsEditingServices(false);
      setIsEditingContact(false);
      toast('Website content updated successfully!', 'success');
    },
    onError: (e: Error) => {
      toast(e.message || 'Failed to save changes', 'error');
    },
  });

  const updatePadMutation = useMutation({
    mutationFn: async (payload: { url?: string | File | null; top?: number; bottom?: number }) => {
      const updateData: any = {};

      if (payload.url !== undefined) {
        updateData.invoice_pad_url = await mediaApi.uploadAndCleanMedia(
          payload.url,
          settings?.invoice_pad_url,
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
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setIsEditingInvoice(false);
      toast('Invoice Pad settings updated!', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const updatePublicUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase.from('site_settings').update({ public_site_url: url }).eq('id', 1);
      if (error) throw error;

      auditApi.log({
        action: 'update_public_site_url',
        entity_type: 'site_settings',
        entity_id: '1',
        after: { public_site_url: url }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      queryClient.invalidateQueries({ queryKey: ['site-settings-layout'] });
      setIsEditingSystem(false);
      toast('Public site URL updated!', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const TABS = [
    { id: 'general', label: 'General', icon: LayoutDashboard },
    { id: 'services', label: 'Services', icon: Globe },
    { id: 'contact', label: 'Contact & Social', icon: Phone },
    { id: 'invoice', label: 'Invoice Pad', icon: Sliders },
    { id: 'system', label: 'System Settings', icon: Database },
  ] as const;

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div>
      <PageHeader
        title="Core Settings"
        description="Manage system configurations and website content"
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">General Content</h3>
              <div className="flex gap-2">
                {!isEditingGeneral ? (
                  <button type="button" onClick={() => setIsEditingGeneral(true)} className="text-sm text-primary hover:underline">Edit</button>
                ) : (
                  <>
                    <button type="button" onClick={() => { setIsEditingGeneral(false); form.reset(); }} className="text-sm text-muted-foreground hover:underline">Cancel</button>
                    <button type="button" onClick={form.handleSubmit((v) => saveMutation.mutate(v))} className="text-sm text-primary font-bold hover:underline disabled:opacity-50">Save</button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 pb-6 border-b border-border">
              <div className="w-32 h-32 shrink-0">
                <ImageUpload
                  label="Company Logo"
                  value={form.watch('company_logo_url')}
                  onChange={(val) => form.setValue('company_logo_url', val as string, { shouldDirty: true })}
                  disabled={!isEditingGeneral}
                  aspect={1}
                />
              </div>
              <div className="flex-1 space-y-4 pt-1">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Identity & Branding</h3>
                <p className="text-sm text-muted-foreground">Upload your company logo and define your primary site motto. This logo appears in the admin sidebar and header.</p>
              </div>
            </div>

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Hero Section</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Hero Title</label>
              <input {...form.register('hero_title')} disabled={!isEditingGeneral} placeholder="Capture Every Moment" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site Motto (Tagline)</label>
              <input {...form.register('site_motto')} disabled={!isEditingGeneral} placeholder="Creative Solution for Your Business" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hero Subtitle</label>
              <textarea {...form.register('hero_subtitle')} disabled={!isEditingGeneral} rows={2} placeholder="Professional event photography and management..." className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none disabled:bg-muted/30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">CTA Button Label</label>
                <input {...form.register('cta_label')} disabled={!isEditingGeneral} placeholder="Get a Quote" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CTA Button URL</label>
                <input {...form.register('cta_url')} disabled={!isEditingGeneral} placeholder="/contact" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
              </div>
            </div>

            <hr className="border-border" />
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">About Section</h3>
            <div>
              <label className="block text-sm font-medium mb-1">About Text</label>
              <textarea {...form.register('about_text')} disabled={!isEditingGeneral} rows={5} placeholder="Write about your company..." className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none disabled:bg-muted/30" />
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold">Services</h3>
              <div className="flex gap-4">
                {!isEditingServices ? (
                  <button type="button" onClick={() => setIsEditingServices(true)} className="text-sm text-primary hover:underline">Edit</button>
                ) : (
                  <>
                    <button type="button" onClick={() => { setIsEditingServices(false); form.reset(); }} className="text-sm text-muted-foreground hover:underline">Cancel</button>
                    <button type="button" onClick={() => setIsAddingService(true)} className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors">
                      <Plus className="h-3 w-3" /> Add New
                    </button>
                    <button type="button" onClick={form.handleSubmit((v) => saveMutation.mutate({ services: v.services }))} className="text-sm text-primary font-bold hover:underline disabled:opacity-50">Save</button>
                  </>
                )}
              </div>
            </div>
            <div className="divide-y divide-border">
              {serviceFields.map((field, i) => (
                <div key={field.id} className="p-4 grid grid-cols-[1fr_2fr_auto_auto] gap-4 items-start bg-card/50">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Title</label>
                    <input {...form.register(`services.${i}.title`)} disabled={!isEditingServices} className="w-full border border-border rounded px-2 py-1.5 text-sm disabled:bg-muted/30 bg-background" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Description</label>
                    <input {...form.register(`services.${i}.description`)} disabled={!isEditingServices} className="w-full border border-border rounded px-2 py-1.5 text-sm disabled:bg-muted/30 bg-background" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Icon</label>
                    <input {...form.register(`services.${i}.icon`)} disabled={!isEditingServices} placeholder="📸" className="w-16 border border-border rounded px-2 py-1.5 text-sm text-center disabled:bg-muted/30 bg-background" />
                  </div>
                  <div className="pt-5">
                    <button type="button" onClick={() => setDeleteIdx(i)} disabled={!isEditingServices} className="text-muted-foreground hover:text-destructive disabled:opacity-50 disabled:cursor-not-allowed">
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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Contact Information</h3>
                <div className="flex gap-2">
                  {!isEditingContact ? (
                    <button type="button" onClick={() => setIsEditingContact(true)} className="text-sm text-primary hover:underline">Edit</button>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setIsEditingContact(false); form.reset(); }} className="text-sm text-muted-foreground hover:underline">Cancel</button>
                      <button type="button" onClick={form.handleSubmit((v) => saveMutation.mutate(v))} className="text-sm text-primary font-bold hover:underline disabled:opacity-50">Save</button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <div className="relative"><Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input {...form.register('contact_phone')} disabled={!isEditingContact} placeholder="+880 1XXX XXXXXX" className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm disabled:bg-muted/30" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
                  <input {...form.register('whatsapp_number')} disabled={!isEditingContact} placeholder="+88017XXXXXXXX" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email Address</label>
                  <div className="relative"><Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input {...form.register('contact_email')} disabled={!isEditingContact} placeholder="hello@hellotms.com.bd" className="w-full border border-border rounded-lg pl-9 pr-3 py-2 text-sm disabled:bg-muted/30" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input {...form.register('contact_address')} disabled={!isEditingContact} placeholder="Dhaka, Bangladesh" className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
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
                    <input {...form.register(field)} disabled={!isEditingContact} placeholder={placeholder} className="w-full border border-border rounded-lg px-3 py-2 text-sm disabled:bg-muted/30" />
                  </div>
                ))}
              </div>
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
                      value={settings?.invoice_pad_url || null}
                      onChange={(val) => updatePadMutation.mutate({ url: val, top: padMarginTop, bottom: padMarginBottom })}
                      label=""
                      disabled={!isEditingInvoice}
                      aspect={210 / 297}
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
                        disabled={!isEditingInvoice}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Bottom Margin (px)</label>
                      <input
                        type="number"
                        value={padMarginBottom}
                        onChange={(e) => setPadMarginBottom(Number(e.target.value))}
                        disabled={!isEditingInvoice}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted/30"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    {!isEditingInvoice ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingInvoice(true)}
                        className="w-full py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Edit Configuration
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingInvoice(false);
                            if (settings) {
                              setPadMarginTop(settings.pad_margin_top ?? 150);
                              setPadMarginBottom(settings.pad_margin_bottom ?? 100);
                            }
                          }}
                          className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => updatePadMutation.mutate({ top: padMarginTop, bottom: padMarginBottom })}
                          disabled={updatePadMutation.isPending}
                          className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                          {updatePadMutation.isPending ? 'Saving...' : 'Save Settings'}
                        </button>
                      </>
                    )}
                  </div>
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
              <div className="bg-muted border border-border rounded-xl p-8 flex justify-center overflow-hidden">
                <div className="relative bg-white shadow-2xl overflow-hidden border border-border" style={{ width: '300px', height: '424px', minWidth: '300px' }}>
                  {settings?.invoice_pad_url && (
                    <img
                      src={settings.invoice_pad_url}
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                      alt="Pad Preview"
                    />
                  )}

                  <div
                    className="absolute top-0 inset-x-0 bg-red-500/10 border-b border-dashed border-red-400/30 z-10"
                    style={{ height: `${(padMarginTop / 3508) * 100}%` }}
                  >
                    <div className="absolute top-1 right-1 bg-red-500 text-white text-[6px] px-1 rounded-sm">{padMarginTop}px</div>
                  </div>

                  <div
                    className="absolute bottom-0 inset-x-0 bg-red-500/10 border-t border-dashed border-red-400/30 z-10"
                    style={{ height: `${(padMarginBottom / 3508) * 100}%` }}
                  >
                    <div className="absolute bottom-1 right-1 bg-red-500 text-white text-[6px] px-1 rounded-sm">{padMarginBottom}px</div>
                  </div>

                  <div
                    className="absolute inset-x-0 flex flex-col pointer-events-none z-0"
                    style={{
                      top: `${(padMarginTop / 3508) * 100}%`,
                      bottom: `${(padMarginBottom / 3508) * 100}%`
                    }}
                  >
                    <div className="p-3 space-y-3 opacity-20 grayscale pointer-events-none">
                      <div className="h-2 w-10 bg-gray-400 rounded" />
                      <div className="h-1 w-full bg-gray-200 rounded" />
                      <div className="h-1 w-2/3 bg-gray-200 rounded" />
                    </div>
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
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{import.meta.env.VITE_SUPABASE_URL ? '\u2713' : '\u2717'}</code>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Anon Key</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{import.meta.env.VITE_SUPABASE_ANON_KEY ? '\u2713' : '\u2717'}</code>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">Worker API</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{import.meta.env.VITE_API_BASE_URL ?? 'localhost:8787'}</code>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Application Settings</h3>
                <div className="flex gap-2">
                  {!isEditingSystem ? (
                    <button type="button" onClick={() => setIsEditingSystem(true)} className="text-sm text-primary hover:underline">Edit</button>
                  ) : (
                    <>
                      <button type="button" onClick={() => { setIsEditingSystem(false); setPublicUrl(settings?.public_site_url ?? ''); }} className="text-sm text-muted-foreground hover:underline">Cancel</button>
                      <button type="button" onClick={() => updatePublicUrlMutation.mutate(publicUrl)} disabled={updatePublicUrlMutation.isPending} className="text-sm text-primary font-bold hover:underline">
                        {updatePublicUrlMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-4 text-sm">
                <div className="space-y-2 pt-2">
                  <label className="text-muted-foreground block text-xs">Public Site URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={publicUrl}
                      onChange={(e) => setPublicUrl(e.target.value)}
                      disabled={!isEditingSystem}
                      placeholder="https://hellotms.com.bd"
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted/30"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Global setting for the header globe icon.</p>
                </div>
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
