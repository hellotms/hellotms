import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, ConfirmModal } from '@/components/Modal';
import { ImageUpload } from '@/components/ImageUpload';
import { formatBDT, formatDate } from '@/lib/utils';
import { computeProjectDurations } from '@hellotms/shared';
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Clock, DollarSign, Upload, X, ImageIcon } from 'lucide-react';
import type { Project, LedgerEntry, Collection, Invoice } from '@hellotms/shared';
import { useForm } from 'react-hook-form';
import type { LedgerEntryInput } from '@hellotms/shared';
import { ledgerEntrySchema, collectionSchema } from '@hellotms/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CollectionInput } from '@hellotms/shared';

const TABS = ['Overview', 'Ledger', 'Collections', 'Invoices', 'Timeline', 'Gallery'] as const;
type Tab = typeof TABS[number];

type EditProjectInput = {
  title: string;
  status: string;
  location?: string;
  event_start_date: string;
  event_end_date?: string;
  notes?: string;
  is_featured: boolean;
  project_completed_at?: string;
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);


  const { data: project, isLoading } = useQuery<Project & { companies: { name: string; phone?: string; email?: string } | null }>({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*, companies(name, phone, email)').eq('id', id!).single();
      if (error) throw error;
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
  const totalIncome = ledger.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpense = ledger.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const profit = totalIncome - totalExpense;
  const totalCollected = collections.reduce((s, c) => s + Number(c.amount), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  const due = totalInvoiced - totalCollected;

  // Timeline durations
  const durations = project ? computeProjectDurations(project, collections, totalInvoiced) : null;

  // Edit project form
  const editProjectForm = useForm<EditProjectInput>();

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

  // Ledger form
  const ledgerForm = useForm<LedgerEntryInput>({
    resolver: zodResolver(ledgerEntrySchema),
    defaultValues: { project_id: id!, type: 'income', paid_status: 'unpaid' },
  });

  const saveLedgerMutation = useMutation({
    mutationFn: async (values: LedgerEntryInput) => {
      if (editingEntry) {
        const { error } = await supabase.from('ledger_entries').update(values).eq('id', editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ledger_entries').insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger', id] });
      setIsLedgerOpen(false);
      setEditingEntry(null);
      ledgerForm.reset({ project_id: id!, type: 'income', paid_status: 'unpaid' });
    },
  });

  const deleteLedgerMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from('ledger_entries').update({ deleted_at: new Date().toISOString() }).eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger', id] });
      setDeleteTarget(null);
    },
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
      const { error } = await supabase.from('collections').insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections', id] });
      setIsCollectionOpen(false);
      collectionForm.reset({ project_id: id! });
    },
  });

  // Toggle published
  const togglePublished = async () => {
    if (!project) return;
    await supabase.from('projects').update({ is_published: !project.is_published }).eq('id', id!);
    queryClient.invalidateQueries({ queryKey: ['project', id] });
  };

  // Save edited project
  const saveProjectMutation = useMutation({
    mutationFn: async (values: EditProjectInput) => {
      const { error } = await supabase.from('projects').update(values).eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setIsEditOpen(false);
    },
  });

  // Gallery upload
  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || !id) return;
    setIsUploading(true);
    setUploadError('');
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `projects/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('project-media').upload(path, file);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('project-media').getPublicUrl(path);
        await supabase.from('project_media').insert({ project_id: id, path, url: urlData.publicUrl });
      }
      refetchGallery();
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  // Gallery delete
  const deletePhoto = async (photo: { id: string; path: string }) => {
    await supabase.storage.from('project-media').remove([photo.path]);
    await supabase.from('project_media').delete().eq('id', photo.id);
    refetchGallery();
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
            editProjectForm.reset({
              title: project.title,
              status: project.status,
              location: project.location ?? '',
              event_start_date: project.event_start_date,
              event_end_date: project.event_end_date ?? '',
              notes: project.notes ?? '',
              is_featured: project.is_featured ?? false,
              project_completed_at: project.project_completed_at ?? '',
            });
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
          { label: 'Revenue', value: totalIncome, color: 'emerald' },
          { label: 'Expense', value: totalExpense, color: 'red' },
          { label: 'Profit', value: profit, color: 'blue' },
          { label: 'Collected', value: totalCollected, color: 'teal' },
          { label: 'Due', value: due, color: 'orange' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold mt-1 text-${color}-600`}>{formatBDT(value)}</p>
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
              { label: 'Featured', value: project.is_featured ? 'Yes' : 'No' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-28 shrink-0 mt-0.5">{label}</span>
                <span className="text-sm text-foreground capitalize">{value ?? '—'}</span>
              </div>
            ))}
          </div>
          {project.notes && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3">Notes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Ledger Tab */}
      {activeTab === 'Ledger' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Finance Ledger</h3>
            <button
              onClick={() => {
                setEditingEntry(null);
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayStr = `${yyyy}-${mm}-${dd}`;
                ledgerForm.reset({ project_id: id!, type: 'income', paid_status: 'unpaid', entry_date: todayStr });
                setIsLedgerOpen(true);
              }}
              className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </button>
            <button
              onClick={openCollectionModal}
              className="flex items-center gap-1.5 text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors ml-2"
            >
              <Plus className="h-3.5 w-3.5" /> Add Payment
            </button>
          </div>
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Date', 'Type', 'Category', 'Amount', 'Status', 'Note', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry, i) => (
                  <tr key={entry.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(entry.entry_date)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={entry.type} /></td>
                    <td className="px-4 py-2.5">{entry.category}</td>
                    <td className={`px-4 py-2.5 font-semibold ${entry.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {entry.type === 'income' ? '+' : '-'}{formatBDT(Number(entry.amount))}
                    </td>
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
                {ledger.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No ledger entries yet</td></tr>
                )}
              </tbody>
              {ledger.length > 0 && (
                <tfoot className="bg-muted/30 border-t border-border">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-foreground">Totals</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600">+{formatBDT(totalIncome)}</td>
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-red-500">-{formatBDT(totalExpense)}</td>
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
            {collections.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{formatBDT(Number(c.amount))}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(c.payment_date)}{c.method ? ` · ${c.method}` : ''}</p>
                </div>
                {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
              </div>
            ))}
            {collections.length === 0 && <p className="text-center py-10 text-sm text-muted-foreground">No payments recorded yet</p>}
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'Invoices' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-foreground">Invoices</h3>
            <button onClick={() => navigate(`/invoices/new?project=${id}`)} className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
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
              { label: 'Outstanding Due', value: formatBDT(due) },
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
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <Upload className="h-3.5 w-3.5" />
              {isUploading ? 'Uploading...' : 'Upload Photos'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleGalleryUpload(e.target.files)}
            />
          </div>
          {uploadError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-4">{uploadError}</p>
          )}
          {gallery.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No photos yet. Click "Upload Photos" to add images.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Photos are stored in Supabase Storage (project-media bucket)</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gallery.map((photo) => (
                <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => deletePhoto(photo)}
                      className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select {...ledgerForm.register('paid_status')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <input {...ledgerForm.register('note')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
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

      {/* Edit Project Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project">
        <form onSubmit={editProjectForm.handleSubmit((v) => saveProjectMutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Title *</label>
            <input {...editProjectForm.register('title', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select {...editProjectForm.register('status')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input {...editProjectForm.register('location')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Dhaka, Bangladesh" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Event Start Date *</label>
              <input type="date" {...editProjectForm.register('event_start_date', { required: true })} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Event End Date</label>
              <input type="date" {...editProjectForm.register('event_end_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Project Completed At</label>
            <input type="date" {...editProjectForm.register('project_completed_at')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea {...editProjectForm.register('notes')} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_featured" {...editProjectForm.register('is_featured')} className="rounded" />
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
