import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { auditApi } from '@/lib/api';
import { toast } from '@/components/Toast';
import { Save, X, Edit2, Info, Sparkles, Plus, Trash2, ArrowLeft, Workflow, Target, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SiteSettings, ServicesPageConfig } from '@hellotms/shared';

const DEFAULT_CONFIG: ServicesPageConfig = {
    hero: {
        badge: 'What We Offer',
        title_primary: 'Our',
        title_highlight: 'Services',
        description: 'Comprehensive solutions for every event need — creative, strategic, and flawlessly executed from start to finish.'
    },
    services: [
        {
            icon: '🎪',
            title: 'Event Management',
            description: 'Full-scale event planning and execution for any size — from concept and design to day-of logistics and post-event reporting.',
            features: ['Venue sourcing & setup', 'Guest management', 'Vendor coordination', 'On-site execution team']
        }
    ],
    process: {
        badge: 'How It Works',
        title_primary: 'Our',
        title_highlight: 'Process',
        steps: [
            { step: '01', title: 'Discovery Call', text: 'We learn about your event, vision, and goals in a free consultation.' }
        ]
    },
    cta: {
        title_primary: 'Ready to get',
        title_highlight: 'started?',
        description: "Talk to our team and let's plan something extraordinary together.",
        button_label: 'Request a Quote',
        button_url: '/contact'
    }
};

