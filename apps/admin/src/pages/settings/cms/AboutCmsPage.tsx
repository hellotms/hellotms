import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { auditApi } from '@/lib/api';
import { toast } from '@/components/Toast';
import { ImageUpload } from '@/components/ImageUpload';
import { Save, X, Edit2, Info, Target, Sparkles, Map, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SiteSettings, AboutPageConfig } from '@hellotms/shared';

export default function AboutCmsPage() {
    const queryClient = useQueryClient();
    const [editingSection, setEditingSection] = useState<'hero' | 'mission' | 'values' | 'journey' | null>(null);
    const [localConfig, setLocalConfig] = useState<AboutPageConfig | null>(null);

    const { data: settings, isLoading } = useQuery<SiteSettings>({
        queryKey: ['site-settings'],
        queryFn: async () => {
            const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).single();
            if (error) throw error;
            return data as SiteSettings;
        },
    });

    useEffect(() => {
        if (settings?.about_page_config) {
            setLocalConfig(settings.about_page_config as AboutPageConfig);
        }
    }, [settings]);

    const saveMutation = useMutation({
        mutationFn: async (newConfig: AboutPageConfig) => {
            const { error } = await supabase.from('site_settings').update({ about_page_config: newConfig, updated_at: new Date().toISOString() }).eq('id', 1);
            if (error) throw error;

            auditApi.log({
                action: 'update_about_cms_config',
                entity_type: 'site_settings',
                entity_id: '1',
                after: { about_page_config: newConfig }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['site-settings'] });
            setEditingSection(null);
            toast('About page content updated!', 'success');
        },
        onError: (e: Error) => toast(e.message, 'error'),
    });

    if (isLoading || !localConfig) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

    const updateSection = (section: keyof AboutPageConfig, data: any) => {
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
                    <button onClick={() => { setEditingSection(null); setLocalConfig(settings?.about_page_config as AboutPageConfig); }} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"><X className="h-4 w-4" /></button>
                    <button onClick={() => saveMutation.mutate(localConfig)} className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"><Save className="h-4 w-4" /></button>
                </div>
            ) : (
                <button onClick={() => setEditingSection(id)} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
            )}
        </div>
    );

    return (
        <div className="space-y-6 max-w-4xl pb-20">
            <div className="flex items-center gap-3 mb-2">
                <Link to="/cms?tab=cms" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-black">Edit About Us Page</h1>
            </div>

            {/* Hero Section */}
            <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <SectionHeader id="hero" icon={Info} title="Hero Section" />
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Badge</label>
                            <input value={localConfig.hero.badge} onChange={e => updateSection('hero', { ...localConfig.hero, badge: e.target.value })} disabled={editingSection !== 'hero'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Primary Title</label>
                            <input value={localConfig.hero.title_primary} onChange={e => updateSection('hero', { ...localConfig.hero, title_primary: e.target.value })} disabled={editingSection !== 'hero'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                        <div className="md:col-span-1">
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

            {/* Mission Section */}
            <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <SectionHeader id="mission" icon={Target} title="Mission & Vision" />
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Mission Quote</label>
                            <input value={localConfig.mission.statement} onChange={e => updateSection('mission', { ...localConfig.mission, statement: e.target.value })} disabled={editingSection !== 'mission'} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm italic focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Stats (Value / Label)</label>
                            <div className="flex gap-2">
                                <input value={localConfig.mission.stats_value} onChange={e => updateSection('mission', { ...localConfig.mission, stats_value: e.target.value })} disabled={editingSection !== 'mission'} className="w-24 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30 font-bold" />
                                <input value={localConfig.mission.stats_label} onChange={e => updateSection('mission', { ...localConfig.mission, stats_label: e.target.value })} disabled={editingSection !== 'mission'} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Detailed Description (Paragraph 1)</label>
                        <textarea value={localConfig.mission.description_p1} onChange={e => updateSection('mission', { ...localConfig.mission, description_p1: e.target.value })} disabled={editingSection !== 'mission'} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30 resize-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Detailed Description (Paragraph 2)</label>
                        <textarea value={localConfig.mission.description_p2} onChange={e => updateSection('mission', { ...localConfig.mission, description_p2: e.target.value })} disabled={editingSection !== 'mission'} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30 resize-none" />
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <SectionHeader id="values" icon={Sparkles} title="Core Values" />
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {localConfig.values.items.map((item, idx) => (
                            <div key={idx} className="p-4 bg-muted/20 border border-border rounded-xl space-y-3 relative group">
                                {editingSection === 'values' && (
                                    <button
                                        onClick={() => {
                                            const newItems = localConfig.values.items.filter((_, i) => i !== idx);
                                            updateSection('values', { ...localConfig.values, items: newItems });
                                        }}
                                        className="absolute top-2 right-2 p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                )}
                                <div>
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Title</label>
                                    <input value={item.title} onChange={e => {
                                        const newItems = [...localConfig.values.items];
                                        newItems[idx].title = e.target.value;
                                        updateSection('values', { ...localConfig.values, items: newItems });
                                    }} disabled={editingSection !== 'values'} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Description</label>
                                    <textarea value={item.text} onChange={e => {
                                        const newItems = [...localConfig.values.items];
                                        newItems[idx].text = e.target.value;
                                        updateSection('values', { ...localConfig.values, items: newItems });
                                    }} disabled={editingSection !== 'values'} rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30 resize-none" />
                                </div>
                            </div>
                        ))}
                    </div>
                    {editingSection === 'values' && (
                        <button
                            onClick={() => updateSection('values', { ...localConfig.values, items: [...localConfig.values.items, { title: 'New Value', text: '', icon: 'Sparkles' }] })}
                            className="flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/5 px-4 py-2 rounded-lg transition-colors"
                        >
                            <Plus className="h-4 w-4" /> Add Value Item
                        </button>
                    )}
                </div>
            </section>

            {/* Journey Section */}
            <section className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <SectionHeader id="journey" icon={Map} title="Journey Milestones" />
                <div className="p-6 space-y-4">
                    <div className="space-y-3">
                        {localConfig.journey.milestones.map((m, idx) => (
                            <div key={idx} className="flex gap-4 p-4 bg-muted/20 border border-border rounded-xl relative">
                                {editingSection === 'journey' && (
                                    <button
                                        onClick={() => {
                                            const newM = localConfig.journey.milestones.filter((_, i) => i !== idx);
                                            updateSection('journey', { ...localConfig.journey, milestones: newM });
                                        }}
                                        className="absolute top-2 right-2 p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                )}
                                <div className="w-20 shrink-0">
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Year</label>
                                    <input value={m.year} onChange={e => {
                                        const newM = [...localConfig.journey.milestones];
                                        newM[idx].year = e.target.value;
                                        updateSection('journey', { ...localConfig.journey, milestones: newM });
                                    }} disabled={editingSection !== 'journey'} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-black text-center focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Title</label>
                                        <input value={m.title} onChange={e => {
                                            const newM = [...localConfig.journey.milestones];
                                            newM[idx].title = e.target.value;
                                            updateSection('journey', { ...localConfig.journey, milestones: newM });
                                        }} disabled={editingSection !== 'journey'} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Description</label>
                                        <input value={m.text} onChange={e => {
                                            const newM = [...localConfig.journey.milestones];
                                            newM[idx].text = e.target.value;
                                            updateSection('journey', { ...localConfig.journey, milestones: newM });
                                        }} disabled={editingSection !== 'journey'} className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-muted/30" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {editingSection === 'journey' && (
                        <button
                            onClick={() => updateSection('journey', { ...localConfig.journey, milestones: [...localConfig.journey.milestones, { year: '2024', title: '', text: '' }] })}
                            className="flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/5 px-4 py-2 rounded-lg transition-colors transition-colors"
                        >
                            <Plus className="h-4 w-4" /> Add Milestone Item
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
}
