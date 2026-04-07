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
import { formatBDT, formatDate, formatDateTime, cn } from '@/lib/utils';
import { computeProjectDurations } from '@hellotms/shared';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Clock, DollarSign, Upload, X, ImageIcon, Download, CheckCircle2, MoreVertical, RefreshCw, Maximize2, History, CreditCard, Receipt } from 'lucide-react';
import type { Project, LedgerEntry, Collection, Invoice, LedgerPayment } from '@hellotms/shared';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { useForm } from 'react-hook-form';
import { DataTable } from '@/components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from '@/components/Toast';
import { ledgerEntrySchema, collectionSchema, ledgerPaymentSchema, EVENT_CATEGORIES } from '@hellotms/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CollectionInput, LedgerPaymentInput, LedgerEntryInput } from '@hellotms/shared';
import { ProjectForm } from '@/components/ProjectForm';

const TABS = ['Overview', 'Expenses', 'Others Expenses', 'Payments', 'Collections', 'Invoices', 'Timeline', 'Gallery'] as const;
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
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isMarkAsPaidOpen, setIsMarkAsPaidOpen] = useState(false);
  const [ledgerToPay, setLedgerToPay] = useState<LedgerEntry | null>(null);
  const [editingPayment, setEditingPayment] = useState<LedgerPayment | null>(null);

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
      const { data } = await supabase
        .from('collections')
        .select('*')
        .eq('project_id', id!)
        .is('deleted_at', null)
        .order('payment_date', { ascending: true });
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
  
  const { data: ledgerPayments = [] } = useQuery<LedgerPayment[]>({
    queryKey: ['ledger-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ledger_payments')
        .select(`
          *,
          ledger_entries!inner(category, project_id, is_external)
        `)
        .eq('ledger_entries.project_id', id!)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return (data ?? []) as LedgerPayment[];
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
  const vCashAdv = ledgerPayments.reduce((s, p) => s + Number(p.amount), 0);
  const vCashDue = ledger.filter(e => e.type === 'expense' && !e.is_external).reduce((s, e) => s + Number(e.due_amount ?? (e.paid_status === 'paid' ? 0 : e.amount)), 0);

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

  // Column Definitions for DataTables
  const expenseColumns: ColumnDef<LedgerEntry>[] = [
    { accessorKey: 'entry_date', header: 'Date', cell: ({ row }) => formatDate(row.original.entry_date) },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'amount', header: 'Total Cost', cell: ({ row }) => <span className="font-mono font-bold text-red-500">{formatBDT(row.original.amount)}</span> },
    { accessorKey: 'paid_amount', header: 'Paid', cell: ({ row }) => <span className="font-mono text-emerald-600">{formatBDT(Number(row.original.paid_amount ?? (row.original.paid_status === 'paid' ? row.original.amount : 0)))}</span> },
    { accessorKey: 'due_amount', header: 'Due', cell: ({ row }) => <span className="font-mono text-orange-600">{formatBDT(Number(row.original.due_amount ?? (row.original.paid_status === 'paid' ? 0 : row.original.amount)))}</span> },
    { accessorKey: 'paid_status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.paid_status ?? 'unpaid'} /> },
    { accessorKey: 'note', header: 'Note', cell: ({ row }) => <span className="max-w-[150px] truncate block" title={row.original.note ?? ''}>{row.original.note || '—'}</span> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <button 
            onClick={(e) => { e.stopPropagation(); setEditingEntry(row.original); ledgerForm.reset({ ...row.original, project_id: id! }); setIsLedgerOpen(true); }} 
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all active:scale-95 font-bold text-xs"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          {(Number(row.original.due_amount ?? (Number(row.original.amount) - Number(row.original.paid_amount || 0)))) > 0 && (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setLedgerToPay(row.original); 
                ledgerPaymentForm.reset({ 
                  id: undefined as any,
                  ledger_id: row.original.id, 
                  amount: Number(row.original.due_amount ?? (Number(row.original.amount) - Number(row.original.paid_amount || 0))),
                  payment_date: new Date().toISOString().split('T')[0],
                  method: 'Cash'
                });
                setIsPaymentOpen(true); 
              }} 
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all active:scale-95 font-bold text-xs" 
              title="Add Payment"
            >
              <Plus className="h-3.5 w-3.5" />
              Payment
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row.original.id); }} 
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all active:scale-95 font-bold text-xs"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )
    }
  ];

  const collectionColumns: ColumnDef<Collection>[] = [
    { accessorKey: 'payment_date', header: 'Date', cell: ({ row }) => formatDate(row.original.payment_date) },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-mono font-bold text-emerald-600">{formatBDT(row.original.amount)}</span> },
    { accessorKey: 'method', header: 'Method', cell: ({ row }) => <span className="capitalize">{row.original.method || '—'}</span> },
    { accessorKey: 'note', header: 'Note', cell: ({ row }) => <span className="max-w-[200px] truncate block">{row.original.note || '—'}</span> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <button 
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              collectionForm.reset(row.original); 
              setIsCollectionOpen(true); 
            }} 
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all active:scale-95 font-bold text-xs"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button 
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              setDeleteCollectionTarget(row.original.id); 
            }} 
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all active:scale-95 font-bold text-xs"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )
    }
  ];

  const invoiceColumns: ColumnDef<Invoice>[] = [
    { accessorKey: 'invoice_number', header: 'Number', cell: ({ row }) => <span className="font-semibold">{row.original.invoice_number}</span> },
    { accessorKey: 'type', header: 'Type', cell: ({ row }) => <span className="capitalize">{row.original.type}</span> },
    { accessorKey: 'total_amount', header: 'Amount', cell: ({ row }) => <span className="font-bold">{formatBDT(row.original.total_amount)}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'created_at', header: 'Date', cell: ({ row }) => formatDateTime(row.original.created_at) },
  ];

  const paymentColumns: ColumnDef<LedgerPayment>[] = [
    { accessorKey: 'payment_date', header: 'Date', cell: ({ row }) => formatDate(row.original.payment_date) },
    { 
      id: 'type', 
      header: 'Type', 
      cell: ({ row }) => (
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter",
          (row.original as any).ledger_entries?.is_external 
            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" 
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        )}>
          {(row.original as any).ledger_entries?.is_external ? 'Other' : 'Standard'}
        </span>
      )
    },
    { accessorKey: 'ledger_entries.category', header: 'Expense For', cell: ({ row }) => (row.original as any).ledger_entries?.category || '—' },
    { accessorKey: 'amount', header: 'Paid Amount', cell: ({ row }) => <span className="font-mono font-bold text-teal-600">{formatBDT(row.original.amount)}</span> },
    { accessorKey: 'method', header: 'Method', cell: ({ row }) => <span className="capitalize">{row.original.method || '—'}</span> },
    { accessorKey: 'note', header: 'Note', cell: ({ row }) => <span className="max-w-[200px] truncate block">{row.original.note || '—'}</span> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <button 
           onClick={(e) => { 
             e.preventDefault();
             e.stopPropagation(); 
             setEditingPayment(row.original);
             ledgerPaymentForm.reset(row.original);
             setIsPaymentOpen(true); 
           }} 
           className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all active:scale-95 font-bold text-xs"
           title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setDeletePaymentTarget(row.original.id); }} 
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all active:scale-95 font-bold text-xs"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )
    }
  ];

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
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
      setDeleteTarget(null);
      toast('Entry deleted', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to delete: ${error.message}`, 'error');
    }
  });

  const collectionForm = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      project_id: id!,
      payment_date: new Date().toISOString().split('T')[0]
    },
  });

  const ledgerPaymentForm = useForm<LedgerPaymentInput>({
    resolver: zodResolver(ledgerPaymentSchema),
    defaultValues: {
      id: undefined as any,
      ledger_id: '',
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      method: 'Cash',
    }
  });

  const watchLedgerId = ledgerPaymentForm.watch('ledger_id');
  useEffect(() => {
    if (watchLedgerId && !editingPayment) {
      const selected = ledger.find(l => l.id === watchLedgerId);
      if (selected) {
        const due = Number(selected.due_amount ?? (Number(selected.amount) - Number(selected.paid_amount || 0)));
        ledgerPaymentForm.setValue('amount', due);
      }
    }
  }, [watchLedgerId, ledger, ledgerPaymentForm, editingPayment]);


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

  const syncProjectPaymentStatus = async (projectId: string) => {
    // 1. Fetch fresh project and collections
    const { data: proj } = await supabase.from('projects').select('invoice_amount, advance_received, paid_at').eq('id', projectId).single();
    if (!proj) return;

    const { data: colls } = await supabase.from('collections').select('amount').eq('project_id', projectId).is('deleted_at', null);
    const totalColl = (colls ?? []).reduce((s, c) => s + Number(c.amount), 0) + Number(proj.advance_received || 0);
    const invoiceAmt = Number(proj.invoice_amount || 0);

    const isFullyPaid = invoiceAmt > 0 && totalColl >= invoiceAmt;
    
    // 2. Update project status accordingly
    await supabase.from('projects').update({
      payment_status: isFullyPaid ? 'paid' : 'unpaid',
      paid_at: isFullyPaid ? (proj.paid_at || new Date().toISOString()) : null
    }).eq('id', projectId);

    // 3. Sync invoices
    if (isFullyPaid) {
      await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('project_id', projectId).eq('status', 'sent');
    } else {
      await supabase.from('invoices').update({ status: 'sent', paid_at: null }).eq('project_id', projectId).eq('status', 'paid');
    }

    // 4. Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-invoices', projectId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
  };

  const saveCollectionMutation = useMutation({
    mutationFn: async (values: CollectionInput) => {
      const { id: isEditing, ...dataToSave } = values as any;
      if (isEditing) {
        const { error } = await supabase.from('collections').update(dataToSave).eq('id', isEditing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('collections').insert(dataToSave);
        if (error) throw error;
      }
      await syncProjectPaymentStatus(id!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', id] });
      setIsCollectionOpen(false);
      collectionForm.reset({ project_id: id!, payment_date: new Date().toISOString().split('T')[0] });
      toast('Client collection updated and status synced', 'success');
    },
    onError: (error: any) => toast(`Error: ${error.message}`, 'error')
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
      const { error } = await supabase.from('collections').update({ deleted_at: new Date().toISOString() }).eq('id', collectionId);
      if (error) throw error;
      
      await syncProjectPaymentStatus(id!);
      
      auditApi.log({
        action: 'delete_collection',
        entity_type: 'collection',
        entity_id: collectionId,
        before: collection || { id: collectionId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', id] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setDeleteCollectionTarget(null);
      toast('Payment removed and status updated', 'success');
    },
    onError: (error: any) => toast(`Failed to delete payment: ${error.message}`, 'error')
  });

  const saveLedgerPaymentMutation = useMutation({
    mutationFn: async (values: LedgerPaymentInput) => {
      const { id: isEditing, ...dataToSave } = values as any;
      let paymentId = isEditing;
      let diff = 0;
      let ledgerId = dataToSave.ledger_id;

      if (isEditing) {
        // 1. Get old payment to calc diff
        const { data: oldP } = await supabase.from('ledger_payments').select('amount').eq('id', isEditing).single();
        if (oldP) diff = Number(dataToSave.amount) - Number(oldP.amount);

        const { error } = await supabase.from('ledger_payments').update(dataToSave).eq('id', isEditing);
        if (error) throw error;
        auditApi.log({ action: 'update_expense_payment', entity_type: 'ledger_payment', entity_id: isEditing, after: values });
      } else {
        const { data, error } = await supabase.from('ledger_payments').insert(dataToSave).select().single();
        if (error) throw error;
        paymentId = data.id;
        diff = Number(dataToSave.amount);
        auditApi.log({ action: 'create_expense_payment', entity_type: 'ledger_payment', entity_id: paymentId, after: values });
      }

      // 2. Sync Ledger Entry
      const ledgerEntry = ledger.find(e => e.id === ledgerId);
      if (ledgerEntry) {
        const newPaid = Number(ledgerEntry.paid_amount ?? 0) + diff;
        const newDue = Math.max(0, Number(ledgerEntry.amount) - newPaid);
        const newStatus = newDue <= 0 ? 'paid' : (newPaid <= 0 ? 'unpaid' : 'partial');

        await supabase.from('ledger_entries').update({ 
          paid_amount: newPaid, 
          due_amount: newDue, 
          paid_status: newStatus 
        }).eq('id', ledgerId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger', id] });
      queryClient.invalidateQueries({ queryKey: ['ledger-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setIsPaymentOpen(false);
      setLedgerToPay(null);
      setEditingPayment(null);
      ledgerPaymentForm.reset({ ledger_id: '', amount: 0, payment_date: new Date().toISOString().split('T')[0], method: 'Cash' });
      toast('Payment saved and balance synced', 'success');
    },
    onError: (error: any) => toast(`Failed to save payment: ${error.message}`, 'error')
  });

  const deleteLedgerPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data: payment } = await supabase.from('ledger_payments').select('*').eq('id', paymentId).single();
      if (!payment) return;

      const { error: dError } = await supabase.from('ledger_payments').update({ deleted_at: new Date().toISOString() }).eq('id', paymentId);
      if (dError) throw dError;

      const ledgerEntry = ledger.find(e => e.id === payment.ledger_id);
      if (ledgerEntry) {
        const entryAmount = Number(ledgerEntry.amount);
        const newPaid = Math.max(0, Number(ledgerEntry.paid_amount ?? 0) - Number(payment.amount));
        const newDue = Math.max(0, entryAmount - newPaid);
        const newStatus = newPaid <= 0 ? 'unpaid' : (newDue <= 0 ? 'paid' : 'partial');

        await supabase.from('ledger_entries').update({ 
          paid_amount: newPaid, 
          due_amount: newDue, 
          paid_status: newStatus 
        }).eq('id', payment.ledger_id);
      }

      auditApi.log({
        action: 'delete_expense_payment',
        entity_type: 'ledger_payment',
        entity_id: paymentId,
        before: payment
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger', id] });
      queryClient.invalidateQueries({ queryKey: ['ledger-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      setDeletePaymentTarget(null);
      toast('Payment deleted and balance restored', 'success');
    }
  });

  const markAsPaidWithDetailsMutation = useMutation({
    mutationFn: async (values: { amount: number; payment_date: string; method: string; note?: string }) => {
      const { data: collection, error: cError } = await supabase.from('collections').insert({
        project_id: id!,
        amount: values.amount,
        payment_date: values.payment_date,
        method: values.method,
        note: values.note
      }).select().single();
      if (cError) throw cError;

      const { error: pError } = await supabase.from('projects').update({
        payment_status: 'paid',
        paid_at: values.payment_date
      }).eq('id', id!);
      if (pError) throw pError;

      if (invoices.length > 0) {
        await supabase.from('invoices').update({ status: 'paid', paid_at: values.payment_date }).eq('project_id', id!);
      }

      auditApi.log({
        action: 'mark_project_paid',
        entity_type: 'project',
        entity_id: id!,
        after: { ...values, collection_id: collection.id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['collections', id] });
      queryClient.invalidateQueries({ queryKey: ['project-invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
      setIsMarkAsPaidOpen(false);
      toast('Project marked as paid and collection recorded', 'success');
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
      const { error: projectError } = await supabase.from('projects').update({
        payment_status: 'paid',
        paid_at: now
      }).eq('id', id!);
      if (projectError) throw projectError;

      if (invoices.length > 0) {
        await supabase.from('invoices').update({ status: 'paid', paid_at: now }).eq('project_id', id!);
      }

      auditApi.log({
        action: 'mark_project_paid_status_only',
        entity_type: 'project',
        entity_id: id!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['project-invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
      toast('Project marked as Paid', 'success');
    },
    onError: (e: any) => toast(`Failed to mark as paid: ${e.message}`, 'error')
  });

  const markAsUnpaidMutation = useMutation({
    mutationFn: async () => {
      // 1. Find the latest collection for this project to "revert" the paid action
      const { data: latestCollections } = await supabase
        .from('collections')
        .select('*')
        .eq('project_id', id!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      const latestColl = latestCollections?.[0];
      if (latestColl) {
        // Move to trash
        await supabase.from('trash_bin').insert({
          entity_type: 'collection',
          entity_id: latestColl.id,
          entity_name: `Reverted Collection: ${formatBDT(Number(latestColl.amount))}`,
          entity_data: latestColl,
          deleted_by: authProfile?.id,
        });
        // Soft delete
        await supabase.from('collections').update({ deleted_at: new Date().toISOString() }).eq('id', latestColl.id);
      }

      // 2. Update Project Status
      const { error: projectError } = await supabase.from('projects').update({
        payment_status: 'unpaid',
        paid_at: null
      }).eq('id', id!);
      if (projectError) throw projectError;

      // 3. Revert invoices
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
        after: { reverted_collection_id: latestColl?.id }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['collections', id] });
      queryClient.invalidateQueries({ queryKey: ['project-invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trend'] });
      toast('Project marked as Unpaid & latest collection reverted', 'success');
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['collections', id] });
      queryClient.refetchQueries({ queryKey: ['project', id] });
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

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 custom-scrollbar-hide flex-nowrap">
          <div className="flex-shrink-0">
            <StatusBadge status={project.status} className="h-9 px-3 flex items-center justify-center text-xs" />
          </div>
          <button
            onClick={() => {
              setIsEditOpen(true);
            }}
            className="flex items-center gap-2 text-xs border border-border px-3 h-9 rounded-lg hover:bg-muted transition-colors text-muted-foreground whitespace-nowrap flex-shrink-0"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={() => {
              if (isPaid) {
                markAsUnpaidMutation.mutate();
              } else {
                if (clientDue <= 0) {
                  markAsPaidMutation.mutate();
                } else {
                  setIsMarkAsPaidOpen(true);
                }
              }
            }}
            className={`flex items-center gap-2 text-xs px-3 h-9 rounded-lg border transition-colors whitespace-nowrap flex-shrink-0 ${isPaid
              ? 'border-emerald-300 text-emerald-800 bg-emerald-100 hover:bg-emerald-200 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
              : 'border-border text-foreground bg-background hover:bg-muted'
              }`}
            disabled={markAsPaidMutation.isPending || markAsPaidWithDetailsMutation.isPending || markAsUnpaidMutation.isPending}
          >
            {isPaid ? <CheckCircle2 className="h-4 w-4" /> : null}
            {isPaid ? 'Payment Received' : 'Mark as Paid'}
          </button>
          <button
            onClick={togglePublished}
            className={`flex items-center gap-2 px-3 h-9 text-xs font-medium rounded-full border transition-colors whitespace-nowrap flex-shrink-0 ${project.is_published ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400' : 'border-border text-muted-foreground hover:text-foreground'
              }`}
          >
            {project.is_published ? '● Published' : '○ Unpublished'}
          </button>
          <button
            onClick={() => setDeleteProjectTarget(project.id)}
            className="flex items-center justify-center h-9 w-10 flex-shrink-0 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500 border border-border md:border-0"
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
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-semibold text-foreground">Standard Expenses</h3>
              <p className="text-xs text-muted-foreground">Standard costs included in Gross Profit.</p>
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
                  is_external: false, 
                  entry_date: todayStr,
                  paid_amount: 0,
                  due_amount: 0
                });
                setIsLedgerOpen(true);
              }}
              className="flex items-center gap-2 text-sm bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl hover:bg-primary/20 transition-all font-bold backdrop-blur-sm active:scale-95"
            >
              <Plus className="h-4 w-4" /> Add Expense
            </button>
          </div>
          <DataTable 
            data={ledger.filter(e => !e.is_external)} 
            columns={expenseColumns} 
            searchKey="category"
            searchPlaceholder="Search category..."
            footerRow={ledger.filter(e => !e.is_external).length > 0 && (
              <tr className="bg-muted/50 font-bold border-t-2 border-border">
                <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground">Total Expenses:</td>
                <td className="px-4 py-3 text-red-500 font-mono">{formatBDT(expenses)}</td>
                <td colSpan={5}></td>
              </tr>
            )}
          />
        </div>
      )}

      {/* Others Expenses Tab */}
      {activeTab === 'Others Expenses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-semibold text-foreground">Others Expenses</h3>
              <p className="text-xs text-muted-foreground">Internal or non-standard costs. Not included in Gross Profit.</p>
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
              className="flex items-center gap-2 text-sm bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl hover:bg-primary/20 transition-all font-bold backdrop-blur-sm active:scale-95"
            >
              <Plus className="h-4 w-4" /> Add Other Expense
            </button>
          </div>
          <DataTable 
            data={ledger.filter(e => e.is_external)} 
            columns={expenseColumns} 
            searchKey="category"
            searchPlaceholder="Search category..."
            footerRow={ledger.filter(e => e.is_external).length > 0 && (
              <tr className="bg-muted/50 font-bold border-t-2 border-border">
                <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground">Total Other Expenses:</td>
                <td className="px-4 py-3 text-red-500 font-mono">{formatBDT(otherExpenses)}</td>
                <td colSpan={5}></td>
              </tr>
            )}
          />
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'Payments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-semibold text-foreground text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-teal-600" />
                Staff/Vendor Payments
              </h3>
              <p className="text-xs text-muted-foreground">History of payments made towards expenses (V-Cash details).</p>
            </div>
            <button
                onClick={() => {
                  setLedgerToPay(null);
                  ledgerPaymentForm.reset({
                    id: undefined as any,
                    ledger_id: '',
                    amount: 0,
                    payment_date: new Date().toISOString().split('T')[0],
                    method: 'Cash'
                  });
                  setIsPaymentOpen(true);
                }}
                className="flex items-center gap-2 text-sm bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-4 py-2 rounded-xl hover:bg-emerald-500/20 transition-all font-bold backdrop-blur-sm active:scale-95"
              >
                <Plus className="h-4 w-4" /> Add Payment
              </button>
          </div>
          <DataTable 
            data={ledgerPayments} 
            columns={paymentColumns} 
            searchKey="note"
            searchPlaceholder="Search notes..."
            footerRow={ledgerPayments.length > 0 && (
              <tr className="bg-emerald-500/5 font-bold border-t-2 border-emerald-500/20">
                <td colSpan={2} className="px-4 py-3 text-right text-muted-foreground">Total Paid (V-Cash Adv):</td>
                <td className="px-4 py-3 text-teal-600 font-mono">{formatBDT(vCashAdv)}</td>
                <td colSpan={3}></td>
              </tr>
            )}
          />
        </div>
      )}

      {/* Collections Tab */}
      {activeTab === 'Collections' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-semibold text-foreground">Client Collection</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Total Received: <strong className="text-emerald-600 dark:text-emerald-400">{formatBDT(clientCollection)}</strong></p>
            </div>
            <button onClick={openCollectionModal} className="flex items-center gap-2 text-sm bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl hover:bg-primary/20 transition-all font-bold backdrop-blur-sm active:scale-95">
              <Plus className="h-4 w-4" /> Add Collection
            </button>
          </div>

          {/* Show Advance Received as a special entry if it exists */}
          {project?.advance_received ? Number(project.advance_received) > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/30 rounded-xl p-4 flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatBDT(Number(project.advance_received))}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Advance Payment · Initial</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600/50">Project Setup</p>
              </div>
            </div>
          ) : null}

          <DataTable 
            data={collections} 
            columns={collectionColumns} 
            searchKey="note"
            searchPlaceholder="Search notes..."
            onRowClick={(row) => {
              collectionForm.reset(row);
              setIsCollectionOpen(true);
            }}
          />
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'Invoices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-semibold text-foreground">Invoices</h3>
              <p className="text-xs text-muted-foreground">Estimate and Billing history.</p>
            </div>
            <button onClick={() => navigate(`/invoices?new=1&project=${id}&company=${project?.company_id ?? ''}`)} className="flex items-center gap-2 text-sm bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-xl hover:bg-primary/20 transition-all font-bold backdrop-blur-sm active:scale-95">
              <Plus className="h-4 w-4" /> Create Invoice
            </button>
          </div>
          <DataTable 
            data={invoices} 
            columns={invoiceColumns} 
            onRowClick={(row) => navigate(`/invoices/${row.id}`)}
            searchKey="invoice_number"
            searchPlaceholder="Search invoice number..."
          />
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
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-1.5 mb-4">{uploadError}</p>
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
                  <div className="w-full h-full overflow-hidden rounded-lg relative cursor-pointer" onClick={() => setViewerIndex(idx)}>
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2 px-2.5">
                      <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-lg border border-white/30 shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                        <Maximize2 className="h-4 w-4 text-white" />
                      </div>
                    </div>
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
      <Modal isOpen={isLedgerOpen} onClose={() => { setIsLedgerOpen(false); setEditingEntry(null); }} title={editingEntry ? (editingEntry.is_external ? 'Update Other Expense' : 'Update Expense') : (ledgerForm.watch('is_external') ? 'Add Other Expense' : 'Add Expense')} size="sm">
        <form onSubmit={ledgerForm.handleSubmit((v: any) => saveLedgerMutation.mutate(v))} className="space-y-3">
          {editingEntry && <input type="hidden" {...ledgerForm.register('id' as any)} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Category <span className="text-red-500">*</span></label>
              <input
                {...ledgerForm.register('category')}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${ledgerForm.formState.errors.category ? 'border-red-500' : 'border-border'
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
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card ${ledgerForm.formState.errors.entry_date ? 'border-red-500' : 'border-border'
                  }`}
              />
              {ledgerForm.formState.errors.entry_date && (
                <p className="text-xs text-red-500 mt-1">{(ledgerForm.formState.errors.entry_date as any)?.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (৳) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                {...ledgerForm.register('amount', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${ledgerForm.formState.errors.amount ? 'border-red-500 transition-colors' : 'border-border'
                  }`}
              />
              {ledgerForm.formState.errors.amount && (
                <p className="text-xs text-red-500 mt-1">{(ledgerForm.formState.errors.amount as any)?.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select {...ledgerForm.register('paid_status')} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card">
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial Payment</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:bg-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due (৳)</label>
              <input
                type="number"
                step="0.01"
                readOnly
                {...ledgerForm.register('due_amount', { valueAsNumber: true })}
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-muted"
              />
            </div>
          </div>
          {/* Optional invoice-planning fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${ledgerForm.watch('is_external') ? 'opacity-50' : ''}`}>Qty <span className="text-xs text-muted-foreground font-normal">(optional)</span></label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="1"
                disabled={ledgerForm.watch('is_external')}
                {...ledgerForm.register('quantity', { valueAsNumber: true })}
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed ${ledgerForm.formState.errors.quantity ? 'border-red-500' : 'border-border'
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
                className={`w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed ${ledgerForm.formState.errors.face_value ? 'border-red-500' : 'border-border'
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
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
            />
          </div>
          {Object.keys(ledgerForm.formState.errors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-800 dark:text-red-400 mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-[11px] text-red-700 dark:text-red-300">
                {Object.entries(ledgerForm.formState.errors).map(([field, error]) => (
                  <li key={field} className="capitalize">{field}: {(error as any)?.message?.toString() || 'Invalid value'}</li>
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
              {saveLedgerMutation.isPending ? 'Saving...' : (editingEntry ? 'Update Entry' : 'Save Entry')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Collection Modal */}
      <Modal isOpen={isCollectionOpen} onClose={() => setIsCollectionOpen(false)} title={collectionForm.watch('id' as any) ? 'Update Client Collection' : 'Add Client Collection'} size="sm">
        <form onSubmit={collectionForm.handleSubmit((v: any) => saveCollectionMutation.mutate(v))} className="space-y-3">
          {collectionForm.watch('id' as any) && <input type="hidden" {...collectionForm.register('id' as any)} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (৳) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" {...collectionForm.register('amount', { valueAsNumber: true })} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              {collectionForm.formState.errors.amount && (
                <p className="text-xs text-red-500 mt-1">{(collectionForm.formState.errors.amount as any)?.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date <span className="text-red-500">*</span></label>
              <input type="date" {...collectionForm.register('payment_date')} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              {collectionForm.formState.errors.payment_date && (
                <p className="text-xs text-red-500 mt-1">{(collectionForm.formState.errors.payment_date as any)?.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select {...collectionForm.register('method')} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card">
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
              <input {...collectionForm.register('note')} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Optional note" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsCollectionOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saveCollectionMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
              {saveCollectionMutation.isPending ? 'Saving...' : (collectionForm.watch('id' as any) ? 'Update Payment' : 'Add Payment')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ledger Payment Modal (Expense Payment / V-Cash) */}
      <Modal isOpen={isPaymentOpen} onClose={() => { setIsPaymentOpen(false); setLedgerToPay(null); setEditingPayment(null); }} title={editingPayment ? 'Update Expense Payment' : 'Add Expense Payment'} size="sm">
        <form onSubmit={ledgerPaymentForm.handleSubmit((v) => saveLedgerPaymentMutation.mutate(v))} className="space-y-3">
          {editingPayment && <input type="hidden" {...ledgerPaymentForm.register('id' as any)} />}
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-foreground">Select Expense to Pay <span className="text-red-500">*</span></label>
            <select 
              {...ledgerPaymentForm.register('ledger_id')}
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card"
            >
              <option value="">Select Expense</option>
              {ledger.filter(l => l.type === 'expense' && (editingPayment?.ledger_id === l.id || (l.due_amount || (Number(l.amount) - (Number(l.paid_amount) || 0))) > 0)).map(l => (
                <option key={l.id} value={l.id}>
                  {l.category} - Due: {formatBDT(Number(l.due_amount ?? (Number(l.amount) - Number(l.paid_amount || 0))))}
                </option>
              ))}
            </select>
          </div>
          {watchLedgerId && (
            <div className="bg-muted/50 p-2 px-3 rounded-lg border border-border/50">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Expense Type</label>
              <span className="text-sm font-semibold text-foreground">
                {ledger.find(l => l.id === watchLedgerId)?.is_external ? 'Other Expense' : 'Standard Expense'}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount to Pay (৳) <span className="text-red-500">*</span></label>
              <input type="number" step="0.01" {...ledgerPaymentForm.register('amount', { valueAsNumber: true })} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date <span className="text-red-500">*</span></label>
              <input type="date" {...ledgerPaymentForm.register('payment_date')} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select {...ledgerPaymentForm.register('method')} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card">
                <option value="Cash">Cash</option>
                <option value="Bkash">Bkash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <input {...ledgerPaymentForm.register('note')} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Whom, why, etc." />
            </div>
          </div>
          {Object.keys(ledgerPaymentForm.formState.errors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-foreground">
              <p className="text-xs font-semibold text-red-800 dark:text-red-400 mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-[11px] text-red-700 dark:text-red-300">
                {Object.entries(ledgerPaymentForm.formState.errors).map(([field, error]) => (
                  <li key={field} className="capitalize">{field}: {(error as any)?.message?.toString() || 'Invalid value'}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setIsPaymentOpen(false); setLedgerToPay(null); setEditingPayment(null); }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium">Cancel</button>
            <button type="submit" disabled={saveLedgerPaymentMutation.isPending} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 font-medium">
              {saveLedgerPaymentMutation.isPending ? 'Processing...' : (editingPayment ? 'Update Payment' : 'Confirm Payment')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mark As Paid Confirmation Modal */}
      <Modal isOpen={isMarkAsPaidOpen} onClose={() => setIsMarkAsPaidOpen(false)} title="Confirm Final Payment & Mark as Paid" size="sm">
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          markAsPaidWithDetailsMutation.mutate({
            amount: Number(fd.get('amount')),
            payment_date: fd.get('payment_date') as string,
            method: fd.get('method') as string,
            note: fd.get('note') as string,
          });
        }} className="space-y-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/30 rounded-xl">
            <p className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">This will record the final collection and mark the project as fully paid.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Final Amount (৳) <span className="text-red-500">*</span></label>
              <input type="number" name="amount" step="0.01" required defaultValue={clientDue} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date <span className="text-red-500">*</span></label>
              <input type="date" name="payment_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Method <span className="text-red-500">*</span></label>
              <select name="method" required className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card">
                <option value="Cash">Cash</option>
                <option value="Bkash">Bkash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <input name="note" className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Final payment note" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsMarkAsPaidOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted font-medium">Cancel</button>
            <button type="submit" disabled={markAsPaidWithDetailsMutation.isPending} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 font-medium">
              {markAsPaidWithDetailsMutation.isPending ? 'Confirm & Mark Paid' : 'Confirm & Mark Paid'}
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
        isOpen={!!deletePaymentTarget}
        onClose={() => setDeletePaymentTarget(null)}
        onConfirm={() => deletePaymentTarget && deleteLedgerPaymentMutation.mutate(deletePaymentTarget)}
        title="Delete Expense Payment"
        message="Are you sure you want to delete this payment record? The expense's due balance will be restored."
        confirmLabel="Delete Payment"
        danger
        loading={deleteLedgerPaymentMutation.isPending}
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
          initialData={project as any}
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
