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
  const [editingProject, setEditingProject] = useState<Project | null>(null);
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

  const saveMutation = useMutation({
    mutationFn: async (values: ProjectInput) => {
      const isEditing = !!editingProject;
      
      // 1. Upload Cover Image
      const finalCoverUrl = await mediaApi.uploadAndCleanMedia(
        values.cover_image_url as string | File | null,
        isEditing ? editingProject.cover_image_url : null,
        'projects',
        'cover',
        values.title
      );

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

      if (isEditing) {
        const { error } = await supabase.from('projects').update(payload).eq('id', editingProject.id);
        if (error) throw error;
        auditApi.log({ action: 'update_project', entity_type: 'project', entity_id: editingProject.id, after: payload });
      } else {
        const { data, error } = await supabase.from('projects').insert(payload).select().single();
        if (error) throw error;
        auditApi.log({ action: 'create_project', entity_type: 'project', entity_id: data.id, after: payload });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsOpen(false);
      setEditingProject(null);
      toast(editingProject ? 'Project updated successfully!' : 'Project created successfully!', 'success');
    },
    onError: (error: any) => {
      console.error('[ProjectsPage] Save error:', error);
      toast(`Failed to save project: ${error.message || 'Unknown error'}`, 'error');
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
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              setEditingProject(row.original); 
              setIsOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all active:scale-95 font-bold text-xs"
            title="Edit Project"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all active:scale-95 font-bold text-xs"
            title="Delete Project"
          >
            <Trash className="h-3.5 w-3.5" />
            Delete
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
            className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${statusFilter === s
                ? 'bg-primary/15 text-primary border border-primary/25 backdrop-blur-md shadow-[0_0_15px_rgba(var(--primary),0.05)]'
                : 'border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground'
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

      {/* Project Modal (Create/Edit) */}
      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditingProject(null); }} title={editingProject ? 'Edit Project' : 'New Project'} size="lg">
        <ProjectForm
          initialData={editingProject || undefined}
          companies={companies}
          isPending={saveMutation.isPending}
          onSubmit={(v) => saveMutation.mutate(v)}
          onCancel={() => { setIsOpen(false); setEditingProject(null); }}
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
