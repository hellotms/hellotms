import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { staffApi, mediaApi, auditApi } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { ImageUpload } from '@/components/ImageUpload';
import { formatBDT, formatDate } from '@/lib/utils';
import { computeProjectDurations } from '@hellotms/shared';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Clock, DollarSign, Upload, X, ImageIcon, Download } from 'lucide-react';
import type { Project, LedgerEntry, Collection, Invoice } from '@hellotms/shared';
import { useForm } from 'react-hook-form';
import { toast } from '@/components/Toast';
import type { LedgerEntryInput } from '@hellotms/shared';
import { ledgerEntrySchema, collectionSchema, EVENT_CATEGORIES } from '@hellotms/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CollectionInput } from '@hellotms/shared';

const TABS = ['Overview', 'Expenses', 'Collections', 'Invoices', 'Timeline', 'Gallery'] as const;
type Tab = typeof TABS[number];

type EditProjectInput = {
  title: string;
  status: string;
  location?: string;
  category?: string;
  event_start_date: string;
  event_end_date?: string;
  proposal_date?: string;
  budget?: string | number;
  advance_received?: string | number;
  notes?: string;
  is_featured: boolean;
  project_completed_at?: string;
  description?: string;
  cover_image_url?: string;
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const { data: project, isLoading } = useQuery<Project & { companies: { name: string; phone?: string; email?: string } | null }>({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*, companies(name, phone, email)').eq('id', id!).single();
      if (error) {
        toast(`Project load failed: ${error.message}`, 'error');
        throw error;
      }
      return data;
    },
    enabled: !!id,
  });

  const { data: ledger = [] } = useQuery<LedgerEntry[]>({
    queryKey: ['ledger', id],
    queryFn: async () => {
      const { data } = await supabase.from('ledger_entries').select('*').eq('project_id', id!).is('deleted_at', null).order('entry_date', { ascending: false });
      return (data ?? []) as LedgerEntry[];
    },
    enabled: !!id,
  });

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ['collections', id],
    queryFn: async () => {
      const { data } = await supabase.from('collections').select('*').eq('project_id', id!).order('payment_date', { ascending: true });
      return (data ?? []) as Collection[];
    },
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ['project-invoices', id],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('*').eq('project_id', id!).order('created_at', { ascending: false });
      return (data ?? []) as Invoice[];
    },
    enabled: !!id,
  });

  // Financials
  const totalExpense = ledger.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = ledger.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
  const totalCollected = collections.reduce((s, c) => s + Number(c.amount), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  // advance_received is an upfront payment recorded on the project itself
  const advanceReceived = Number(project?.advance_received ?? 0);
  // totalReceived = all collections + upfront advance
  const totalReceived = totalCollected + advanceReceived;
  // Balance = total money received from client - total expenses
  const balance = totalReceived - totalExpense;
  // Due: invoice total minus everything received (collections + advance)
  const due = invoices.length > 0 ? Math.max(0, totalInvoiced - totalReceived) : null;

  // Timeline durations
  const durations = project ? computeProjectDurations(project, collections, totalInvoiced) : null;

  // Edit project form
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, setValue: setValueEdit, watch: watchEdit } = useForm<EditProjectInput>();

  const editCoverImageUrl = watchEdit('cover_image_url');
  const selectedCategory = watchEdit('category');
  const isOtherCategory = selectedCategory === 'Others';

  // Gallery: fetch images from project_media table
  const { data: gallery = [], refetch: refetchGallery } = useQuery<{ id: string; url: string; path: string }[]>({
    queryKey: ['gallery', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_media')
        .select('id, url, path')
        .eq('project_id', id!)
        .order('created_at', { ascending: false });
      return (data ?? []) as { id: string; url: string; path: string }[];
    },
    enabled: !!id,
  });

  // Ledger form — default to expense (only expenses tracked here)
  const ledgerForm = useForm<LedgerEntryInput>({
    resolver: zodResolver(ledgerEntrySchema),
    defaultValues: { project_id: id!, type: 'expense', paid_status: 'unpaid' },
  });

  const saveLedgerMutation = useMutation({
    mutationFn: async (values: LedgerEntryInput) => {
      if (editingEntry) {
        const { error } = await supabase.from('ledger_entries').update(values).eq('id', editingEntry.id);
        if (error) throw error;
        auditApi.log({
          action: 'update_ledger_entry',
          entity_type: 'ledger',
          entity_id: editingEntry.id,
          after: values
        });
      } else {
        const { data, error } = await supabase.from('ledger_entries').insert(values).select().single();
        if (error) throw error;
        auditApi.log({
          action: 'create_ledger_entry',
          entity_type: 'ledger',
          entity_id: data.id,
          after: values
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger', id] });
      setIsLedgerOpen(false);
      setEditingEntry(null);
      ledgerForm.reset({ project_id: id!, type: 'expense', paid_status: 'unpaid' });
      toast('Entry saved successfully', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to save entry: ${error.message}`, 'error');
    }
  });

  const deleteLedgerMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('ledger_entries').update({ deleted_at: new Date().toISOString() }).eq('id', entryId);
      if (error) throw error;
      auditApi.log({
        action: 'delete_ledger_entry',
        entity_type: 'ledger',
        entity_id: entryId,
        before: { id: entryId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger', id] });
      setDeleteTarget(null);
      toast('Entry deleted', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to delete: ${error.message}`, 'error');
    }
  });

  // Collection form
  const collectionForm = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: { project_id: id! },
  });

  // Helper to open collection modal with today's date
  function openCollectionModal() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    collectionForm.reset({ project_id: id!, payment_date: todayStr });
    setIsCollectionOpen(true);
  }

  const saveCollectionMutation = useMutation({
    mutationFn: async (values: CollectionInput) => {
      const { data, error } = await supabase.from('collections').insert(values).select().single();
      if (error) throw error;
      auditApi.log({
        action: 'create_collection',
        entity_type: 'collection',
        entity_id: data.id,
        after: values
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', id] });
      setIsCollectionOpen(false);
      collectionForm.reset({ project_id: id! });
      toast('Payment recorded', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to record payment: ${error.message}`, 'error');
    }
  });

  // Toggle published
  const togglePublished = async () => {
    if (!project) return;
    const newStatus = !project.is_published;
    await supabase.from('projects').update({ is_published: newStatus }).eq('id', id!);
    auditApi.log({
      action: 'update_project_visibility',
      entity_type: 'project',
      entity_id: id!,
      after: { is_published: newStatus }
    });
    queryClient.invalidateQueries({ queryKey: ['project', id] });
  };

  const saveProjectMutation = useMutation({
    mutationFn: async (values: EditProjectInput) => {
      // 1. Handle potential cover image change
      const finalCoverUrl = await mediaApi.uploadAndCleanMedia(
        (values.cover_image_url ?? null) as File | string | null,
        project?.cover_image_url || null,
        'projects',
        'cover',
        project?.title || values.title
      );

      const payload = {
        ...values,
        event_end_date: values.event_end_date || values.event_start_date || null,
        proposal_date: values.proposal_date || null,
        budget: values.budget ? Number(values.budget) : null,
        advance_received: values.advance_received ? Number(values.advance_received) : 0,
        project_completed_at: values.project_completed_at || null,
        location: values.location || null,
        notes: values.notes || null,
        description: values.description || null,
        cover_image_url: finalCoverUrl || null,
        category: values.category === 'Others' ? customCategory : (values.category || null),
      };
      const { error } = await supabase.from('projects').update(payload).eq('id', id!);
      if (error) throw error;
      auditApi.log({
        action: 'update_project',
        entity_type: 'project',
        entity_id: id!,
        after: payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setIsEditOpen(false);
      toast('Project updated', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to update project: ${error.message}`, 'error');
    }
  });

  // Gallery upload — stage first, upload on confirm
  const stageFiles = (files: FileList | null) => {
    if (!files) return;
    setStagedFiles(prev => [...prev, ...Array.from(files)]);
    // Reset input so same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadStagedFiles = async () => {
    if (!stagedFiles.length || !id) return;
    setIsUploading(true);
    setUploadError('');
    try {
      let successCount = 0;
      for (const file of stagedFiles) {
        try {
          // Descriptive name for gallery photos: photo_[project-title]_[timestamp]
          const res = await mediaApi.upload(file, 'projects/gallery', 'photo', project?.title || 'project');
          if (res.success) {
            const { error: insertError } = await supabase.from('project_media').insert({
              project_id: id,
              path: res.key,
              url: res.url
            });
            if (insertError) throw insertError;
            successCount++;
            auditApi.log({
              action: 'upload_gallery_photo',
              entity_type: 'project',
              entity_id: id,
              after: { url: res.url, path: res.key }
            });
          } else {
            throw new Error('Upload to R2 failed');
          }
        } catch (fileError: any) {
          console.error(`[File Upload Error] ${file.name}:`, fileError);
          toast(`Failed to upload ${file.name}: ${fileError.message}`, 'error');
        }
      }
      setStagedFiles([]);
      refetchGallery();
      if (successCount > 0) {
        toast(`${successCount} photo(s) uploaded successfully`, 'success');
      }
    } catch (e: any) {
      console.error('[Gallery Upload Mega Error]', e);
      setUploadError(e.message || 'Gallery upload failed.');
      toast('Upload process encountered errors', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadPhoto = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'photo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab if blob fetch fails (CORS issues etc)
      window.open(url, '_blank');
    }
  };

  // Gallery delete
  const deletePhoto = async (photo: { id: string; path: string }) => {
    try {
      await mediaApi.delete(photo.path);
      await supabase.from('project_media').delete().eq('id', photo.id);
      refetchGallery();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  if (!project) return <div className="py-20 text-center text-muted-foreground">Project not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/projects')} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <PageHeader title={project.title} description={project.companies?.name ?? ''} />
        </div>
        <StatusBadge status={project.status} />
        <button
          onClick={() => {
            resetEdit({
              title: project.title,
              status: project.status,
              location: project.location ?? '',
              category: EVENT_CATEGORIES.includes(project.category as any) ? (project.category ?? '') : (project.category ? 'Others' : ''),
              event_start_date: project.event_start_date ? project.event_start_date.split('T')[0] : '',
              event_end_date: project.event_end_date ? project.event_end_date.split('T')[0] : '',
              proposal_date: project.proposal_date ? project.proposal_date.split('T')[0] : '',
              budget: project.budget ?? '',
              advance_received: project.advance_received ?? '',
              notes: project.notes ?? '',
              is_featured: project.is_featured ?? false,
              project_completed_at: project.project_completed_at ? project.project_completed_at.split('T')[0] : '',
              description: project.description ?? '',
              cover_image_url: project.cover_image_url ?? '',
            });
            setCustomCategory(EVENT_CATEGORIES.includes(project.category as any) ? '' : (project.category ?? ''));
            setIsEditOpen(true);
          }}
          className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          onClick={togglePublished}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${project.is_published ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
        >
          {project.is_published ? '● Published' : '○ Unpublished'}
        </button>
      </div>

      {/* Finance summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Budget', value: project.budget ? formatBDT(Number(project.budget)) : '—', color: 'indigo', raw: true },
          { label: 'Total Expenses', value: totalExpense, color: 'red', raw: false },
          { label: 'Balance', value: balance, color: balance >= 0 ? 'emerald' : 'red', raw: false },
          {
            label: advanceReceived > 0 ? `Received (adv. incl.)` : 'Received',
            value: totalReceived,
            color: 'teal',
            raw: false,
          },
          { label: due !== null ? 'Due' : 'Invoiced', value: due !== null ? due : totalInvoiced, color: due !== null && due > 0 ? 'orange' : 'emerald', raw: false },
        ].map(({ label, value, color, raw }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold mt-1 text-${color}-600`}>
              {raw ? value : formatBDT(value as number)}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Project Details</h3>
            {[
              { label: 'Company', value: project.companies?.name },
              { label: 'Proposal Date', value: project.proposal_date ? formatDate(project.proposal_date) : '—' },
              { label: 'Event Start', value: formatDate(project.event_start_date) },
              { label: 'Event End', value: project.event_end_date ? formatDate(project.event_end_date) : 'Same day' },
              { label: 'Location', value: project.location },
              { label: 'Status', value: project.status },
              { label: 'Budget', value: project.budget ? formatBDT(Number(project.budget)) : '—' },
              { label: 'Advance Paid', value: project.advance_received ? formatBDT(Number(project.advance_received)) : '—' },
              { label: 'Featured', value: project.is_featured ? 'Yes' : 'No' },
              { label: 'Cover Photo', value: project.cover_image_url ? 'Added' : 'Missing' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-28 shrink-0 mt-0.5">{label}</span>
                <span className="text-sm text-foreground capitalize">{value ?? '—'}</span>
              </div>
            ))}
            {project.cover_image_url && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Cover Preview</p>
                <img src={project.cover_image_url} alt="Cover" className="w-full h-40 object-cover rounded-lg border border-border" />
              </div>
            )}
          </div>
          <div className="space-y-6">
            {project.description && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-3 text-sm">About the Event (Public)</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            {project.notes && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-3 text-sm">Admin Notes (Internal)</h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{project.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'Expenses' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Expenses</h3>
            <button
              onClick={() => {
                setEditingEntry(null);
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayStr = `${yyyy}-${mm}-${dd}`;
                ledgerForm.reset({ project_id: id!, type: 'expense', paid_status: 'unpaid', entry_date: todayStr });
                setIsLedgerOpen(true);
              }}
              className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Expense
            </button>
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Date', 'Category', 'Amount', 'Status', 'Note', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.filter(e => e.type === 'expense').map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(entry.entry_date)}</td>
                    <td className="px-4 py-2.5">{entry.category}</td>
                    <td className="px-4 py-2.5 font-semibold text-red-500">−{formatBDT(Number(entry.amount))}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={entry.paid_status ?? 'unpaid'} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[150px] truncate">{entry.note ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditingEntry(entry); ledgerForm.reset({ ...entry, project_id: id! }); setIsLedgerOpen(true); }} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(entry.id)} className="p-1 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ledger.filter(e => e.type === 'expense').length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No expense entries yet</td></tr>
                )}
              </tbody>
              {ledger.filter(e => e.type === 'expense').length > 0 && (
                <tfoot className="bg-muted/30 border-t border-border">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-foreground">Total Expenses</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-500">−{formatBDT(totalExpense)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Collections Tab */}
      {activeTab === 'Collections' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Payment Collections</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Total collected: <strong className="text-emerald-600">{formatBDT(totalCollected)}</strong></p>
            </div>
            <button onClick={() => setIsCollectionOpen(true)} className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Collection
            </button>
          </div>
          <div className="space-y-2">
            {/* Show Advance Received as a special entry if it exists */}
            {advanceReceived > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">{formatBDT(advanceReceived)}</p>
                  <p className="text-xs text-emerald-600 font-medium">Advance Payment · Initial</p>
                </div>
                <p className="text-xs text-emerald-600 italic">Project Setup</p>
              </div>
            )}

            {collections.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{formatBDT(Number(c.amount))}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.payment_date)}{c.method ? ` · ${c.method}` : ''}</p>
                </div>
                {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
              </div>
            ))}
            {(collections.length === 0 && advanceReceived === 0) && <p className="text-center py-10 text-sm text-muted-foreground">No payments recorded yet</p>}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'Invoices' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Invoices</h3>
            <button onClick={() => navigate(`/invoices?new=1&project=${id}&company=${project?.company_id ?? ''}`)} className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Create Invoice
            </button>
          </div>
          <div className="space-y-3">
            {invoices.map(inv => (
              <div key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all">
                <div>
                  <p className="font-semibold text-foreground">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground capitalize">{inv.type} · {formatDate(inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">{formatBDT(Number(inv.total_amount))}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            ))}
            {invoices.length === 0 && <p className="text-center py-10 text-sm text-muted-foreground">No invoices yet</p>}
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'Timeline' && durations && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Event Timeline</h3>
            </div>
            {[
              { label: 'Event Duration', value: durations.event_duration_days !== null ? `${durations.event_duration_days} day(s)` : 'N/A' },
              { label: 'Days Since Started', value: durations.days_since_started !== null ? `${durations.days_since_started} days` : 'N/A' },
              { label: 'Days Since Ended', value: durations.days_since_ended !== null ? `${durations.days_since_ended} days ago` : 'N/A' },
              { label: 'Project Completion Time', value: durations.completion_time_days !== null ? `${durations.completion_time_days} days after event end` : 'N/A' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-foreground">Collection Timeline</h3>
            </div>
            {[
              { label: 'Collection Duration', value: durations.collection_duration_days !== null ? `${durations.collection_duration_days} day(s)` : 'Not fully collected' },
              { label: 'Days from Event End to Full Collection', value: durations.days_to_full_collection_from_end !== null ? `${durations.days_to_full_collection_from_end} days` : 'Not fully collected' },
              { label: 'Total Invoiced', value: formatBDT(totalInvoiced) },
              { label: 'Total Collected', value: formatBDT(totalCollected) },
              { label: 'Outstanding Due', value: due !== null ? formatBDT(due) : invoices.length === 0 ? 'No invoices' : formatBDT(0) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>

          {/* Project dates summary */}
          <div className="md:col-span-2 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="font-semibold text-foreground">Key Dates</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Event Start', value: formatDate(project.event_start_date) },
                { label: 'Event End', value: project.event_end_date ? formatDate(project.event_end_date) : 'Same day' },
                { label: 'Project Created', value: project.project_created_at ? formatDate(project.project_created_at) : '—' },
                { label: 'Project Completed', value: project.project_completed_at ? formatDate(project.project_completed_at) : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gallery tab */}
      {activeTab === 'Gallery' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Photo Gallery</h3>
            <div className="flex items-center gap-2">
              <label
                className={`flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${isUploading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary/90'}`}
              >
                <Upload className="h-3.5 w-3.5" /> Select Photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    if (e.target.files) {
                      stageFiles(e.target.files);
                    }
                  }}
                />
              </label>
              {stagedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={uploadStagedFiles}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  <Upload className="h-3.5 w-3.5" /> {isUploading ? 'Uploading...' : `Upload ${stagedFiles.length} Photo(s)`}
                </button>
              )}
            </div>
          </div>
          {uploadError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">{uploadError}</p>
          )}

          {/* Upload preview / staging area */}
          {stagedFiles.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-medium text-amber-800 mb-2">{stagedFiles.length} photo(s) staged for upload — click "Upload" to confirm</p>
              <div className="flex gap-2 flex-wrap">
                {stagedFiles.map((file, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt=""
                      className="w-20 h-20 object-cover rounded-lg border border-amber-300"
                    />
                    <button
                      onClick={() => setStagedFiles(prev => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gallery.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No photos yet. Click "Upload Photos" to add images.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Photos are stored in R2 Cloudflare Storage ({project?.companies?.name})</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gallery.map((photo) => (
                <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDownloadPhoto(photo.url, `photo_${project?.title || 'project'}_${photo.id.slice(0, 8)}.jpg`)}
                      className="p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deletePhoto(photo)}
                      className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                      title="Delete"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
      }

      {/* Ledger Entry Modal */}
      <Modal isOpen={isLedgerOpen} onClose={() => { setIsLedgerOpen(false); setEditingEntry(null); }} title={editingEntry ? 'Edit Entry' : 'Add Ledger Entry'}>
        <form onSubmit={ledgerForm.handleSubmit((v) => saveLedgerMutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select {...ledgerForm.register('type')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <input {...ledgerForm.register('category')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Venue fee" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (৳) *</label>
              <input
                type="number"
                step="0.01"
                {...ledgerForm.register('amount', { valueAsNumber: true })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input type="date" {...ledgerForm.register('entry_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {/* Optional invoice-planning fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Qty <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="1"
                {...ledgerForm.register('quantity', { valueAsNumber: true })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Face Value / Sell Price <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="৳ 0"
                {...ledgerForm.register('face_value', { valueAsNumber: true })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">💡 Qty &amp; Face Value will auto-fill invoice line items for revenue calculation.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setIsLedgerOpen(false); setEditingEntry(null); }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saveLedgerMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              {saveLedgerMutation.isPending ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Collection Modal */}
      <Modal isOpen={isCollectionOpen} onClose={() => setIsCollectionOpen(false)} title="Add Payment Collection">
        <form onSubmit={collectionForm.handleSubmit((v) => saveCollectionMutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (৳) *</label>
              <input type="number" step="0.01" {...collectionForm.register('amount', { valueAsNumber: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date *</label>
              <input type="date" {...collectionForm.register('payment_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <input {...collectionForm.register('method')} placeholder="e.g. bKash, Bank Transfer" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <input {...collectionForm.register('note')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsCollectionOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saveCollectionMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              {saveCollectionMutation.isPending ? 'Saving...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteLedgerMutation.mutate(deleteTarget)}
        title="Delete Entry"
        message="Are you sure you want to delete this ledger entry? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleteLedgerMutation.isPending}
      />

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project">
        <form onSubmit={handleSubmitEdit((v) => saveProjectMutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Title *</label>
            <input {...registerEdit('title', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select {...registerEdit('status')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input {...registerEdit('location')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Dhaka, Bangladesh" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Event Category</label>
            <select
              {...registerEdit('category')}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select Category</option>
              {EVENT_CATEGORIES.filter(c => c !== 'Others').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="Others">Others</option>
            </select>
          </div>
          {isOtherCategory && (
            <div>
              <label className="block text-sm font-medium mb-1">Custom Category Name *</label>
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Event Start Date *</label>
              <input type="date" {...registerEdit('event_start_date', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Event End Date</label>
              <input type="date" {...registerEdit('event_end_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Proposal Date</label>
              <input type="date" {...registerEdit('proposal_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project Completed At</label>
              <input type="date" {...registerEdit('project_completed_at')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Grand Budget (৳)</label>
              <input type="number" step="0.01" {...registerEdit('budget')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Advance Received (৳)</label>
              <input type="number" step="0.01" {...registerEdit('advance_received')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="0.00" />
            </div>
          </div>
          <ImageUpload
            label="Cover Photo"
            value={editCoverImageUrl}
            onChange={(val) => setValueEdit('cover_image_url', val as string)}
            aspect={16 / 9}
            guide="Recommended ratio 16:9 (e.g. 1920x1080)"
          />
          <div>
            <label className="block text-sm font-medium mb-1">About the Event (Description)</label>
            <textarea {...registerEdit('description')} rows={5} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" placeholder="Public description..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Internal Notes</label>
            <textarea {...registerEdit('notes')} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_featured" {...registerEdit('is_featured')} className="rounded" />
            <label htmlFor="is_featured" className="text-sm font-medium">Mark as Featured</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saveProjectMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              {saveProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
