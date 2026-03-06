import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { PageHeader } from '@/components/PageHeader';
import { Modal, CascadeConfirmModal } from '@/components/Modal';
import { ImageUpload } from '@/components/ImageUpload';
import { formatDate, slugify, formatDateTime } from '@/lib/utils';
import { Plus, Building2, Pencil, Trash } from 'lucide-react';
import { companySchema } from '@hellotms/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/components/Toast';
import type { ColumnDef } from '@tanstack/react-table';
import type { Company, CompanyInput } from '@hellotms/shared';
import { mediaApi, auditApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function CompaniesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .is('deleted_at', null)
        .order('name');
      if (error) {
        toast(`Failed to load companies: ${error.message}`, 'error');
        throw error;
      }
      return data as Company[];
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: CompanyInput) => {
      const finalLogoUrl = await mediaApi.uploadAndCleanMedia(
        logoUrl,
        editingCompany?.logo_url,
        'companies',
        'logo',
        values.name
      );
      const payload = { ...values, slug: values.slug || slugify(values.name), logo_url: finalLogoUrl || undefined };

      if (editingCompany) {
        const { error } = await supabase.from('companies').update(payload).eq('id', editingCompany.id);
        if (error) throw error;
        auditApi.log({
          action: 'update_company',
          entity_type: 'company',
          entity_id: editingCompany.id,
          after: payload
        });
      } else {
        const { data, error } = await supabase.from('companies').insert(payload).select().single();
        if (error) throw error;
        auditApi.log({
          action: 'create_company',
          entity_type: 'company',
          entity_id: data.id,
          after: payload
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsOpen(false);
      setEditingCompany(null);
      reset();
      toast('Company saved successfully!', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to save company: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (company: Company) => {
      // Insert to trash
      const { error: trashError } = await supabase.from('trash_bin').insert({
        entity_type: 'company',
        entity_id: company.id,
        entity_name: company.name,
        entity_data: company,
        deleted_by: profile?.id,
      });
      if (trashError) throw trashError;

      // Soft delete company and cascade
      const now = new Date().toISOString();

      // Fetch related projects
      const { data: projs } = await supabase.from('projects').select('id').eq('company_id', company.id);
      const projIds = projs?.map(p => p.id) || [];

      const { error } = await supabase.from('companies').update({ deleted_at: now }).eq('id', company.id);
      if (error) throw error;

      if (projIds.length > 0) {
        // We do this concurrently for speed
        await Promise.all([
          supabase.from('projects').update({ deleted_at: now }).in('id', projIds),
          supabase.from('invoices').update({ deleted_at: now }).in('project_id', projIds),
          supabase.from('collections').update({ deleted_at: now }).in('project_id', projIds),
          supabase.from('ledger_entries').update({ deleted_at: now }).in('project_id', projIds)
        ]);
      }

      auditApi.log({
        action: 'delete_company',
        entity_type: 'company',
        entity_id: company.id,
        before: company
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeleteTarget(null);
      toast('Company deleted successfully!', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to delete company: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const openCreate = () => { setEditingCompany(null); reset(); setLogoUrl(''); setIsOpen(true); };
  const openEdit = (c: Company) => { setEditingCompany(c); reset(c); setLogoUrl(c.logo_url ?? ''); setIsOpen(true); };

  const columns: ColumnDef<Company, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Company Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.logo_url ? (
            <img src={row.original.logo_url} alt={row.original.name} className="h-8 w-8 rounded-lg object-cover bg-white dark:bg-[#1c1c1c]" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          )}
          <span className="font-medium text-foreground">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => getValue() as string || '—' },
    { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => getValue() as string || '—' },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ getValue }) => (getValue() as string || '—').slice(0, 40)
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ getValue }) => formatDateTime(getValue() as string),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
            title="Edit Company"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row.original); }}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 dark:bg-red-500/10 transition-colors text-muted-foreground hover:text-destructive"
            title="Delete Company"
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
        title="Companies"
        description="Manage client companies and organisations"
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> New Company
          </button>
        }
      />

      <div className="bg-card border border-border rounded-xl p-4">
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : (
          <DataTable
            data={companies}
            columns={columns}
            searchKey="name"
            searchPlaceholder="Search companies..."
            onRowClick={(row) => navigate(`/companies/${row.id}`)}
          />
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); reset(); }} title={editingCompany ? 'Edit Company' : 'New Company'}>
        <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4">
          <ImageUpload
            value={logoUrl || null}
            onChange={(val) => setLogoUrl(val as string)}
            label="Company Logo"
          />

          {[
            { name: 'name', label: 'Company Name', required: true },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'phone', label: 'Phone' },
            { name: 'address', label: 'Address' },
          ].map(({ name, label, type = 'text', required }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-foreground mb-1">{label}{required && ' *'}</label>
              <input
                {...register(name as keyof CompanyInput)}
                type={type}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors[name as keyof CompanyInput] && (
                <p className="text-xs text-destructive mt-1">{errors[name as keyof CompanyInput]?.message}</p>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setIsOpen(false); reset(); }} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
              {saveMutation.isPending ? 'Saving...' : 'Save Company'}
            </button>
          </div>
        </form>
      </Modal>

      <CascadeConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Delete Company"
        targetName={deleteTarget?.name ?? ''}
        targetType="company"
        cascadeItems={[
          { icon: '📁', label: 'All projects', description: 'Every project associated with this company' },
          { icon: '🖼️', label: 'All gallery photos', description: 'Project photos stored in cloud storage' },
          { icon: '💰', label: 'All ledger entries & collections', description: 'Income, expense records and payment history' },
          { icon: '🧾', label: 'All invoices', description: 'Invoices and their line items' },
        ]}
        confirmLabel="Delete Company"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
