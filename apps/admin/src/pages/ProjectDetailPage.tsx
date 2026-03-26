import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { staffApi, mediaApi, auditApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, ConfirmModal, CascadeConfirmModal } from '@/components/Modal';
import { ImageUpload } from '@/components/ImageUpload';
import { formatBDT, formatDate, formatDateTime } from '@/lib/utils';
import { computeProjectDurations } from '@hellotms/shared';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Clock, DollarSign, Upload, X, ImageIcon, Download, CheckCircle2, MoreVertical, RefreshCw } from 'lucide-react';
import type { Project, LedgerEntry, Collection, Invoice } from '@hellotms/shared';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { useForm } from 'react-hook-form';
import { toast } from '@/components/Toast';
import type { LedgerEntryInput } from '@hellotms/shared';
import { ledgerEntrySchema, collectionSchema, EVENT_CATEGORIES } from '@hellotms/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CollectionInput } from '@hellotms/shared';
import { ProjectForm } from '@/components/ProjectForm';

const TABS = ['Overview', 'Expenses', 'Others Expenses', 'Collections', 'Invoices', 'Timeline', 'Gallery'] as const;
type Tab = typeof TABS[number];



export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile: authProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as Tab) || 'Overview';

  const setActiveTab = (tab: Tab) => {
    setSearchParams({ tab }, { replace: true });
  };
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
  const [deleteCollectionTarget, setDeleteCollectionTarget] = useState<string | null>(null);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<{ id: string; path: string } | null>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<string | null>(null);

  // Gallery viewer & menu state
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [openPhotoMenuId, setOpenPhotoMenuId] = useState<string | null>(null);
  const replacePhotoRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ id: string; path: string } | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setOpenPhotoMenuId(null);
    if (openPhotoMenuId) window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [openPhotoMenuId]);

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
      const { data } = await supabase.from('invoices').select('*').eq('project_id', id!).is('deleted_at', null).order('created_at', { ascending: false });
      return (data ?? []) as Invoice[];
    },
    enabled: !!id,
  });

  // Financials refactored
  const quotedAmount = Number(project?.invoice_amount ?? 0);
  const expenses = ledger.filter(e => e.type === 'expense' && !e.is_external).reduce((s, e) => s + Number(e.amount), 0);
  const otherExpenses = ledger.filter(e => e.type === 'expense' && e.is_external).reduce((s, e) => s + Number(e.amount), 0);
  const clientCollection = collections.reduce((s, c) => s + Number(c.amount), 0) + Number(project?.advance_received ?? 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0);

  // New Metrics
  const vCashAdv = ledger.filter(e => e.type === 'expense' && !e.is_external).reduce((s, e) => s + Number((e as any).paid_amount ?? (e.paid_status === 'paid' ? e.amount : 0)), 0);
  const vCashDue = ledger.filter(e => e.type === 'expense' && !e.is_external).reduce((s, e) => s + Number((e as any).due_amount ?? (e.paid_status === 'paid' ? 0 : e.amount)), 0);

  const netExpenses = expenses + otherExpenses;
  const balanceProfit = quotedAmount - expenses;
  const clientDue = quotedAmount - clientCollection;
  const netProfit = quotedAmount - netExpenses;
  const profitRatio = quotedAmount > 0 ? (netProfit / quotedAmount) * 100 : 0;

  const isPaid = project?.payment_status === 'paid';

  // Turnover: proposal date to paid date (or today if unpaid)
  let turnoverDays = null;
  const startDateStr = project?.proposal_date || project?.event_start_date;
  if (startDateStr) {
    const start = new Date(startDateStr);
    let end = new Date(); // counts up to today if unpaid

    if (isPaid && project?.paid_at) {
      end = new Date(project.paid_at);
    } else if (quotedAmount > 0 && clientCollection >= quotedAmount && collections.length > 0) {
      // Fallback for projects already fully paid but without explicit payment_status
      end = new Date(Math.max(...collections.map(c => new Date(c.payment_date).getTime())));
    }

    turnoverDays = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Timeline durations
  const durations = project ? computeProjectDurations(project, collections, totalInvoiced) : null;

  // Edit project form


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
    defaultValues: {
      project_id: id!,
      type: 'expense',
      paid_status: 'unpaid',
      entry_date: new Date().toISOString().split('T')[0],
      paid_amount: 0,
      due_amount: 0,
    },
  });

  const watchPaidStatus = ledgerForm.watch('paid_status');
  const watchAmount = ledgerForm.watch('amount');

  useEffect(() => {
    const amount = Number(watchAmount) || 0;
    if (watchPaidStatus === 'paid') {
      ledgerForm.setValue('paid_amount', amount);
      ledgerForm.setValue('due_amount', 0);
    } else if (watchPaidStatus === 'unpaid') {
      ledgerForm.setValue('paid_amount', 0);
      ledgerForm.setValue('due_amount', amount);
    } else if (watchPaidStatus === 'partial') {
      const currentPaid = Number(ledgerForm.getValues('paid_amount') || 0);
      ledgerForm.setValue('due_amount', Math.max(0, amount - currentPaid));
    }
  }, [watchPaidStatus, watchAmount, ledgerForm]);

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
      const entry = ledger.find(e => e.id === entryId);
      if (entry) {
        await supabase.from('trash_bin').insert({
          entity_type: 'ledger',
          entity_id: entry.id,
          entity_name: `Expense: ${entry.category} (${formatBDT(Number(entry.amount))})`,
          entity_data: entry,
          deleted_by: authProfile?.id,
        });
      }
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
    defaultValues: {
      project_id: id!,
      payment_date: new Date().toISOString().split('T')[0]
    },
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

  const deleteCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const collection = collections.find(c => c.id === collectionId);
      if (collection) {
        await supabase.from('trash_bin').insert({
          entity_type: 'collection',
          entity_id: collection.id,
          entity_name: `Collection: ${formatBDT(Number(collection.amount))}`,
          entity_data: collection,
          deleted_by: authProfile?.id,
        });
      }
      /* Column missing in DB */
      // const { error } = await supabase.from('collections').update({ deleted_at: new Date().toISOString() }).eq('id', collectionId);
      const { error } = await supabase.from('collections').delete().eq('id', collectionId);
      if (error) throw error;
      auditApi.log({
        action: 'delete_collection',
        entity_type: 'collection',
        entity_id: collectionId,
        before: { id: collectionId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', id] });
      setDeleteCollectionTarget(null);
      toast('Payment deleted', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to delete payment: ${error.message}`, 'error');
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
  // Mark as Paid / Unpaid mutations
  const markAsPaidMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      // 1. Update Project Status
      const { error: projectError } = await supabase.from('projects').update({
        payment_status: 'paid',
        paid_at: now
      }).eq('id', id!);
      if (projectError) throw projectError;

      // 2. Update all associated Invoices to 'paid' (if any)
      if (invoices.length > 0) {
        await supabase.from('invoices').update({
          status: 'paid',
          paid_at: now
        }).eq('project_id', id!);
      }

      auditApi.log({
        action: 'mark_project_paid',
        entity_type: 'project',
        entity_id: id!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
      queryClient.invalidateQueries({ queryKey: ['company-financials', project?.company_id] });
      toast('Project marked as Paid', 'success');
    },
    onError: (e: any) => toast(`Failed to mark as paid: ${e.message}`, 'error')
  });

  const markAsUnpaidMutation = useMutation({
    mutationFn: async () => {
      // 1. Update Project Status
      const { error: projectError } = await supabase.from('projects').update({
        payment_status: 'unpaid',
        paid_at: null
      }).eq('id', id!);
      if (projectError) throw projectError;

      // 2. Potentially revert invoices (optional, but keep it consistent)
      if (invoices.length > 0) {
        await supabase.from('invoices').update({
          status: 'sent',
          paid_at: null
        }).eq('project_id', id!).eq('status', 'paid');
      }

      auditApi.log({
        action: 'mark_project_unpaid',
        entity_type: 'project',
        entity_id: id!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
      queryClient.invalidateQueries({ queryKey: ['company-financials', project?.company_id] });
      toast('Project marked as Unpaid', 'success');
    },
    onError: (e: any) => toast(`Failed to mark as unpaid: ${e.message}`, 'error')
  });


  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      if (!project) return;
      // 1. Move to Trash Bin instead of deleting immediately from storage
      const { error: trashError } = await supabase.from('trash_bin').insert({
        entity_type: 'project',
        entity_id: project.id,
        entity_name: project.title,
        entity_data: project,
        deleted_by: authProfile?.id,
      });
      if (trashError) throw trashError;

      const now = new Date().toISOString();
      const { error } = await supabase.from('projects').update({ deleted_at: now }).eq('id', project.id);
      if (error) throw error;

      // Cascade soft deletes
      await Promise.all([
        supabase.from('invoices').update({ deleted_at: now }).eq('project_id', project.id),
        supabase.from('collections').update({ deleted_at: now }).eq('project_id', project.id),
        supabase.from('ledger_entries').update({ deleted_at: now }).eq('project_id', project.id)
      ]);

      auditApi.log({
        action: 'delete_project',
        entity_type: 'project',
        entity_id: project.id,
        before: project
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
      queryClient.invalidateQueries({ queryKey: ['company-financials', project?.company_id] });
      setDeleteProjectTarget(null);
      toast('Project deleted successfully', 'success');
      navigate('/projects');
    },
    onError: (error: any) => {
      toast(`Failed to delete project: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const saveProjectMutation = useMutation({
    mutationFn: async (values: any) => {
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
        invoice_amount: values.invoice_amount ? Number(values.invoice_amount) : null,
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
      queryClient.invalidateQueries({ queryKey: ['company-financials', project?.company_id] });
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
              after: {
                project_name: project?.title || 'Unknown Project',
                photo_name: file.name
              }
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
  const confirmDeletePhoto = async () => {
    if (!deletePhotoTarget) return;
    try {
      // 1. Move to Trash Bin instead of deleting immediately from storage
      const { error: trashError } = await supabase.from('trash_bin').insert({
        entity_type: 'collection', // Storing as 'collection' temporarily or ideally 'photo' if enum allowed. We'll use 'collection' since we don't have 'photo' enum in migration, but let's just save the JSON.
        entity_id: deletePhotoTarget.id,
        entity_name: `Photo from ${project?.title}`,
        entity_data: { ...deletePhotoTarget, _is_gallery_photo: true },
        deleted_by: authProfile?.id,
      });
      if (trashError) throw trashError;

      // 2. We don't have deleted_at on project_media, so we delete from project_media
      // BUT we don't delete from mediaApi. When it's restored, we re-insert.
      const { error } = await supabase.from('project_media').delete().eq('id', deletePhotoTarget.id);
      if (error) throw error;

      auditApi.log({
        action: 'delete_gallery_photo',
        entity_type: 'project',
        entity_id: id!,
        before: {
          project_name: project?.title || 'Unknown Project',
          photo_name: deletePhotoTarget.path.split('/').pop() || 'photo'
        }
      });

      refetchGallery();
      setDeletePhotoTarget(null);
      toast('Photo deleted', 'success');
    } catch (e: any) {
      console.error('Delete error:', e);
      toast(`Failed to delete photo: ${e.message}`, 'error');
    }
  };

  const handleReplacePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replaceTarget || !id) return;
    setIsUploading(true);
    try {
      // Upload new replacing the old
      const res = await mediaApi.uploadAndCleanMedia(
        file,
        replaceTarget.path,
        'projects/gallery',
        'photo',
        project?.title || 'project'
      );
      if (!res) throw new Error('Upload failed');
      
      // Update DB
      const { error } = await supabase.from('project_media')
        .update({ path: res, url: res }) // mediaApi.uploadAndCleanMedia returns the URL
        .eq('id', replaceTarget.id);
      
      if (error) throw error;
      
      refetchGallery();
      toast('Photo replaced successfully', 'success');
    } catch (err: any) {
      console.error(err);
      toast(`Failed to replace photo: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
      setReplaceTarget(null);
      if (replacePhotoRef.current) replacePhotoRef.current.value = '';
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  if (!project) return <div className="py-20 text-center text-muted-foreground">Project not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 w-full">
          <button onClick={() => navigate('/projects')} className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground mr-1">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <PageHeader title={project.title} description={project.companies?.name ?? ''} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <StatusBadge status={project.status} />
          <button
            onClick={() => {
              setIsEditOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button
            onClick={() => isPaid ? markAsUnpaidMutation.mutate() : markAsPaidMutation.mutate()}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${isPaid
              ? 'border-emerald-300 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
              : 'border-border text-foreground bg-background hover:bg-muted'
              }`}
            disabled={markAsPaidMutation.isPending || markAsUnpaidMutation.isPending}
          >
            {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {isPaid ? 'Payment Received' : 'Mark as Paid'}
          </button>
          <button
            onClick={togglePublished}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${project.is_published ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
          >
            {project.is_published ? '● Published' : '○ Unpublished'}
          </button>
          <button
            onClick={() => setDeleteProjectTarget(project.id)}
            className="p-2 rounded-md hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
            title="Delete Project"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Finance summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {[
          { label: 'Quoted Amount', value: quotedAmount, color: 'indigo', isCurrency: true },
          { label: 'Client Collection', value: clientCollection, color: 'emerald', isCurrency: true },
          { label: 'Client Due', value: clientDue, color: 'blue', isCurrency: true },
          { label: 'Expenses', value: expenses, color: 'red', isCurrency: true },
          { label: 'V-Cash Adv.', value: vCashAdv, color: 'orange', isCurrency: true },
          { label: 'V-Cash Due', value: vCashDue, color: 'amber', isCurrency: true },
          { label: 'Other expense', value: otherExpenses, color: 'purple', isCurrency: true },
          { label: 'Net Expenses', value: netExpenses, color: 'rose', isCurrency: true },
          { label: 'Net profit', value: netProfit, color: netProfit >= 0 ? 'blue' : 'red', isCurrency: true },
          { label: 'Profit Ratio', value: `${profitRatio.toFixed(1)}%`, color: 'cyan', isCurrency: false },
          { label: 'Turn Over Days', value: turnoverDays !== null ? `${turnoverDays} days` : '—', color: 'slate', isCurrency: false },
          { label: 'Status', value: isPaid ? 'Received' : 'Pending', color: isPaid ? 'emerald' : 'red', isCurrency: false },
        ].map(({ label, value, color, isCurrency }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
            <p className={`text-base font-bold mt-1 text-${color}-600 dark:text-${color}-400`}>
              {label === 'Status' ? (
                <span className={isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{value}</span>
              ) : (
                isCurrency ? formatBDT(value as number) : value
              )}
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
              { label: 'Quoted Amount', value: project.invoice_amount ? formatBDT(Number(project.invoice_amount)) : '—' },
              { label: 'Client Collection', value: project.advance_received ? formatBDT(Number(project.advance_received)) : '—' },
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
            <h3 className="font-semibold text-foreground">Standard Expenses</h3>
            <button
              onClick={() => {
                setEditingEntry(null);
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                ledgerForm.reset({ 
                  project_id: id!, 
                  type: 'expense', 
                  paid_status: 'unpaid', 
                  is_external: false, 
                  entry_date: todayStr,
                  paid_amount: 0,
                  due_amount: 0
                });
                setIsLedgerOpen(true);
              }}
              className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Expense
            </button>
          </div>
          <div className="border border-border rounded-xl overflow-x-auto pb-2">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Date', 'Category', 'Total Cost', 'Paid', 'Due', 'Qty', 'Face Value', 'Status', 'Note', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.filter(e => !e.is_external).map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(entry.entry_date)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap max-w-[150px] truncate" title={entry.category}>{entry.category}</td>
                    <td className="px-4 py-2.5 font-bold font-mono whitespace-nowrap text-red-500">
                      {formatBDT(Number(entry.amount))}
                    </td>
                    <td className="px-4 py-2.5 text-emerald-600 font-mono">
                      {formatBDT(Number((entry as any).paid_amount ?? (entry.paid_status === 'paid' ? entry.amount : 0)))}
                    </td>
                    <td className="px-4 py-2.5 text-orange-600 font-mono">
                      {formatBDT(Number((entry as any).due_amount ?? (entry.paid_status === 'paid' ? 0 : entry.amount)))}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{entry.quantity ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{entry.face_value ? formatBDT(Number(entry.face_value)) : '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><StatusBadge status={entry.paid_status ?? 'unpaid'} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[150px] truncate" title={entry.note ?? '—'}>{entry.note ?? '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditingEntry(entry); ledgerForm.reset({ ...entry, project_id: id! }); setIsLedgerOpen(true); }} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(entry.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 dark:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ledger.filter(e => !e.is_external).length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No standard expenses yet</td></tr>
                )}
              </tbody>
              {ledger.filter(e => !e.is_external).length > 0 && (
                <tfoot className="bg-muted/30 border-t border-border">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-foreground text-right">Total Expenses</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-500 font-mono">{formatBDT(expenses)}</td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Others Expenses Tab */}
      {activeTab === 'Others Expenses' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Others Expenses</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Internal or non-standard costs. Not included in Gross Profit.</p>
            </div>
            <button
              onClick={() => {
                setEditingEntry(null);
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                ledgerForm.reset({ 
                  project_id: id!, 
                  type: 'expense', 
                  paid_status: 'unpaid', 
                  is_external: true, 
                  entry_date: todayStr,
                  paid_amount: 0,
                  due_amount: 0
                });
                setIsLedgerOpen(true);
              }}
              className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Other Expense
            </button>
          </div>
          <div className="border border-border rounded-xl overflow-x-auto pb-2">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Date', 'Category', 'Total Cost', 'Paid', 'Due', 'Qty', 'Face Value', 'Status', 'Note', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.filter(e => e.is_external).map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(entry.entry_date)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap max-w-[150px] truncate" title={entry.category}>{entry.category}</td>
                    <td className="px-4 py-2.5 font-bold font-mono whitespace-nowrap text-red-500">
                      {formatBDT(Number(entry.amount))}
                    </td>
                    <td className="px-4 py-2.5 text-emerald-600 font-mono">
                      {formatBDT(Number((entry as any).paid_amount ?? (entry.paid_status === 'paid' ? entry.amount : 0)))}
                    </td>
                    <td className="px-4 py-2.5 text-orange-600 font-mono">
                      {formatBDT(Number((entry as any).due_amount ?? (entry.paid_status === 'paid' ? 0 : entry.amount)))}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{entry.quantity ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{entry.face_value ? formatBDT(Number(entry.face_value)) : '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap"><StatusBadge status={entry.paid_status ?? 'unpaid'} /></td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[150px] truncate" title={entry.note ?? '—'}>{entry.note ?? '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => { setEditingEntry(entry); ledgerForm.reset({ ...entry, project_id: id! }); setIsLedgerOpen(true); }} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(entry.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 dark:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ledger.filter(e => e.is_external).length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No other expenses yet</td></tr>
                )}
              </tbody>
              {ledger.filter(e => e.is_external).length > 0 && (
                <tfoot className="bg-muted/30 border-t border-border">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-foreground text-right">Total Others Expenses</td>
                    <td className="px-4 py-3 text-sm font-bold text-red-500 font-mono">{formatBDT(otherExpenses)}</td>
                    <td colSpan={5}></td>
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
              <h3 className="font-semibold text-foreground">Client Collection</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Total Received: <strong className="text-emerald-600 text-emerald-600 dark:text-emerald-400">{formatBDT(clientCollection)}</strong></p>
            </div>
            <button onClick={openCollectionModal} className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Collection
            </button>
          </div>
          <div className="space-y-2">
            {/* Show Advance Received as a special entry if it exists */}
            {project?.advance_received ? Number(project.advance_received) > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">{formatBDT(Number(project.advance_received))}</p>
                  <p className="text-xs text-emerald-600 text-emerald-600 dark:text-emerald-400 font-medium">Advance Payment · Initial</p>
                </div>
                <p className="text-xs text-emerald-600 text-emerald-600 dark:text-emerald-400 italic">Project Setup</p>
              </div>
            ) : null}

            {collections.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between group">
                <div>
                  <p className="text-sm font-semibold text-foreground">{formatBDT(Number(c.amount))}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.payment_date)}{c.method ? ` · ${c.method}` : ''}</p>
                </div>
                <div className="flex items-center gap-4">
                  {c.note && <p className="text-xs text-muted-foreground mr-2">{c.note}</p>}
                  <button onClick={() => setDeleteCollectionTarget(c.id)} className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 dark:bg-red-500/10 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {(!collections.length && (!project?.advance_received || Number(project.advance_received) === 0)) && <p className="text-center py-10 text-sm text-muted-foreground">No payments recorded yet</p>}
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
                  <p className="text-xs text-muted-foreground capitalize">{inv.type} · {formatDateTime(inv.created_at)}</p>
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
              <DollarSign className="h-5 w-5 text-emerald-600 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-foreground">Collection Timeline</h3>
            </div>
            {[
              { label: 'Collection Duration', value: durations.collection_duration_days !== null ? `${durations.collection_duration_days} day(s)` : 'Not fully collected' },
              { label: 'Days from Event End to Full Collection', value: durations.days_to_full_collection_from_end !== null ? `${durations.days_to_full_collection_from_end} days` : 'Not fully collected' },
              { label: 'Total Invoiced', value: formatBDT(totalInvoiced) },
              { label: 'Total Received', value: formatBDT(clientCollection) },
              { label: 'Outstanding Due (Client)', value: formatBDT(quotedAmount - clientCollection) },
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
                { label: 'Project Created', value: project.project_created_at ? formatDateTime(project.project_created_at) : formatDateTime(project.created_at) },
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
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 rounded-xl">
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
              {gallery.map((photo, idx) => (
                <div key={photo.id} className="relative group aspect-square rounded-lg border border-border">
                  <div className="w-full h-full overflow-hidden rounded-lg">
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => setViewerIndex(idx)}
                    />
                  </div>

                  {/* Dropdown Menu Toggle */}
                  <div className="absolute top-2 right-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenPhotoMenuId(openPhotoMenuId === photo.id ? null : photo.id);
                      }}
                      className="p-1 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 shadow-sm"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    
                    {/* Menu Dropdown */}
                    {openPhotoMenuId === photo.id && (
                      <div className="absolute top-full right-0 mt-1 w-36 bg-popover border border-border rounded-md shadow-md py-1 z-10 flex flex-col text-sm text-popover-foreground">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenPhotoMenuId(null); setViewerIndex(idx); }}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors text-left"
                        >
                          <ImageIcon className="h-3.5 w-3.5" /> View Full Size
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenPhotoMenuId(null); handleDownloadPhoto(photo.url, `photo_${project?.title || 'project'}_${photo.id.slice(0, 8)}.jpg`); }}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors text-left"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenPhotoMenuId(null);
                            setReplaceTarget(photo);
                            replacePhotoRef.current?.click();
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted transition-colors text-left"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Replace
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenPhotoMenuId(null); setDeletePhotoTarget(photo); }}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors text-left"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <input
                type="file"
                accept="image/*"
                ref={replacePhotoRef}
                className="hidden"
                onChange={handleReplacePhotoUpload}
              />
              
              {viewerIndex >= 0 && (
                <PhotoLightbox
                  photos={gallery}
                  initialIndex={viewerIndex}
                  onClose={() => setViewerIndex(-1)}
                />
              )}
            </div>
          )}
        </div>
      )
      }

      {/* Ledger Entry Modal */}
      <Modal isOpen={isLedgerOpen} onClose={() => { setIsLedgerOpen(false); setEditingEntry(null); }} title={editingEntry ? 'Edit Entry' : (ledgerForm.getValues('is_external') ? 'Add Other Expense' : 'Add Expense')}>
        <form onSubmit={ledgerForm.handleSubmit((v: any) => saveLedgerMutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category <span className="text-red-500">*</span></label>
              <input
                {...ledgerForm.register('category')}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${ledgerForm.formState.errors.category ? 'border-red-500' : 'border-border'
                  }`}
                placeholder="e.g. Venue fee"
              />
              {ledgerForm.formState.errors.category && (
                <p className="text-xs text-red-500 mt-1">{(ledgerForm.formState.errors.category as any)?.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                {...ledgerForm.register('entry_date')}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card ${ledgerForm.formState.errors.entry_date ? 'border-red-500' : 'border-border'
                  }`}
              />
              {ledgerForm.formState.errors.entry_date && (
                <p className="text-xs text-red-500 mt-1">{(ledgerForm.formState.errors.entry_date as any)?.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (৳) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                {...ledgerForm.register('amount', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${ledgerForm.formState.errors.amount ? 'border-red-500 transition-colors' : 'border-border'
                  }`}
              />
              {ledgerForm.formState.errors.amount && (
                <p className="text-xs text-red-500 mt-1">{(ledgerForm.formState.errors.amount as any)?.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select {...ledgerForm.register('paid_status')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card">
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial Payment</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Paid (Partial) (৳)</label>
              <input
                type="number"
                step="0.01"
                disabled={watchPaidStatus !== 'partial'}
                {...ledgerForm.register('paid_amount', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const amount = Number(ledgerForm.getValues('amount')) || 0;
                    const paid = Number(e.target.value) || 0;
                    ledgerForm.setValue('due_amount', Math.max(0, amount - paid));
                  }
                })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:bg-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due (৳)</label>
              <input
                type="number"
                step="0.01"
                readOnly
                {...ledgerForm.register('due_amount', { valueAsNumber: true })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-muted"
              />
            </div>
          </div>
          {/* Optional invoice-planning fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${ledgerForm.watch('is_external') ? 'opacity-50' : ''}`}>Qty <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="1"
                disabled={ledgerForm.watch('is_external')}
                {...ledgerForm.register('quantity', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed ${ledgerForm.formState.errors.quantity ? 'border-red-500' : 'border-border'
                  }`}
              />
              {ledgerForm.formState.errors.quantity && (
                <p className="text-xs text-red-500 mt-1">{(ledgerForm.formState.errors.quantity as any)?.message}</p>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${ledgerForm.watch('is_external') ? 'opacity-50' : ''}`}>Face Value / Sell Price <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="৳ 0"
                disabled={ledgerForm.watch('is_external')}
                {...ledgerForm.register('face_value', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed ${ledgerForm.formState.errors.face_value ? 'border-red-500' : 'border-border'
                  }`}
              />
              {ledgerForm.formState.errors.face_value && (
                <p className="text-xs text-red-500 mt-1">{(ledgerForm.formState.errors.face_value as any)?.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-card p-3 rounded-lg border border-border">
            <input
              type="checkbox"
              id="is_external"
              {...ledgerForm.register('is_external')}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="is_external" className="text-sm font-medium text-foreground cursor-pointer focus:outline-none select-none">
              Internal / Other Expense <span className="text-xs text-muted-foreground font-normal">(Gross profit hisab a add hobe na)</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              {...ledgerForm.register('note')}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
            />
          </div>
          {Object.keys(ledgerForm.formState.errors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-800 dark:text-red-400 mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-[11px] text-red-700 dark:text-red-300">
                {Object.entries(ledgerForm.formState.errors).map(([field, error]) => (
                  <li key={field} className="capitalize">{field}: {error?.message?.toString() || 'Invalid value'}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setIsLedgerOpen(false); setEditingEntry(null); }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium">Cancel</button>
            <button
              type="submit"
              disabled={saveLedgerMutation.isPending}
              className="bg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {saveLedgerMutation.isPending ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Collection Modal */}
      <Modal isOpen={isCollectionOpen} onClose={() => setIsCollectionOpen(false)} title="Add Payment Collection">
        <form onSubmit={collectionForm.handleSubmit((v: any) => saveCollectionMutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (৳) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" {...collectionForm.register('amount', { valueAsNumber: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              {collectionForm.formState.errors.amount && (
                <p className="text-xs text-red-500 mt-1">{(collectionForm.formState.errors.amount as any)?.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date <span className="text-red-500">*</span></label>
              <input type="date" {...collectionForm.register('payment_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              {collectionForm.formState.errors.payment_date && (
                <p className="text-xs text-red-500 mt-1">{(collectionForm.formState.errors.payment_date as any)?.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select {...collectionForm.register('method')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card">
                <option value="">Select Method</option>
                <option value="Bkash">Bkash</option>
                <option value="Nagad">Nagad</option>
                <option value="Rocket">Rocket</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <input {...collectionForm.register('note')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Optional note" />
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

      {/* Delete confirms */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteLedgerMutation.mutate(deleteTarget)}
        title="Delete Expense Entry"
        message="Are you sure you want to delete this expense entry? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleteLedgerMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!deleteCollectionTarget}
        onClose={() => setDeleteCollectionTarget(null)}
        onConfirm={() => deleteCollectionTarget && deleteCollectionMutation.mutate(deleteCollectionTarget)}
        title="Delete Payment Collection"
        message="Are you sure you want to delete this payment record? This will affect the total received balance."
        confirmLabel="Delete Payment"
        danger
        loading={deleteCollectionMutation.isPending}
      />

      <ConfirmModal
        isOpen={!!deletePhotoTarget}
        onClose={() => setDeletePhotoTarget(null)}
        onConfirm={confirmDeletePhoto}
        title="Delete Gallery Photo"
        message="Are you sure you want to permanently delete this photo? It will be removed from cloud storage."
        confirmLabel="Delete Photo"
        danger
      />

      <ConfirmModal
        isOpen={!!deleteProjectTarget}
        onClose={() => setDeleteProjectTarget(null)}
        onConfirm={() => deleteProjectTarget && deleteProjectMutation.mutate(deleteProjectTarget)}
        title="Delete Project"
        message="Are you sure you want to delete this project? Data will be moved to the Recycle Bin."
        confirmLabel="Delete Project"
        danger
        loading={deleteProjectMutation.isPending}
      />

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project" size="lg">
        <ProjectForm
          companies={project.companies ? [{ id: project.company_id, name: project.companies.name } as any] : []}
          onSubmit={(v) => saveProjectMutation.mutate(v as any)}
          onCancel={() => setIsEditOpen(false)}
          isPending={saveProjectMutation.isPending}
          defaultValues={project as any}
        />
      </Modal>

      {/* Delete Project Modal */}
      <CascadeConfirmModal
        isOpen={!!deleteProjectTarget}
        onClose={() => setDeleteProjectTarget(null)}
        onConfirm={() => deleteProjectTarget && deleteProjectMutation.mutate(deleteProjectTarget)}
        title="Delete Project"
        targetName={project?.title ?? ''}
        targetType="project"
        cascadeItems={[
          { icon: '🖼️', label: 'All gallery photos', description: 'Project photos stored in cloud storage' },
          { icon: '💰', label: 'All ledger entries', description: 'Income and expense records for this project' },
          { icon: '💳', label: 'All collections', description: 'Payment collection history' },
          { icon: '🧾', label: 'All invoices', description: 'Invoices and their line items' },
        ]}
        confirmLabel="Delete Project"
        loading={deleteProjectMutation.isPending}
      />
    </div>
  );
}
