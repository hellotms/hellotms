import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { companySchema } from '@hellotms/shared';
import type { CompanyInput } from '@hellotms/shared';
import { ImageUpload } from './ImageUpload';
import { useState, useEffect } from 'react';

interface CompanyFormProps {
  onSubmit: (values: CompanyInput, logoUrl: string) => void;
  onCancel: () => void;
  isPending: boolean;
  defaultValues?: Partial<CompanyInput> & { logo_url?: string | null };
}

export function CompanyForm({ onSubmit, onCancel, isPending, defaultValues }: CompanyFormProps) {
  const [logoUrl, setLogoUrl] = useState<string>(defaultValues?.logo_url ?? '');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      email: defaultValues?.email ?? '',
      phone: defaultValues?.phone ?? '',
      address: defaultValues?.address ?? '',
      slug: defaultValues?.slug ?? null,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      setLogoUrl(defaultValues.logo_url ?? '');
    }
  }, [defaultValues]);

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v, logoUrl))} className="space-y-4">
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
          <label className="block text-sm font-medium text-foreground mb-1">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </label>
          <input
            {...register(name as keyof CompanyInput)}
            type={type}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors[name as keyof CompanyInput] && (
            <p className="text-xs text-destructive mt-1">{(errors[name as keyof CompanyInput] as any)?.message}</p>
          )}
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
          {isPending ? 'Saving...' : 'Save Company'}
        </button>
      </div>
    </form>
  );
}
