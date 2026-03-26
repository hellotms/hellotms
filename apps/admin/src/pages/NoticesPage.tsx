import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cn, formatDate, getInitials } from '@/lib/utils';
import { mediaApi, auditApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Modal, ConfirmModal } from '@/components/Modal';
import { ImageUpload } from '@/components/ImageUpload';
import { toast } from '@/components/Toast';
import { Plus, Megaphone, Pin, Search, MoreVertical, Pencil, Trash2, Calendar, FileText, Image as ImageIcon, LayoutGrid, List } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { Notice } from '@hellotms/shared';

type NoticeInput = {
    title: string;
    body?: string;
    is_pinned: boolean;
    expires_at?: string;
};

export default function NoticesPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { can, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Form states
    const { register, handleSubmit, reset, watch, setValue } = useForm<NoticeInput>();
    const [coverUrl, setCoverUrl] = useState<string | File>('');
    const [attachments, setAttachments] = useState<{ type: string; url: string; name: string; file?: File }[]>([]);
    const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

    // Clear unread badge when entering this page
    useEffect(() => {
        if (profile?.id) {
            localStorage.setItem(`last_seen_notices_${profile.id}`, new Date().toISOString());
            queryClient.invalidateQueries({ queryKey: ['unread-notices'] });
        }
    }, [profile?.id, queryClient]);

    const { data: notices = [], isLoading } = useQuery<Notice[]>({
        queryKey: ['notices'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('notices')
                .select('*, profiles(name, avatar_url)')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                toast(`Failed to load notices: ${error.message}`, 'error');
                throw error;
            }
            return data as Notice[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (values: NoticeInput) => {
            // 1. Handle potential cover image change
            const finalCoverUrl = await mediaApi.uploadAndCleanMedia(
                coverUrl,
                editingNotice?.cover_url,
                'notices',
                'cover',
                values.title
            );

            // 2. Handle attachments (upload new files if any)
            const processedAttachments = await Promise.all(attachments.map(async (att) => {
                if (att.file) {
                    const res = await mediaApi.upload(att.file, 'notices', 'attachment', att.name);
                    return { type: 'file', url: res.url, name: att.name };
                }
                return { type: att.type, url: att.url, name: att.name };
            }));

            const payload = {
                ...values,
                expires_at: values.expires_at || null,
                body: values.body || null,
                cover_url: finalCoverUrl || null,
                attachments: processedAttachments, // JSONB
            };

            if (editingNotice) {
                const { error } = await supabase.from('notices').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingNotice.id);
                if (error) throw error;
                auditApi.log({ action: 'update_notice', entity_type: 'notice', entity_id: editingNotice.id, after: payload });
            } else {
                const { data, error } = await supabase.from('notices').insert({ ...payload, created_by: profile?.id }).select().single();
                if (error) throw error;
                auditApi.log({ action: 'create_notice', entity_type: 'notice', entity_id: data.id, after: payload });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notices'] });
            setIsOpen(false);
            resetForm();
            toast('Notice saved successfully!', 'success');
        },
        onError: (error: any) => {
            toast(`Failed to save notice: ${error.message}`, 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (notice: Notice) => {
            // Clean up media
            if (notice.cover_url) {
                await mediaApi.delete(new URL(notice.cover_url).pathname.slice(1));
            }
            for (const att of (notice.attachments as any[] || [])) {
                if (att.url) {
                    try { await mediaApi.delete(new URL(att.url).pathname.slice(1)); } catch (e) { }
                }
            }

            const { error } = await supabase.from('notices').delete().eq('id', notice.id);
            if (error) throw error;
            auditApi.log({ action: 'delete_notice', entity_type: 'notice', entity_id: notice.id, before: notice });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notices'] });
            setDeleteTarget(null);
            toast('Notice deleted forever', 'success');
        },
        onError: (error: any) => {
            toast(`Failed to delete notice: ${error.message}`, 'error');
        }
    });

    const resetForm = () => {
        setEditingNotice(null);
        setCoverUrl('');
        setAttachments([]);
        reset({ title: '', body: '', is_pinned: false, expires_at: '' });
    };

    const openEdit = (n: Notice) => {
        setEditingNotice(n);
        setCoverUrl(n.cover_url ?? '');
        setAttachments((n.attachments as any[]) ?? []);
        reset({
            title: n.title,
            body: n.body ?? '',
            is_pinned: n.is_pinned,
            expires_at: n.expires_at ? n.expires_at.split('T')[0] : ''
        });
        setIsOpen(true);
    };

    const filteredNotices = notices.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.body?.toLowerCase().includes(search.toLowerCase()));

    const now = new Date();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Notice Board"
                description="Internal announcements and updates for staff"
                actions={
                    can('manage_notices') && (
                        <button onClick={() => { resetForm(); setIsOpen(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                            <Plus className="h-4 w-4" /> New Notice
                        </button>
                    )
                }
            />

            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search notices..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    />
                </div>
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'grid' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Grid View"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "p-1.5 rounded-md transition-all",
                            viewMode === 'list' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="List View"
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="py-20 text-center text-muted-foreground">Loading notices...</div>
            ) : filteredNotices.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-border rounded-xl">
                    <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No notices found</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredNotices.map((notice) => {
                        const isExpired = notice.expires_at && new Date(notice.expires_at) < now;
                        const atts = (notice.attachments as any[]) ?? [];

                        return (
                            <div key={notice.id} className={`group bg-card border rounded-xl overflow-hidden transition-all hover:shadow-md ${notice.is_pinned ? 'border-primary/50 shadow-sm' : 'border-border'} ${isExpired ? 'opacity-70' : ''}`}>
                                {/* Cover Image slot */}
                                {notice.cover_url ? (
                                    <div className="h-40 w-full relative overflow-hidden bg-muted">
                                        <img src={notice.cover_url} alt="" className="w-full h-full object-cover" />
                                        {notice.is_pinned && (
                                            <div className="absolute top-3 left-3 bg-primary text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                                                <Pin className="h-3 w-3" /> Pinned
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    notice.is_pinned && (
                                        <div className="bg-primary/10 px-4 py-2 border-b border-primary/10 flex items-center gap-2">
                                            <Pin className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-xs font-semibold text-primary">PINNED NOTICE</span>
                                        </div>
                                    )
                                )}

                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <h3 onClick={() => navigate(`/notices/${notice.id}`)} className="font-semibold text-foreground text-lg leading-tight cursor-pointer hover:text-primary transition-colors line-clamp-2">
                                            {notice.title}
                                        </h3>

                                        {can('manage_notices') && (
                                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(notice)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button onClick={() => setDeleteTarget(notice)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 dark:bg-red-500/10 text-muted-foreground hover:text-red-500">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">
                                        {notice.body || 'No description provided.'}
                                    </p>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                                        <div className="flex items-center gap-2">
                                            {notice.profiles?.avatar_url ? (
                                                <img src={notice.profiles.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                                            ) : (
                                                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                                                    {getInitials(notice.profiles?.name ?? 'Admin')}
                                                </div>
                                            )}
                                            <div className="text-xs">
                                                <p className="font-medium text-foreground leading-none">{notice.profiles?.name ?? 'Unknown'}</p>
                                                <p className="text-muted-foreground mt-0.5">{formatDate(notice.created_at)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            {atts.length > 0 && (
                                                <div className="flex items-center gap-1 text-xs" title={`${atts.length} attachments`}>
                                                    <FileText className="h-3.5 w-3.5" /> {atts.length}
                                                </div>
                                            )}
                                            {isExpired && (
                                                <span className="text-[10px] font-semibold bg-red-100 dark:bg-red-500/20 text-red-700 px-1.5 py-0.5 rounded uppercase">Expired</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="px-5 py-4 font-semibold text-muted-foreground">Title</th>
                                    <th className="px-5 py-4 font-semibold text-muted-foreground">Author</th>
                                    <th className="px-5 py-4 font-semibold text-muted-foreground">Created</th>
                                    <th className="px-5 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredNotices.map((notice) => {
                                    const isExpired = notice.expires_at && new Date(notice.expires_at) < now;
                                    const atts = (notice.attachments as any[]) ?? [];

                                    return (
                                        <tr key={notice.id} className={cn(
                                            "hover:bg-muted/30 transition-colors group",
                                            notice.is_pinned && "bg-primary/[0.02]",
                                            isExpired && "opacity-60"
                                        )}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    {notice.is_pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
                                                    <div>
                                                        <h4 onClick={() => navigate(`/notices/${notice.id}`)} className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors">
                                                            {notice.title}
                                                        </h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {atts.length > 0 && (
                                                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                    <FileText className="h-3 w-3" /> {atts.length} files
                                                                </span>
                                                            )}
                                                            {isExpired && <span className="text-[10px] font-bold text-red-500 uppercase">Expired</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    {notice.profiles?.avatar_url ? (
                                                        <img src={notice.profiles.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold">
                                                            {getInitials(notice.profiles?.name ?? 'A')}
                                                        </div>
                                                    )}
                                                    <span className="text-xs font-medium">{notice.profiles?.name ?? 'Admin'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground text-xs">
                                                {formatDate(notice.created_at)}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                {can('manage_notices') && (
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openEdit(notice)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => setDeleteTarget(notice)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); resetForm(); }} title={editingNotice ? 'Edit Notice' : 'New Notice'} size="lg">
                <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-1">Notice Title <span className="text-red-500">*</span></label>
                        <input {...register('title', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Important announcement..." />
                    </div>

                    <ImageUpload
                        label="Cover Image (Optional)"
                        value={coverUrl}
                        onChange={(val) => setCoverUrl(val as string | File)}
                        aspect={21 / 9}
                        noCrop
                        guide="HD Direct Upload (No Cropping)"
                    />

                    <div>
                        <label className="block text-sm font-medium mb-1">Notice Body</label>
                        <textarea {...register('body')} rows={6} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y" placeholder="Full details..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Expiry Date <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
                            <input type="date" {...register('expires_at')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex flex-col justify-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" {...register('is_pinned')} className="rounded border-border text-primary focus:ring-primary w-4 h-4" />
                                <span className="text-sm font-medium flex items-center gap-1.5"><Pin className="h-4 w-4 text-primary" /> Pin to top of board</span>
                            </label>
                        </div>
                    </div>

                    {/* Attachments UI */}
                    <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium">Attachments & Links</label>
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                                    <Plus className="h-3 w-3" /> Add File (PDF/Doc)
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setAttachments([...attachments, { type: 'file', url: '', name: file.name, file }]);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setAttachments([...attachments, { type: 'link', url: '', name: '' }])}
                                    className="text-[11px] font-semibold bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" /> Add Link
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {attachments.map((att, idx) => (
                                <div key={idx} className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg border border-border/50">
                                    <div className="flex-1 space-y-2">
                                        <input
                                            placeholder="Display Name"
                                            value={att.name}
                                            onChange={(e) => {
                                                const newAtts = [...attachments];
                                                newAtts[idx].name = e.target.value;
                                                setAttachments(newAtts);
                                            }}
                                            className="w-full bg-card border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        {att.type === 'link' ? (
                                            <input
                                                placeholder="URL (https://...)"
                                                value={att.url}
                                                onChange={(e) => {
                                                    const newAtts = [...attachments];
                                                    newAtts[idx].url = e.target.value;
                                                    setAttachments(newAtts);
                                                }}
                                                className="w-full bg-card border border-border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2 px-2 py-1 bg-background border border-border rounded-md">
                                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">{att.file ? `Ready: ${att.file.name}` : `Linked: ${att.url.split('/').pop()}`}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg shrink-0">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            {attachments.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/20 rounded-lg border border-dashed border-border">No attachments added.</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => { setIsOpen(false); resetForm(); }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium">Cancel</button>
                        <button type="submit" disabled={saveMutation.isPending} className="px-5 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 font-medium">
                            {saveMutation.isPending ? 'Saving...' : 'Publish Notice'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
                title="Delete Notice"
                message="Are you sure you want to permanently delete this notice? This action cannot be undone."
                confirmLabel="Delete Notice"
                danger
                loading={deleteMutation.isPending}
            />
        </div>
    );
}
