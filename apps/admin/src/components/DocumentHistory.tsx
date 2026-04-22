import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Download, Trash2, RotateCcw, Send, History, Mail, AlertTriangle, FilePlus, Loader2 } from 'lucide-react';
import { toast } from '@/components/Toast';
import { ConfirmModal } from '@/components/Modal';

interface Document {
  id: string;
  file_name: string;
  pdf_url: string;
  is_sent: boolean;
  sent_at: string | null;
  sent_to: { name: string; email: string }[] | null;
  created_at: string;
  deleted_at: string | null;
}

interface DocumentHistoryProps {
  parentId: string;
  type: 'invoice' | 'estimate';
}

export function DocumentHistory({ parentId, type }: DocumentHistoryProps) {
  const queryClient = useQueryClient();
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const { data: documents = [], isLoading, error: queryError } = useQuery({
    queryKey: ['document-history', parentId, showDeleted],
    queryFn: () => invoicesApi.getDocuments(parentId, showDeleted),
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-history', parentId] });
      toast('Document moved to trash', 'success');
      setDeleteId(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.restoreDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-history', parentId] });
      toast('Document restored successfully', 'success');
      setRestoreId(null);
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => invoicesApi.getPdf(parentId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-history', parentId] });
      toast('New PDF version generated', 'success');
    },
  });

  const selectedDocForDelete = documents.find(d => d.id === deleteId);

  if (isLoading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/20 rounded-xl border border-dashed border-border/60">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
        <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-widest">
          <AlertTriangle className="h-4 w-4" />
          Load Error
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{(queryError as Error).message}</p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['document-history', parentId] })}
          className="mt-2 text-[10px] font-black uppercase text-primary hover:underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <History className="h-4 w-4" />
          Document History
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg shadow-sm disabled:opacity-50 transition-all"
            title="Generate a fresh PDF of the current data"
          >
            {generateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            New Version
          </button>
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 px-2 py-1.5 rounded-lg border border-primary/20 transition-colors"
          >
            {showDeleted ? 'Active' : 'Trash'}
          </button>
        </div>
      </div>

      <div className="overflow-hidden bg-card rounded-xl border border-border/60 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/30 border-b border-border/60">
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Version / Name</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status & Date</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground opacity-60">
                  No {showDeleted ? 'deleted' : ''} documents found
                </td>
              </tr>
            ) : (
              documents.map((doc: Document) => (
                <tr key={doc.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground line-clamp-1">{doc.file_name}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">{formatDateTime(doc.created_at)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {doc.is_sent ? (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded text-[9px] font-black uppercase tracking-tighter border border-green-500/20">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Sent
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 rounded text-[9px] font-black uppercase tracking-tighter border border-yellow-500/20">
                          Draft
                        </div>
                      )}
                      {doc.sent_at && (
                        <span className="text-[9px] text-muted-foreground opacity-70">
                          {formatDate(doc.sent_at)}
                        </span>
                      )}
                    </div>
                    {doc.sent_to && doc.sent_to.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {doc.sent_to.slice(0, 2).map((r, i) => (
                          <span key={i} className="text-[8px] px-1 bg-muted/50 rounded text-muted-foreground">
                            {r.email}
                          </span>
                        ))}
                        {doc.sent_to.length > 2 && (
                          <span className="text-[8px] text-primary">+{doc.sent_to.length - 2} more</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                      {!doc.deleted_at ? (
                        <>
                          <a
                            href={doc.pdf_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-primary/10 text-primary rounded-md transition-colors"
                            title="Download / View"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => setDeleteId(doc.id)}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                            title="Move to trash"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setRestoreId(doc.id)}
                          className="p-1.5 hover:bg-primary/10 text-primary rounded-md transition-colors"
                          title="Restore version"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Document Version?"
        message={
          selectedDocForDelete?.is_sent 
            ? "This PDF has already been sent to the client. If you delete it, the link in their email will stop working and they won't be able to open it. Are you sure you want to proceed?"
            : "Are you sure you want to delete this PDF version? You can restore it from the trash bin later if needed."
        }
        confirmLabel="Yes, Delete it"
        danger={true}
        loading={deleteMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!restoreId}
        onClose={() => setRestoreId(null)}
        onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
        title="Restore Document?"
        message="This will move the document back to the active versions list."
        confirmLabel="Restore"
        loading={restoreMutation.isPending}
      />
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