export default function ServicesCmsPage() {
    const queryClient = useQueryClient();
    const [editingSection, setEditingSection] = useState<'hero' | 'services' | 'process' | 'cta' | null>(null);
    const [localConfig, setLocalConfig] = useState<ServicesPageConfig | null>(null);

    const { data: settings, isLoading } = useQuery<SiteSettings>({
        queryKey: ['site-settings'],
        queryFn: async () => {
            const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
            if (error) throw error;
            return data as SiteSettings;
        },
    });

    useEffect(() => {
        if (!isLoading) {
            if (settings?.services_page_config) {
                setLocalConfig(settings.services_page_config as ServicesPageConfig);
            } else {
                setLocalConfig(DEFAULT_CONFIG);
            }
        }
    }, [settings, isLoading]);

    const saveMutation = useMutation({
        mutationFn: async (newConfig: ServicesPageConfig) => {
            const { error } = await supabase.from('site_settings').update({ 
                services_page_config: newConfig, 
                updated_at: new Date().toISOString() 
            }).eq('id', 1);
            if (error) throw error;

            auditApi.log({
                action: 'update_services_cms_config',
                entity_type: 'site_settings',
                entity_id: '1',
                after: { services_page_config: newConfig }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['site-settings'] });
            setEditingSection(null);
            toast('Services page content updated!', 'success');
        },
        onError: (e: Error) => toast(e.message, 'error'),
    });

    if (isLoading || !localConfig) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

    const updateSection = (section: keyof ServicesPageConfig, data: any) => {
        setLocalConfig(prev => prev ? ({ ...prev, [section]: data }) : null);
    };

    const SectionHeader = ({ id, icon: Icon, title }: { id: any; icon: any; title: string }) => (
        <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wider">{title}</h3>
            </div>
            {editingSection === id ? (
                <div className="flex gap-2">
                    <button onClick={() => { setEditingSection(null); setLocalConfig(settings?.services_page_config as ServicesPageConfig); }} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"><X className="h-4 w-4" /></button>
                    <button onClick={() => saveMutation.mutate(localConfig)} disabled={saveMutation.isPending} className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"><Save className="h-4 w-4" /></button>
                </div>
            ) : (
                <button onClick={() => setEditingSection(id)} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
            )}
        </div>
    );

    return (
        <div className="space-y-6 max-w-5xl pb-20">
            <div className="flex items-center gap-3 mb-2">
                <Link to="/cms?tab=cms" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-black">Edit Services Page</h1>
            </div>

            {/* Hero Section */}
            <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <SectionHeader id="hero" icon={Info} title="Hero Section" />
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Badge</label>
                            <input value={localConfig.hero.badge} onChange={e => updateSection('hero', { ...localConfig.hero, badge: e.target.value })} disabled={editingSection !== 'hero'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Primary Title</label>
                            <input value={localConfig.hero.title_primary} onChange={e => updateSection('hero', { ...localConfig.hero, title_primary: e.target.value })} disabled={editingSection !== 'hero'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Highlight Title</label>
                            <input value={localConfig.hero.title_highlight} onChange={e => updateSection('hero', { ...localConfig.hero, title_highlight: e.target.value })} disabled={editingSection !== 'hero'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Hero Description</label>
                        <textarea value={localConfig.hero.description} onChange={e => updateSection('hero', { ...localConfig.hero, description: e.target.value })} disabled={editingSection !== 'hero'} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30 resize-none" />
                    </div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <SectionHeader id="services" icon={Sparkles} title="Our Services" />
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {localConfig.services.map((service, idx) => (
                            <div key={idx} className="p-5 bg-muted/20 border border-border rounded-xl space-y-4 relative group">
                                {editingSection === 'services' && (
                                    <button
                                        onClick={() => {
                                            const newS = localConfig.services.filter((_, i) => i !== idx);
                                            updateSection('services', newS);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <div className="flex gap-4">
                                    <div className="w-16 shrink-0">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Emoji</label>
                                        <input value={service.icon} onChange={e => {
                                            const newS = [...localConfig.services];
                                            newS[idx].icon = e.target.value;
                                            updateSection('services', newS);
                                        }} disabled={editingSection !== 'services'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xl text-center focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Service Title</label>
                                        <input value={service.title} onChange={e => {
                                            const newS = [...localConfig.services];
                                            newS[idx].title = e.target.value;
                                            updateSection('services', newS);
                                        }} disabled={editingSection !== 'services'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Description</label>
                                    <textarea value={service.description} onChange={e => {
                                        const newS = [...localConfig.services];
                                        newS[idx].description = e.target.value;
                                        updateSection('services', newS);
                                    }} disabled={editingSection !== 'services'} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30 resize-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Features (one per line)</label>
                                    <textarea 
                                        value={service.features.join('\n')} 
                                        onChange={e => {
                                            const newS = [...localConfig.services];
                                            newS[idx].features = e.target.value.split('\n').filter(f => f.trim() !== '');
                                            updateSection('services', newS);
                                        }} 
                                        disabled={editingSection !== 'services'} 
                                        rows={3} 
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-[11px] font-medium focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    {editingSection === 'services' && (
                        <button
                            onClick={() => updateSection('services', [...localConfig.services, { icon: '✨', title: 'New Service', description: '', features: [] }])}
                            className="flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/5 px-4 py-2 rounded-lg transition-colors"
                        >
                            <Plus className="h-4 w-4" /> Add Service
                        </button>
                    )}
                </div>
            </section>

            {/* Process Section */}
            <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <SectionHeader id="process" icon={Workflow} title="How It Works" />
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Process Badge</label>
                            <input value={localConfig.process.badge} onChange={e => updateSection('process', { ...localConfig.process, badge: e.target.value })} disabled={editingSection !== 'process'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Primary Title</label>
                            <input value={localConfig.process.title_primary} onChange={e => updateSection('process', { ...localConfig.process, title_primary: e.target.value })} disabled={editingSection !== 'process'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Highlight Title</label>
                            <input value={localConfig.process.title_highlight} onChange={e => updateSection('process', { ...localConfig.process, title_highlight: e.target.value })} disabled={editingSection !== 'process'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        {localConfig.process.steps.map((s, idx) => (
                            <div key={idx} className="flex gap-4 p-4 bg-muted/20 border border-border rounded-xl relative">
                                {editingSection === 'process' && (
                                    <button
                                        onClick={() => {
                                            const newSteps = localConfig.process.steps.filter((_, i) => i !== idx);
                                            updateSection('process', { ...localConfig.process, steps: newSteps });
                                        }}
                                        className="absolute top-2 right-2 p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <div className="w-16 shrink-0">
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Step</label>
                                    <input value={s.step} onChange={e => {
                                        const newSteps = [...localConfig.process.steps];
                                        newSteps[idx].step = e.target.value;
                                        updateSection('process', { ...localConfig.process, steps: newSteps });
                                    }} disabled={editingSection !== 'process'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-black text-center focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Title</label>
                                        <input value={s.title} onChange={e => {
                                            const newSteps = [...localConfig.process.steps];
                                            newSteps[idx].title = e.target.value;
                                            updateSection('process', { ...localConfig.process, steps: newSteps });
                                        }} disabled={editingSection !== 'process'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Step Description</label>
                                        <input value={s.text} onChange={e => {
                                            const newSteps = [...localConfig.process.steps];
                                            newSteps[idx].text = e.target.value;
                                            updateSection('process', { ...localConfig.process, steps: newSteps });
                                        }} disabled={editingSection !== 'process'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {editingSection === 'process' && (
                        <button
                            onClick={() => updateSection('process', { ...localConfig.process, steps: [...localConfig.process.steps, { step: String(localConfig.process.steps.length + 1).padStart(2, '0'), title: '', text: '' }] })}
                            className="flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/5 px-4 py-2 rounded-lg transition-colors"
                        >
                            <Plus className="h-4 w-4" /> Add Process Step
                        </button>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <SectionHeader id="cta" icon={MessageSquare} title="Call to Action" />
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Primary Title</label>
                            <input value={localConfig.cta.title_primary} onChange={e => updateSection('cta', { ...localConfig.cta, title_primary: e.target.value })} disabled={editingSection !== 'cta'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Highlight Title</label>
                            <input value={localConfig.cta.title_highlight} onChange={e => updateSection('cta', { ...localConfig.cta, title_highlight: e.target.value })} disabled={editingSection !== 'cta'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">CTA Description</label>
                        <input value={localConfig.cta.description} onChange={e => updateSection('cta', { ...localConfig.cta, description: e.target.value })} disabled={editingSection !== 'cta'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Button Label</label>
                            <input value={localConfig.cta.button_label} onChange={e => updateSection('cta', { ...localConfig.cta, button_label: e.target.value })} disabled={editingSection !== 'cta'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Button URL</label>
                            <input value={localConfig.cta.button_url} onChange={e => updateSection('cta', { ...localConfig.cta, button_url: e.target.value })} disabled={editingSection !== 'cta'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
