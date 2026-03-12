import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, EVENT_CATEGORIES } from '@hellotms/shared';
import type { ProjectInput, Company } from '@hellotms/shared';
import { ImageUpload } from './ImageUpload';
import { useState } from 'react';

interface ProjectFormProps {
  companies: Company[];
  onSubmit: (values: ProjectInput) => void;
  onCancel: () => void;
  isPending: boolean;
  defaultValues?: Partial<ProjectInput>;
}

export function ProjectForm({ companies, onSubmit, onCancel, isPending, defaultValues }: ProjectFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      status: 'draft',
      is_published: false,
      is_featured: false,
      proposal_date: today,
      event_start_date: today,
      ...defaultValues
    },
  });

  const coverImageUrl = watch('cover_image_url');
  const selectedCategory = watch('category');
  const isOtherCategory = selectedCategory === 'Others';
  const [customCategory, setCustomCategory] = useState('');

  const handleFormSubmit = (values: ProjectInput) => {
    const finalValues = {
      ...values,
      category: values.category === 'Others' ? customCategory : (values.category || null),
    };
    onSubmit(finalValues);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Company <span className="text-red-500">*</span></label>
        <select {...register('company_id')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Select company...</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.company_id && <p className="text-xs text-destructive mt-1">{errors.company_id.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Project / Event Title <span className="text-red-500">*</span></label>
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
          <label className="block text-sm font-medium text-foreground mb-1">Custom Category Name <span className="text-red-500">*</span></label>
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
          <label className="block text-sm font-medium text-foreground mb-1">Event Start Date <span className="text-red-500">*</span></label>
          <input type="date" {...register('event_start_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.event_start_date && <p className="text-xs text-destructive mt-1">{errors.event_start_date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Event End Date <span className="text-muted-foreground font-normal text-xs">(defaults to start date)</span></label>
          <input type="date" {...register('event_end_date')} className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Quoted Amount (৳) <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" min="0" {...register('invoice_amount', { valueAsNumber: true })} placeholder="e.g. 150000" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.invoice_amount && <p className="text-xs text-destructive mt-1">{(errors.invoice_amount as any)?.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Advance Received (৳) <span className="text-red-500">*</span></label>
          <input type="number" step="0.01" min="0" {...register('advance_received', { valueAsNumber: true })} placeholder="e.g. 50000" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          {errors.advance_received && <p className="text-xs text-destructive mt-1">{(errors.advance_received as any)?.message}</p>}
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
          value={coverImageUrl}
          onChange={(val) => setValue('cover_image_url', val as string)}
          aspect={16 / 9}
          guide="Recommended ratio 16:9 (e.g. 1920x1080)"
        />
        {errors.cover_image_url && <p className="text-xs text-destructive mt-1">{(errors.cover_image_url as any)?.message}</p>}
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
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
          {isPending ? 'Saving...' : 'Save Project'}
        </button>
      </div>
    </form>
  );
}
