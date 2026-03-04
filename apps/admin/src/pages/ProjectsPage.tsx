import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { formatDate, slugify } from '@/lib/utils';
import { Plus, FolderOpen, ImageIcon } from 'lucide-react';
import { ImageUpload } from '@/components/ImageUpload';
import { projectSchema, EVENT_CATEGORIES } from '@hellotms/shared';
import { useForm } from 'react-hook-form';
import { toast } from '@/components/Toast';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { Project, Company, ProjectInput } from '@hellotms/shared';
import { MoreHorizontal, Trash, Pencil } from 'lucide-react';

const STATUS_OPTIONS = ['all', 'draft', 'active', 'completed'];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      return (data ?? []) as Company[];
    },
  });

  const { data: projects = [], isLoading, error: queryError } = useQuery<(Project & { companies: { name: string } | null })[]>({
    queryKey: ['projects', statusFilter],
    queryFn: async () => {
      let q = supabase.from('projects').select('*, companies(name)').order('event_start_date', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) {
        toast(`ডেটা লোড করা যায়নি: ${error.message}`, 'error');
        throw error;
      }
      return data ?? [];
    },
  });

  const today = new Date().toISOString().split('T')[0];
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: 'draft',
      is_published: false,
      is_featured: false,
      proposal_date: today,
      event_start_date: today
    },
  });

  const coverImageUrl = watch('cover_image_url');
  const selectedCategory = watch('category');
  const isOtherCategory = selectedCategory === 'Others';
  const [customCategory, setCustomCategory] = useState('');

  const createMutation = useMutation({
    mutationFn: async (values: ProjectInput) => {
      // Default event_end_date to event_start_date if not provided
      const payload = {
        ...values,
        slug: slugify(values.title),
        event_end_date: values.event_end_date || values.event_start_date,
        proposal_date: values.proposal_date || null,
        budget: values.budget || null,
        advance_received: values.advance_received ?? 0,
        category: values.category === 'Others' ? customCategory : (values.category || null),
        description: values.description || null,
        cover_image_url: values.cover_image_url || null,
        notes: values.notes || null,
        location: values.location || null,
      };
      const { error } = await supabase.from('projects').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsOpen(false);
      reset();
      toast('Project created successfully!', 'success');
    },
    onError: (error: any) => {
      console.error('[ProjectsPage] Create error:', error);
      toast(`Failed to create project: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast('Project deleted successfully!', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to delete project: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const handleDelete = (p: Project) => {
    if (window.confirm(`Are you sure?\nThis will permanently delete the project "${p.title}".\nThis action cannot be undone and will also remove all associated financials, media, and invoices.`)) {
      deleteMutation.mutate(p.id);
    }
  };

  const columns: ColumnDef<Project & { companies: { name: string } | null }, unknown>[] = [
    {
      accessorKey: 'title',
      header: 'Project / Event',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <FolderOpen className="h-4 w-4 text-blue-600" />
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
        <span className={`text-xs font-medium ${row.original.is_published ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {row.original.is_published ? 'Published' : 'Draft'}
        </span>
      ),
    },
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
            className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-muted-foreground hover:text-destructive"
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
              reset({
                status: 'draft',
                is_published: false,
                is_featured: false,
                proposal_date: today,
                event_start_date: today
              });
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
      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); reset(); }} title="New Project" size="lg">
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Company *</label>
            <select {...register('company_id')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select company...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.company_id && <p className="text-xs text-destructive mt-1">{errors.company_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Project / Event Title *</label>
            <input {...register('title')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Event Category</label>
            <select
              {...register('category')}
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
              <label className="block text-sm font-medium text-foreground mb-1">Custom Category Name *</label>
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          )}


          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Proposal Date</label>
              <input type="date" {...register('proposal_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Event Start Date *</label>
              <input type="date" {...register('event_start_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Event End Date <span className="text-muted-foreground font-normal text-xs">(defaults to start date)</span></label>
              <input type="date" {...register('event_end_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Project Budget (৳)</label>
              <input type="number" step="0.01" min="0" {...register('budget', { valueAsNumber: true })} placeholder="e.g. 150000" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Advance Received (৳)</label>
              <input type="number" step="0.01" min="0" {...register('advance_received', { valueAsNumber: true })} placeholder="e.g. 50000" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Location</label>
              <input {...register('location')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select {...register('status')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <ImageUpload
              label="Cover Photo"
              currentUrl={coverImageUrl}
              onUploaded={(url) => setValue('cover_image_url', url)}
              aspect={16 / 9}
              guide="Recommended ratio 16:9 (e.g. 1920x1080)"
            />
            {errors.cover_image_url && <p className="text-xs text-destructive mt-1">{errors.cover_image_url.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">About the Event</label>
            <textarea {...register('description')} rows={4} placeholder="Detailed project/event description for the public site..." className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Admin Notes <span className="text-muted-foreground font-normal text-xs">(internal only)</span></label>
            <textarea {...register('notes')} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setIsOpen(false); reset(); }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
