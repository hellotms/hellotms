import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmModal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { Trash2, RotateCcw, Building2, FolderOpen, Receipt, Clock, AlertTriangle, MessageSquare, Monitor } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

type TrashItem = {
    id: string;
    entity_type: 'company' | 'project' | 'invoice' | 'collection' | 'lead' | 'app_version';
    entity_id: string;
    entity_name: string;
    entity_data: any;
    deleted_at: string;
    expires_at: string;
    deleted_by: string;
    profiles: { name: string } | null;
};

export default function RecycleBinPage() {
    const queryClient = useQueryClient();
    const [restoreTarget, setRestoreTarget] = useState<TrashItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<TrashItem | null>(null);

    const { data: trashItems, isLoading } = useQuery<TrashItem[]>({
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
                // Restore lead: re-insert into leads table
                const { error: insertError } = await supabase.from('leads').insert({
                    id: item.entity_id,
                    ...item.entity_data
                });
                if (insertError) throw insertError;
            } else if (item.entity_type === 'collection' && item.entity_data?._is_gallery_photo) {
                // Restore gallery photo: re-insert into project_media
                const { error: insertError } = await supabase.from('project_media').insert({
                    id: item.entity_id,
                    project_id: item.entity_data.project_id,
                    path: item.entity_data.path,
                    url: item.entity_data.url,
                });
                if (insertError) throw insertError;
            } else {
                const table =
                    item.entity_type === 'company' ? 'companies' :
                        item.entity_type === 'project' ? 'projects' :
                            item.entity_type === 'invoice' ? 'invoices' :
                                item.entity_type === 'app_version' ? 'app_versions' : 'collections';

                // 1. Remove deleted_at flag
                const { error: updateError } = await supabase
                    .from(table)
                    .update({ deleted_at: null })
                    .eq('id', item.entity_id);

                if (updateError) throw updateError;
            }

            // 2. Delete from trash_bin
            const { error: deleteError } = await supabase
                .from('trash_bin')
                .delete()
                .eq('id', item.id);

            if (deleteError) throw deleteError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trash-bin'] });
            // Also invalidate the specific entity lists
            queryClient.invalidateQueries({ queryKey: ['companies'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['app-versions'] });
            toast('Item restored successfully', 'success');
            setRestoreTarget(null);
        },
        onError: (e: any) => toast(`Failed to restore: ${e.message}`, 'error'),
    });

    const permanentDeleteMutation = useMutation({
        mutationFn: async (item: TrashItem) => {
            if (item.entity_type === 'lead') {
                // Already hard-deleted from main table, do nothing here.
            } else if (item.entity_type === 'collection' && item.entity_data?._is_gallery_photo) {
                // Permanently delete gallery photo: call mediaApi.delete
                const { mediaApi } = await import('@/lib/api');
                await mediaApi.delete(item.entity_data.path);
            } else {
                const table =
                    item.entity_type === 'company' ? 'companies' :
                        item.entity_type === 'project' ? 'projects' :
                            item.entity_type === 'invoice' ? 'invoices' :
                                item.entity_type === 'app_version' ? 'app_versions' : 'collections';

                // 1. Truly delete from the main table
                const { error: mainError } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', item.entity_id);

                if (mainError) throw mainError;

                // 1.5 If it's an invoice or app version, delete the file from R2
                const fileUrl = item.entity_type === 'invoice' ? item.entity_data?.pdf_url : item.entity_data?.url;
                if ((item.entity_type === 'invoice' || item.entity_type === 'app_version') && fileUrl) {
                    try {
                        const { mediaApi } = await import('@/lib/api');
                        const url = new URL(fileUrl);
                        const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
                        if (key && !key.startsWith('http')) {
                            await mediaApi.delete(key);
                        }
                    } catch (err) {
                        console.warn(`[RecycleBin] Failed to delete ${item.entity_type} file from R2:`, err);
                    }
                }
            }

            // 2. Delete from trash_bin
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
            case 'lead': return MessageSquare;
            case 'app_version': return Monitor;
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
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
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
                                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${item.entity_type === 'company' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 text-blue-600 dark:text-blue-400' :
                                                        item.entity_type === 'project' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 text-amber-600 dark:text-amber-400' :
                                                            item.entity_type === 'invoice' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 
                                                            item.entity_type === 'app_version' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                                                            'bg-gray-100 text-muted-foreground'
                                                        }`}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-foreground truncate">{item.entity_name || 'Unnamed Item'}</h4>
                                                        <p className="text-xs text-muted-foreground capitalize">{item.entity_type}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className="text-foreground">{formatDateTime(item.deleted_at)}</p>
                                                    <div className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wider ${expired ? 'text-red-500 uppercase' : 'text-orange-500'}`}>
                                                        {expired ? (
                                                            <><AlertTriangle className="h-3 w-3" /> Expired - Auto Delete Soon</>
                                                        ) : (
                                                            <><Clock className="h-3 w-3" /> Final Delete: {formatDateTime(item.expires_at)}</>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-muted-foreground">{item.profiles?.name || 'Unknown'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setRestoreTarget(item)}
                                                        className="p-2 rounded-md border border-border bg-card text-foreground hover:bg-muted hover:text-primary transition-colors flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(item)}
                                                        className="p-2 rounded-md border border-red-200 border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 text-red-600 dark:text-red-400 hover:bg-red-100 dark:bg-red-500/20 transition-colors flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" /> Delete Forever
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Restore Modal */}
            <ConfirmModal
                isOpen={!!restoreTarget}
                onClose={() => setRestoreTarget(null)}
                onConfirm={() => restoreTarget && restoreMutation.mutate(restoreTarget)}
                title="Restore Item?"
                message={`Are you sure you want to restore "${restoreTarget?.entity_name}"?`}
                confirmLabel="Yes, Restore"
                loading={restoreMutation.isPending}
            />

            {/* Permanent Delete Modal */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && permanentDeleteMutation.mutate(deleteTarget)}
                title="Delete Forever?"
                message={`This action is IRREVERSIBLE. "${deleteTarget?.entity_name}" and all its associated data will be permanently wiped.`}
                confirmLabel="Wipe Permanently"
                danger
                loading={permanentDeleteMutation.isPending}
            />
        </div>
    );
}
