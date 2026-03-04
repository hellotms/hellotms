import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { formatDate } from '@/lib/utils';
import { MessageSquare, Phone, Mail, Calendar, Star, Trash2 } from 'lucide-react';
import type { Lead } from '@hellotms/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';

const STATUS_OPTIONS = ['all', 'new', 'contacted', 'closed', 'starred'];

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const noteForm = useForm({ defaultValues: { status: 'contacted', notes: '' } });

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads', statusFilter],
    queryFn: async () => {
      let q = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (statusFilter === 'starred') q = q.eq('is_starred', true);
      else if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: { status: string; notes?: string }) => {
      const { error } = await supabase.from('leads').update(values).eq('id', selectedLead!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(null);
    },
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({ id, is_starred }: { id: string; is_starred: boolean }) => {
      const { error } = await supabase.from('leads').update({ is_starred }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(null);
    },
  });

  const handleToggleStar = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    toggleStarMutation.mutate({ id: lead.id, is_starred: !lead.is_starred });
  };

  const handleDelete = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this contact submission?')) {
      deleteMutation.mutate(lead.id);
    }
  };

  const columns: ColumnDef<Lead, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
        </div>
      ),
    },
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span> },
    { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => getValue() ? <span className="text-sm">{getValue() as string}</span> : '—' },
    {
      accessorKey: 'event_date',
      header: 'Event Date',
      cell: ({ getValue }) => getValue() ? (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          {formatDate(getValue() as string)}
        </div>
      ) : '—',
    },
    {
      accessorKey: 'budget_range',
      header: 'Budget',
      cell: ({ getValue }) => getValue() ? <span className="text-sm text-muted-foreground">{getValue() as string}</span> : '—',
    },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={getValue() as string} /> },
    { accessorKey: 'created_at', header: 'Submitted', cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={(e) => handleToggleStar(e, row.original)}
            className={`p-1.5 rounded-md hover:bg-muted transition-colors ${row.original.is_starred ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
          >
            <Star className={`h-4 w-4 ${row.original.is_starred ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => handleDelete(e, row.original)}
            className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md hover:bg-muted transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <PageHeader title="Contact Forms" description="Messages and inquiries from the public website" />

      <div className="flex gap-2 mb-4">
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-primary text-white' : 'border border-border text-muted-foreground hover:text-foreground'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {statusFilter === 'all' && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {(['new', 'contacted', 'closed'] as const).map(s => {
            const count = leads.filter(l => l.status === s).length;
            const colorMap = { new: 'text-blue-600 bg-blue-50', contacted: 'text-yellow-600 bg-yellow-50', closed: 'text-green-600 bg-green-50' };
            return (
              <div key={s} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide capitalize">{s}</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </div>
                <span className={`w-10 h-10 rounded-full flex items-center justify-center ${colorMap[s]}`}>
                  <MessageSquare className="h-5 w-5" />
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <DataTable
            data={leads}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search contact forms..."
            onRowClick={(row) => { setSelectedLead(row); noteForm.reset({ status: row.status, notes: row.notes ?? '' }); }}
          />
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} title="Contact Details" size="lg">
        {selectedLead && (
          <div className="space-y-5">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Contact</p>
                <p className="font-semibold">{selectedLead.name}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 space-y-1">
                {selectedLead.email && (
                  <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Mail className="h-3 w-3" /> {selectedLead.email}
                  </a>
                )}
                {selectedLead.phone && (
                  <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Phone className="h-3 w-3" /> {selectedLead.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Event Details */}
            <div className="grid grid-cols-2 gap-3">
              {selectedLead.event_date && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Event Date</p>
                  <p className="text-sm font-medium">{formatDate(selectedLead.event_date)}</p>
                </div>
              )}
              {selectedLead.budget_range && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Budget Range</p>
                  <p className="text-sm font-medium">{selectedLead.budget_range}</p>
                </div>
              )}
            </div>

            {/* Message */}
            {selectedLead.message && (
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Message</p>
                <p className="text-sm text-foreground">{selectedLead.message}</p>
              </div>
            )}

            {/* Update Form */}
            <form onSubmit={noteForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-3 border-t border-border pt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Update Status</label>
                <select {...noteForm.register('status')} className="w-full border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Internal Notes</label>
                <textarea {...noteForm.register('notes')} rows={3} placeholder="Add private notes..." className="w-full border border-border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedLead(null)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancel</button>
                <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60">
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
