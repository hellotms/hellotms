import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal, ConfirmModal, CascadeConfirmModal } from '@/components/Modal';
import { formatBDT, formatDate, formatDateTime, slugify } from '@/lib/utils';
import { FolderOpen, Plus, Building2, MoreHorizontal, Trash, Pencil, ImageIcon } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { projectSchema, EVENT_CATEGORIES } from '@hellotms/shared';
import { useForm } from 'react-hook-form';
import { ProjectForm } from '@/components/ProjectForm';
import { toast } from '@/components/Toast';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { Project, Company, ProjectInput } from '@hellotms/shared';
import { mediaApi, auditApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const STATUS_OPTIONS = ['all', 'draft', 'active', 'completed'];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');
      return (data ?? []) as Company[];
    },
  });

  const { data: projects = [], isLoading, error: queryError } = useQuery<(Project & { companies: { name: string } | null })[]>({
    queryKey: ['projects', statusFilter],
    queryFn: async () => {
      let q = supabase.from('projects').select('*, companies(name)').is('deleted_at', null).order('event_start_date', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) {
        toast(`ডেটা লোড করা যায়নি: ${error.message}`, 'error');
        throw error;
      }
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ProjectInput) => {
      // 1. Upload Cover Image Document if a crop happened
      const finalCoverUrl = await mediaApi.uploadAndCleanMedia(
        values.cover_image_url as string | File | null,
        null,
        'projects',
        'cover',
        values.title
      );

      // Default event_end_date to event_start_date if not provided
      const payload = {
        ...values,
        event_end_date: values.event_end_date || values.event_start_date,
        proposal_date: values.proposal_date || null,
        invoice_amount: values.invoice_amount ? Number(values.invoice_amount) : null,
        advance_received: values.advance_received ? Number(values.advance_received) : 0,
        description: values.description || null,
        cover_image_url: finalCoverUrl || null,
        notes: values.notes || null,
        location: values.location || null,
      };
      const { data, error } = await supabase.from('projects').insert(payload).select().single();
      if (error) throw error;
      auditApi.log({
        action: 'create_project',
        entity_type: 'project',
        entity_id: data.id,
        after: payload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsOpen(false);
      toast('Project created successfully!', 'success');
    },
    onError: (error: any) => {
      console.error('[ProjectsPage] Create error:', error);
      toast(`Failed to create project: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (project: Project) => {
      // 1. Insert into trash_bin
      const { error: trashError } = await supabase.from('trash_bin').insert({
        entity_type: 'project',
        entity_id: project.id,
        entity_name: project.title,
        entity_data: project,
        deleted_by: profile?.id,
      });
      if (trashError) throw trashError;

      // 2. Soft delete
      const now = new Date().toISOString();
      const { error } = await supabase.from('projects').update({ deleted_at: now }).eq('id', project.id);
      if (error) throw error;

      // 3. Cascade soft deletes
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
      queryClient.invalidateQueries({ queryKey: ['projects', statusFilter] });
      setDeleteTarget(null);
      toast('Project deleted successfully!', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to delete project: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const handleDelete = (p: Project) => {
    setDeleteTarget(p);
  };

  const columns: ColumnDef<Project & { companies: { name: string } | null }, unknown>[] = [
    {
      accessorKey: 'title',
      header: 'Project / Event',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <FolderOpen className="h-4 w-4 text-blue-600 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-foreground">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">{row.original.companies?.name ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: 'event_start_date', header: 'Event Date', cell: ({ getValue }) => formatDate(getValue() as string) },
    { accessorKey: 'location', header: 'Location', cell: ({ getValue }) => (getValue() as string) ?? '—' },
    { id: 'status', accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    {
      id: 'published',
      header: 'Published',
      cell: ({ row }) => (
        <span className={`text-xs font-medium ${row.original.is_published ? 'text-emerald-600 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
          {row.original.is_published ? 'Published' : 'Draft'}
        </span>
      ),
    },
    { accessorKey: 'created_at', header: 'Created', cell: ({ getValue }) => formatDateTime(getValue() as string) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/projects/${row.original.id}`); }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
            title="Edit / View Project"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 dark:bg-red-500/10 transition-colors text-muted-foreground hover:text-destructive"
            title="Delete Project"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Projects & Events"
        description="Manage all client projects and events"
        actions={
          <button
            onClick={() => {
              setIsOpen(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Project
          </button>
        }
      />

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <DataTable
            data={projects}
            columns={columns as ColumnDef<typeof projects[number], unknown>[]}
            searchKey="title"
            searchPlaceholder="Search projects..."
            onRowClick={(row) => navigate(`/projects/${row.id}`)}
          />
        )}
      </div>

      {/* Create Project Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New Project" size="lg">
        <ProjectForm
          companies={companies}
          isPending={createMutation.isPending}
          onSubmit={(v) => createMutation.mutate(v)}
          onCancel={() => setIsOpen(false)}
        />
      </Modal>

      <CascadeConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Delete Project"
        targetName={deleteTarget?.title ?? ''}
        targetType="project"
        cascadeItems={[
          { icon: '🖼️', label: 'All gallery photos', description: 'Project photos stored in cloud storage' },
          { icon: '💰', label: 'All ledger entries', description: 'Income and expense records for this project' },
          { icon: '💳', label: 'All collections', description: 'Payment collection history' },
          { icon: '🧾', label: 'All invoices', description: 'Invoices and their line items' },
        ]}
        confirmLabel="Delete Project"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
