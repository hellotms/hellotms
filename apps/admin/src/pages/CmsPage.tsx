import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { mediaApi, auditApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ImageUpload } from '@/components/ImageUpload';
import { toast } from '@/components/Toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { cn } from '@/lib/utils';
import {
  Save, Globe, Phone, LayoutDashboard, Sliders, Database,
  Pencil, Users, ShieldCheck, ExternalLink, Check, Trash2, Plus, ArrowRight, Info, CircleDashed
} from 'lucide-react';
import type { SiteSettings } from '@hellotms/shared';
import { Link, useSearchParams } from 'react-router-dom';

export default function CmsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'general' | 'cms' | 'admin') || 'general';

  const setActiveTab = (tab: 'general' | 'cms' | 'admin') => {
    setSearchParams({ tab });
  };

  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<any>({ defaultValues: { services: [] } });
  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({ control: form.control, name: 'services' });

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
      if (error) throw error;
      return data as SiteSettings;
    }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        hero_title: settings.hero_title ?? '',
        site_motto: settings.site_motto ?? '',
        hero_subtitle: settings.hero_subtitle ?? '',
        about_content: settings.about_content ?? '',
        contact_phone: (settings.contact_info as any)?.phone ?? '',
        contact_email: (settings.contact_info as any)?.email ?? '',
        contact_address: (settings.contact_info as any)?.address ?? '',
        facebook_url: settings.socials?.facebook ?? '',
        instagram_url: settings.socials?.instagram ?? '',
        youtube_url: settings.socials?.youtube ?? '',
        whatsapp: settings.whatsapp ?? '',
        hero_cta_primary_label: settings.hero_cta_primary_label ?? '',
        hero_cta_primary_url: settings.hero_cta_primary_url ?? '',
        company_logo_url: settings.company_logo_url ?? '',
        public_site_url: settings.public_site_url ?? '',
        invoice_pad_url: settings.invoice_pad_url ?? '',
        pad_margin_top: settings.pad_margin_top ?? 150,
        pad_margin_bottom: settings.pad_margin_bottom ?? 100,
        services: (settings.services ?? []).map((s: any) => ({
          title: s.title ?? s.name ?? '',
          description: s.description ?? '',
          icon: s.icon ?? '✨'
        }))
      });
    }
  }, [settings, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload: any = { ...values };
      if (values.company_logo_url && values.company_logo_url !== settings?.company_logo_url) {
        payload.company_logo_url = await mediaApi.uploadAndCleanMedia(values.company_logo_url, settings?.company_logo_url, 'cms', 'logo', 'company_logo');
      }
      if (values.invoice_pad_url && values.invoice_pad_url !== settings?.invoice_pad_url) {
        payload.invoice_pad_url = await mediaApi.uploadAndCleanMedia(values.invoice_pad_url, settings?.invoice_pad_url, 'cms', 'pad', 'invoice_pad');
      }
      payload.contact_info = { phone: values.contact_phone, email: values.contact_email, address: values.contact_address };
      payload.socials = { facebook: values.facebook_url, instagram: values.instagram_url, youtube: values.youtube_url };
      delete payload.contact_phone; delete payload.contact_email; delete payload.contact_address;
      delete payload.facebook_url; delete payload.instagram_url; delete payload.youtube_url;
      const { error } = await supabase.from('site_settings').update(payload).eq('id', 1);
      if (error) throw error;
    },
    onSuccess: (data: any, vars: any) => {
      auditApi.log({ action: 'update_settings', entity_type: 'settings', entity_id: '1', after: vars });
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
      setIsEditing(false);
      toast('Settings updated!', 'success');
    },
    onError: (e: any) => toast(e.message, 'error')
  });

  if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><CircleDashed className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto px-4">
      <PageHeader title="Core Settings" description="Global platform configurations and administrative controls" />

      {/* 3-Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-card border border-border rounded-xl shadow-sm w-fit">
        {[
          { id: 'general', label: 'General Setting', icon: LayoutDashboard },
          { id: 'cms', label: 'CMS Setting', icon: Globe },
          { id: 'admin', label: 'Admin Setting', icon: Sliders },
        ].map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setIsEditing(false); }} className={cn("flex items-center gap-2 px-6 py-2.5 text-xs font-black rounded-lg transition-all tracking-wider uppercase", activeTab === tab.id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
          <h2 className="font-bold text-xl text-foreground flex items-center gap-2">
            {activeTab === 'general' ? 'General' : activeTab === 'cms' ? 'Content Management System' : 'Administrative'} Configurations
          </h2>
          <div className="flex gap-2">
            {activeTab !== 'cms' && (
              !isEditing ? (
                <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-primary/10 text-primary text-xs font-black rounded-xl hover:bg-primary/20 flex items-center gap-2 uppercase tracking-widest"><Pencil className="h-3.5 w-3.5" /> Edit Section</button>
              ) : (
                <>
                  <button onClick={() => { setIsEditing(false); form.reset(); }} className="px-4 py-2 text-xs font-bold hover:bg-muted rounded-xl">Cancel</button>
                  <button onClick={form.handleSubmit(v => saveMutation.mutate(v))} disabled={saveMutation.isPending} className="px-5 py-2 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:opacity-90 shadow-lg shadow-primary/10 flex items-center gap-2 uppercase tracking-widest">{saveMutation.isPending ? <CircleDashed className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Changes</button>
                </>
              )
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm min-h-[500px]">
          {/* ──────────────────────────────────────────────────────────── */}
          {/* GENERAL TAB */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className="space-y-12">
              {/* Branding & Hero */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="bg-muted/30 p-5 rounded-2xl border border-border/50">
                    <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">Brand Identity</h3>
                    <ImageUpload label="Company Logo" value={form.watch('company_logo_url')} onChange={v => form.setValue('company_logo_url', v)} disabled={!isEditing} aspect={1} />
                    <div className="mt-4"><label className="text-[10px] font-black mb-1 block uppercase">Site Motto</label><input {...form.register('site_motto')} disabled={!isEditing} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" /></div>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="text-sm font-bold">Homepage Hero Title</label><input {...form.register('hero_title')} disabled={!isEditing} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" /></div>
                  <div className="space-y-2"><label className="text-sm font-bold">Primary CTA Action Label</label><input {...form.register('hero_cta_primary_label')} disabled={!isEditing} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" /></div>
                  <div className="sm:col-span-2 space-y-2"><label className="text-sm font-bold">Hero Subtitle / Description</label><textarea {...form.register('hero_subtitle')} disabled={!isEditing} rows={2} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm resize-none" /></div>
                  <div className="sm:col-span-2 space-y-2 pt-4 border-t border-border mt-4"><label className="text-sm font-bold">About Our Story (Brief)</label><textarea {...form.register('about_content')} disabled={!isEditing} rows={4} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm resize-none" /></div>
                </div>
              </div>

              {/* Core Services */}
              <div className="pt-8 border-t border-border space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Core Services</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-1">These populate the 3-column features grid on the landing page.</p>
                  </div>
                  {isEditing && <button onClick={() => appendService({ title: 'New Service', description: '', icon: '✨' })} className="flex items-center gap-2 text-[10px] font-black bg-primary/10 text-primary px-4 py-2 rounded-xl uppercase tracking-widest transition-all hover:bg-primary/20"><Plus className="h-3 w-3" /> Add Service</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {serviceFields.map((f, i) => (
                    <div key={f.id} className="bg-muted/20 border border-border p-5 rounded-3xl relative group transition-all hover:bg-muted/40">
                      <div className="flex gap-4 p-2">
                        <input {...form.register(`services.${i}.icon`)} disabled={!isEditing} className="w-12 h-12 bg-background border border-border shadow-sm rounded-2xl text-center text-2xl outline-none" />
                        <div className="flex-1 space-y-2">
                          <input {...form.register(`services.${i}.title`)} disabled={!isEditing} placeholder="Service Title" className="w-full bg-transparent border-none p-0 text-sm font-black outline-none" />
                          <textarea {...form.register(`services.${i}.description`)} disabled={!isEditing} placeholder="Short description..." rows={2} className="w-full bg-transparent border-none p-0 text-xs text-muted-foreground outline-none resize-none" />
                        </div>
                        {isEditing && <button onClick={() => removeService(i)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information & Socials */}
              <div className="pt-8 border-t border-border grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border pb-3 flex items-center gap-2"><Phone className="h-3 w-3 mb-0.5" /> Official Contact Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-xs font-bold text-muted-foreground">Emergency / Direct Phone</label><input {...form.register('contact_phone')} disabled={!isEditing} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-muted-foreground">WhatsApp Connect</label><input {...form.register('whatsapp')} disabled={!isEditing} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" /></div>
                    <div className="sm:col-span-2 space-y-2"><label className="text-xs font-bold text-muted-foreground">Public Email Address</label><input {...form.register('contact_email')} disabled={!isEditing} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm" /></div>
                    <div className="sm:col-span-2 space-y-2"><label className="text-xs font-bold text-muted-foreground">Headquarters Address</label><textarea {...form.register('contact_address')} disabled={!isEditing} rows={2} className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm resize-none" /></div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest border-b border-border pb-3 flex items-center gap-2"><Globe className="h-3 w-3 mb-0.5" /> Social Presence Channels</h3>
                  <div className="space-y-4">
                    {['Facebook', 'Instagram', 'YouTube'].map((s: any) => (
                      <div key={s} className="space-y-1.5 p-1 bg-muted/10 border border-border/50 rounded-2xl px-4 py-3">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{s} URL</label>
                        <input {...form.register(`${s.toLowerCase()}_url` as any)} disabled={!isEditing} className="w-full bg-transparent border-none p-0 text-sm font-medium outline-none" placeholder={`https://${s.toLowerCase()}.com/...`} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* CMS TAB */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === 'cms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link to="/cms/about" className="group p-6 bg-gradient-to-br from-card to-muted/20 border border-border rounded-3xl hover:border-primary/40 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><Globe className="h-6 w-6" /></div>
                <h3 className="text-xl font-black text-foreground mb-2 leading-tight">About Page<br />Builder</h3>
                <p className="text-xs text-muted-foreground font-medium mb-6">Visually edit the company story, core values, history timeline, and mission statements.</p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">Enter Builder <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" /></div>
              </Link>

              {/* Placeholders for future CMS pages */}
              <div className="p-6 bg-card border border-border border-dashed rounded-3xl opacity-50 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-4"><LayoutDashboard className="h-6 w-6" /></div>
                <h3 className="text-sm font-black text-foreground mb-1">Services Page</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Coming Soon</p>
              </div>

              <div className="p-6 bg-card border border-border border-dashed rounded-3xl opacity-50 flex flex-col items-center justify-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-4"><Database className="h-6 w-6" /></div>
                <h3 className="text-sm font-black text-foreground mb-1">Portfolios Page</h3>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Coming Soon</p>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* ADMIN TAB */}
          {/* ──────────────────────────────────────────────────────────── */}
          {activeTab === 'admin' && (
            <div className="space-y-12">

              {/* Personnel Management Links */}
              <div>
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Organizational Control</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Link to="/staff-management" className="flex items-center gap-4 p-5 bg-card border border-border rounded-2xl hover:bg-muted/30 transition-all group">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><Users className="h-6 w-6" /></div>
                    <div>
                      <h4 className="font-black text-base text-foreground">Staff Management</h4>
                      <p className="text-[11px] font-medium text-muted-foreground">Manage accounts, resets, and status</p>
                    </div>
                  </Link>
                  <Link to="/role-management" className="flex items-center gap-4 p-5 bg-card border border-border rounded-2xl hover:bg-muted/30 transition-all group">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors"><ShieldCheck className="h-6 w-6" /></div>
                    <div>
                      <h4 className="font-black text-base text-foreground">Role Restrictions</h4>
                      <p className="text-[11px] font-medium text-muted-foreground">Define and assign security archetypes</p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Invoice Pad Configurations */}
              <div className="pt-8 border-t border-border">
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Financial Document Templates</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="bg-muted/30 p-6 rounded-3xl border border-border/50 space-y-6">
                      <ImageUpload label="Invoice Pad Template (A4 Background)" value={form.watch('invoice_pad_url')} onChange={v => form.setValue('invoice_pad_url', v)} disabled={!isEditing} aspect={210 / 297} />
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-background p-3 rounded-xl border border-border"><label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Top Safe Margin (px)</label><input type="number" {...form.register('pad_margin_top')} disabled={!isEditing} className="w-full bg-transparent border-none p-0 text-sm font-bold outline-none" /></div>
                        <div className="bg-background p-3 rounded-xl border border-border"><label className="text-[9px] font-black text-muted-foreground uppercase mb-1 block">Bottom Safe Margin</label><input type="number" {...form.register('pad_margin_bottom')} disabled={!isEditing} className="w-full bg-transparent border-none p-0 text-sm font-bold outline-none" /></div>
                      </div>
                    </div>
                    <div className="p-5 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex gap-4">
                      <Info className="h-5 w-5 text-blue-500 shrink-0" /><p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed font-medium">The margins define safe printing zones. Content outside these areas will be truncated to fit your uploaded pad's design.</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-6 tracking-widest">Live Rendering Preview</p>
                    <div className="relative w-[300px] h-[424px] bg-white dark:bg-[#111] shadow-2xl border border-border overflow-hidden rounded-sm ring-8 ring-muted/20">
                      {form.watch('invoice_pad_url') && <img src={form.watch('invoice_pad_url')} className="absolute inset-0 w-full h-full object-fill opacity-90" alt="Preview" />}
                      <div className="absolute top-0 inset-x-0 bg-red-500/15 border-b border-red-500/40 z-10 flex items-center justify-center font-black text-[9px] text-red-500" style={{ height: `${(form.watch('pad_margin_top') / 3508) * 100}%` }}>HEADER ({form.watch('pad_margin_top')}px)</div>
                      <div className="absolute bottom-0 inset-x-0 bg-red-500/15 border-t border-red-500/40 z-10 flex items-center justify-center font-black text-[9px] text-red-500" style={{ height: `${(form.watch('pad_margin_bottom') / 3508) * 100}%` }}>FOOTER ({form.watch('pad_margin_bottom')}px)</div>
                      <div className="flex-1 p-6 space-y-4 opacity-10 mt-12 grayscale select-none">
                        <div className="h-2 w-1/4 bg-foreground rounded-full" /><div className="space-y-2"><div className="h-1 w-full bg-foreground" /><div className="h-1 w-full bg-foreground" /><div className="h-1 w-5/6 bg-foreground" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Infrastructure */}
              <div className="pt-8 border-t border-border">
                <h3 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Infrastructure Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground p-1">Frontend Deployment URL</label>
                    <div className="flex gap-2">
                      <input {...form.register('public_site_url')} disabled={!isEditing} className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono outline-none" placeholder="https://..." />
                      <a href={form.watch('public_site_url')} target="_blank" className="p-3 bg-muted rounded-xl hover:bg-muted/80 transition-all border border-border flex items-center justify-center"><ExternalLink className="h-4 w-4" /></a>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground p-1">Cloud Native Services</label>
                    <div className="flex gap-4">
                      <div className="flex-1 p-3 bg-background rounded-xl border border-border flex flex-col gap-1 items-center justify-center"><span className="text-[9px] font-bold text-muted-foreground uppercase">Supabase SQL</span><span className="text-xs font-black text-green-500 flex items-center gap-1.5"><Check className="h-3 w-3" /> CONNECTED</span></div>
                      <div className="flex-1 p-3 bg-background rounded-xl border border-border flex flex-col gap-1 items-center justify-center"><span className="text-[9px] font-bold text-muted-foreground uppercase">Hono Worker API</span><span className="text-xs font-black text-green-500 flex items-center gap-1.5"><Check className="h-3 w-3" /> CONNECTED</span></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
