import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { toast } from '@/components/Toast';
import { formatBDT, formatDate } from '@/lib/utils';
import { Trash2, RotateCcw, Building2, FolderOpen, Receipt, Clock, DollarSign, MessageSquare, Monitor, FileText } from 'lucide-react';
import { useState } from 'react';
import { Modal, ConfirmModal } from '@/components/Modal';

interface TrashItem {
    id: string;
    entity_type: string;
    entity_id: string;
    entity_name: string;
    entity_data: any;
    deleted_at: string;
    deleted_by: string;
    expires_at: string;
    profiles?: {
        name: string;
    };
}

export default function RecycleBinPage() {
    const queryClient = useQueryClient();
    const [deleteTarget, setDeleteTarget] = useState<TrashItem | null>(null);
    const [restoreTarget, setRestoreTarget] = useState<TrashItem | null>(null);

    const { data: trashItems = [], isLoading } = useQuery<TrashItem[]>({
        queryKey: ['trash-bin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('trash_bin')
                .select('*, profiles(name)')
                .order('deleted_at', { ascending: false });

            if (error) throw error;
            return data as TrashItem[];
        },
    });

    const restoreMutation = useMutation({
        mutationFn: async (item: TrashItem) => {
            if (item.entity_type === 'lead') {
                // Special case for leads (unified date migration)
                const { error } = await supabase.from('leads').update({ deleted_at: null }).eq('id', item.entity_id);
                if (error) throw error;
            } else {
                const table =
                    item.entity_type === 'company' ? 'companies' :
                        item.entity_type === 'project' ? 'projects' :
                            item.entity_type === 'invoice' ? 'invoices' :
                                item.entity_type === 'app_version' ? 'app_versions' : 
                                    item.entity_type === 'ledger' ? 'ledger_entries' : 
                                        item.entity_type === 'document_history' ? 'document_history' : 'collections';

                // 1. Restore the main entity
                const { error: mainError } = await supabase
                    .from(table)
                    .update({ deleted_at: null })
                    .eq('id', item.entity_id);

                if (mainError) throw mainError;

                // 2. If it's a ledger, also restore child payments with SAME deleted_at
                if (item.entity_type === 'ledger') {
                    await supabase
                        .from('ledger_payments')
                        .update({ deleted_at: null })
                        .eq('ledger_id', item.entity_id)
                        .eq('deleted_at', item.deleted_at);
                }
            }

            // 3. Delete from trash_bin
            const { error: trashError } = await supabase
                .from('trash_bin')
                .delete()
                .eq('id', item.id);

            if (trashError) throw trashError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash-bin'] });
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            queryClient.invalidateQueries({ queryKey: ['ledger'] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['app-versions'] });
            toast('Item restored successfully', 'success');
            setRestoreTarget(null);
        },
        onError: (e: any) => toast(`Failed to restore: ${e.message}`, 'error'),
    });

    const permanentDeleteMutation = useMutation({
        mutationFn: async (item: TrashItem) => {
            const { mediaApi } = await import('@/lib/api');

            // Reusable cleanup helper for R2 URLs
            const cleanupFile = async (urlStr: string | null | undefined) => {
                if (!urlStr) return;
                try {
                    const url = new URL(urlStr);
                    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
                    if (key && !key.startsWith('http')) {
                        await mediaApi.delete(key);
                    }
                } catch (err) {
                    console.warn(`[RecycleBin] Failed to delete file ${urlStr}:`, err);
                }
            };

            if (item.entity_type === 'project') {
                // Recursive cleanup for project
                // 1. Invoices (PDFs)
                const { data: invs } = await supabase.from('invoices').select('pdf_url').eq('project_id', item.entity_id);
                for (const inv of invs || []) {
                    if (inv.pdf_url) await cleanupFile(inv.pdf_url);
                }
                // 2. Ledger (Attachments)
                const { data: entries } = await supabase.from('ledger_entries').select('attachment_url').eq('project_id', item.entity_id);
                for (const entry of entries || []) {
                    if (entry.attachment_url) await cleanupFile(entry.attachment_url);
                }
                // 3. Media (Gallery)
                const { data: media } = await supabase.from('project_media').select('path').eq('project_id', item.entity_id);
                for (const m of media || []) {
                    if (m.path) await mediaApi.delete(m.path);
                }
            } else if (item.entity_type === 'company') {
                // Recursive cleanup for company (purging all associated project files)
                const { data: projs } = await supabase.from('projects').select('id').eq('company_id', item.entity_id);
                for (const proj of projs || []) {
                    // Cleanup invoices for this project
                    const { data: invs } = await supabase.from('invoices').select('pdf_url').eq('project_id', proj.id);
                    for (const inv of invs || []) {
                        if (inv.pdf_url) await cleanupFile(inv.pdf_url);
                    }
                    // Cleanup ledger entries for this project
                    const { data: entries } = await supabase.from('ledger_entries').select('attachment_url').eq('project_id', proj.id);
                    for (const entry of entries || []) {
                        if (entry.attachment_url) await cleanupFile(entry.attachment_url);
                    }
                    // Cleanup gallery media for this project
                    const { data: media } = await supabase.from('project_media').select('path').eq('project_id', proj.id);
                    for (const m of media || []) {
                        if (m.path) await mediaApi.delete(m.path);
                    }
                }
            } else if (item.entity_type === 'invoice') {
                await cleanupFile(item.entity_data?.pdf_url);
            } else if (item.entity_type === 'ledger') {
                await cleanupFile(item.entity_data?.attachment_url);
            } else if (item.entity_type === 'collection' && item.entity_data?._is_gallery_photo) {
                await mediaApi.delete(item.entity_data.path);
            } else if (item.entity_type === 'app_version') {
                await cleanupFile(item.entity_data?.url);
            } else if (item.entity_type === 'document_history') {
                await cleanupFile(item.entity_data?.pdf_url);
            }

            // Finally, Hard Delete from DB
            if (item.entity_type !== 'lead') {
                const table =
                    item.entity_type === 'company' ? 'companies' :
                        item.entity_type === 'project' ? 'projects' :
                            item.entity_type === 'invoice' ? 'invoices' :
                                item.entity_type === 'app_version' ? 'app_versions' :
                                    item.entity_type === 'ledger' ? 'ledger_entries' : 'collections';

                const { error: mainError } = await supabase.from(table).delete().eq('id', item.entity_id);
                if (mainError) throw mainError;
            }

            // Delete from trash_bin
            const { error: trashError } = await supabase
                .from('trash_bin')
                .delete()
                .eq('id', item.id);

            if (trashError) throw trashError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash-bin'] });
            toast('Item deleted permanently', 'success');
            setDeleteTarget(null);
        },
        onError: (e: any) => toast(`Failed to delete: ${e.message}`, 'error'),
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'company': return Building2;
            case 'project': return FolderOpen;
            case 'invoice': return Receipt;
            case 'collection': return DollarSign;
            case 'ledger': return Receipt;
            case 'lead': return MessageSquare;
            case 'app_version': return Monitor;
            case 'document_history': return FileText;
            default: return Clock;
        }
    };

    const isExpired = (expiry: string) => new Date(expiry) < new Date();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Recycle Bin"
                description="Soft-deleted items are stored here for 30 days before being permanently removed."
            />

            {isLoading ? (
                <div className="py-20 text-center text-muted-foreground">Loading items...</div>
            ) : !trashItems?.length ? (
                <div className="bg-card border border-border rounded-xl p-20 text-center space-y-3 shadow-sm">
                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                        <Trash2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Trash is empty</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">Items you delete will show up here. You can restore them within 30 days.</p>
                </div>
            ) : (
                <div className="bg-transparent md:bg-card md:border md:border-border rounded-xl md:overflow-hidden md:shadow-sm">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-6 py-4 font-semibold text-foreground">Item Info</th>
                                    <th className="px-6 py-4 font-semibold text-foreground">Deleted On</th>
                                    <th className="px-6 py-4 font-semibold text-foreground">Deleted By</th>
                                    <th className="px-6 py-4 font-semibold text-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {trashItems.map((item) => {
                                    const Icon = getIcon(item.entity_type);
                                    const expired = isExpired(item.expires_at);

                                    return (
                                        <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${item.entity_type === 'company' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                                        item.entity_type === 'project' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                                            item.entity_type === 'invoice' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 
                                                            item.entity_type === 'ledger' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                                                            item.entity_type === 'collection' ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400' :
                                                            item.entity_type === 'app_version' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                                                            item.entity_type === 'document_history' ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400' :
                                                            'bg-gray-100 text-muted-foreground'
                                                        }`}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-foreground truncate">{item.entity_name || 'Unnamed Item'}</h4>
                                                        <p className="text-xs text-muted-foreground capitalize">
                                                            {item.entity_type === 'document_history'
                                                                ? (item.entity_data?.project_title 
                                                                    ? `PDF Version • ${item.entity_data.project_title}`
                                                                    : (item.entity_data?.invoices?.projects?.title 
                                                                        ? `PDF Version • ${item.entity_data.invoices.projects.title}`
                                                                        : 'PDF Version'))
                                                                : item.entity_type}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-foreground">{formatDate(item.deleted_at)}</span>
                                                    <span className="text-[10px] text-muted-foreground">Expires {formatDate(item.expires_at)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-muted-foreground">{item.profiles?.name || 'System'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!expired && (
                                                        <button
                                                            onClick={() => setRestoreTarget(item)}
                                                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                                                            title="Restore"
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setDeleteTarget(item)}
                                                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                        title="Delete Permanently"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                        {trashItems.map((item) => {
                            const Icon = getIcon(item.entity_type);
                            const expired = isExpired(item.expires_at);

                            return (
                                <div key={item.id} className="bg-background border border-border rounded-xl p-4 space-y-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-muted h-10 w-10 rounded-lg flex items-center justify-center">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground text-sm">{item.entity_name}</h4>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.entity_type}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs border-t border-border pt-3">
                                        <div>
                                            <p className="text-muted-foreground mb-1 font-medium">Deleted On</p>
                                            <p className="text-foreground">{formatDate(item.deleted_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground mb-1 font-medium">Expires On</p>
                                            <p className="text-foreground">{formatDate(item.expires_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-2">
                                        {!expired && (
                                            <button
                                                onClick={() => setRestoreTarget(item)}
                                                className="flex-1 py-2 bg-emerald-500/10 text-emerald-600 rounded-lg font-bold text-xs"
                                            >
                                                Restore
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setDeleteTarget(item)}
                                            className="flex-1 py-2 bg-red-500/10 text-red-600 rounded-lg font-bold text-xs"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && permanentDeleteMutation.mutate(deleteTarget)}
                title="Delete Permanently"
                message={`Are you sure you want to permanently delete "${deleteTarget?.entity_name}"? This action cannot be undone and will remove all associated files from cloud storage.`}
                confirmLabel="Delete Permanently"
                danger
                loading={permanentDeleteMutation.isPending}
            />

            <ConfirmModal
                isOpen={!!restoreTarget}
                onClose={() => setRestoreTarget(null)}
                onConfirm={() => restoreTarget && restoreMutation.mutate(restoreTarget)}
                title="Restore Item"
                message={`Are you sure you want to restore "${restoreTarget?.entity_name}"? It will be returned to its original place.`}
                confirmLabel="Restore"
                loading={restoreMutation.isPending}
            />
        </div>
    );
}
