import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { ImageUpload } from '@/components/ImageUpload';
import { formatDate } from '@/lib/utils';
import { Plus, Building2, Pencil } from 'lucide-react';
import { companySchema } from '@hellotms/shared';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/components/Toast';
import type { ColumnDef } from '@tanstack/react-table';
import type { Company } from '@hellotms/shared';
import type { CompanyInput } from '@hellotms/shared';
import { slugify } from '@/lib/utils';
import { Trash } from 'lucide-react';
import { mediaApi } from '@/lib/api';

export default function CompaniesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      if (error) {
        toast(`কোম্পানি লিস্ট লোড করা যায়নি: ${error.message}`, 'error');
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
      // 1. Upload new logo if needed, and clean up the old one
      const finalLogoUrl = await mediaApi.uploadAndCleanMedia(logoUrl, editingCompany?.logo_url);

      const payload = { ...values, slug: values.slug || slugify(values.name), logo_url: finalLogoUrl || undefined };
      if (editingCompany) {
        const { error } = await supabase.from('companies').update(payload).eq('id', editingCompany.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('companies').insert(payload);
        if (error) throw error;
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
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast('Company deleted successfully!', 'success');
    },
    onError: (error: any) => {
      toast(`Failed to delete company: ${error.message || 'Unknown error'}`, 'error');
    }
  });

  const handleDelete = (c: Company) => {
    if (window.confirm(`Are you absolutely sure?\nThis will permanently delete the company "${c.name}" and might affect associated projects or invoices.`)) {
      deleteMutation.mutate(c.id);
    }
  };

  const openCreate = () => { setEditingCompany(null); reset(); setLogoUrl(''); setIsOpen(true); };
  const openEdit = (c: Company) => { setEditingCompany(c); reset(c); setLogoUrl(c.logo_url ?? ''); setIsOpen(true); };

  const columns: ColumnDef<Company, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Company Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.logo_url ? (
            <img src={row.original.logo_url} alt={row.original.name} className="h-8 w-8 rounded-lg object-cover bg-white" />
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
    { accessorKey: 'address', header: 'Address', cell: ({ getValue }) => (getValue() as string || '—').slice(0, 40) },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ getValue }) => formatDate(getValue() as string),
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
            onClick={(e) => { e.stopPropagation(); handleDelete(row.original); }}
            className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-muted-foreground hover:text-destructive"
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
          {/* Logo upload */}
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
    </div>
  );
}
