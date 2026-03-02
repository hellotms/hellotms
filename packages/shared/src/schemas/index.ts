import { z } from 'zod';

// ─── Company ─────────────────────────────────────────────────────────────────
export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  logo_url: z.string().url().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(300).optional().nullable(),
});

export type CompanyInput = z.infer<typeof companySchema>;

// ─── Project ─────────────────────────────────────────────────────────────────
export const projectSchema = z.object({
  company_id: z.string().uuid(),
  title: z.string().min(1, 'Project title is required').max(200),
  slug: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'active', 'completed']).default('draft'),
  event_start_date: z.string().min(1, 'Event start date is required'),
  proposal_date: z.string().optional().nullable(),
  event_end_date: z.string().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  is_published: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  project_created_at: z.string().optional().nullable(),
  project_completed_at: z.string().optional().nullable(),
});

export type ProjectInput = z.infer<typeof projectSchema>;

// ─── Ledger Entry ─────────────────────────────────────────────────────────────
export const ledgerEntrySchema = z.object({
  project_id: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1).max(100),
  amount: z.number().positive('Amount must be positive'),
  entry_date: z.string().min(1),
  paid_status: z.enum(['paid', 'unpaid']).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  attachment_url: z.string().url().optional().nullable(),
});

export type LedgerEntryInput = z.infer<typeof ledgerEntrySchema>;

// ─── Collection ───────────────────────────────────────────────────────────────
export const collectionSchema = z.object({
  project_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_date: z.string().min(1),
  method: z.string().max(50).optional().nullable(),
  note: z.string().max(300).optional().nullable(),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

// ─── Invoice ──────────────────────────────────────────────────────────────────
export const invoiceItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

export const invoiceSchema = z.object({
  project_id: z.string().uuid(),
  company_id: z.string().uuid(),
  invoice_number: z.string().min(1).max(50),
  type: z.enum(['estimate', 'invoice']).default('invoice'),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']).default('draft'),
  total_amount: z.number().nonnegative(),
  due_date: z.string().optional().nullable(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item required'),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

// ─── Lead ────────────────────────────────────────────────────────────────────
export const leadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  event_date: z.string().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  budget_range: z.string().max(50).optional().nullable(),
  message: z.string().max(1000).optional().nullable(),
});

export type LeadInput = z.infer<typeof leadSchema>;

// ─── Staff Invite ─────────────────────────────────────────────────────────────
export const staffInviteSchema = z.object({
  email: z.string().email('Valid email required'),
  name: z.string().min(1, 'Name is required').max(120),
  role_id: z.string().uuid('Valid role required'),
});

export type StaffInviteInput = z.infer<typeof staffInviteSchema>;

// ─── Site Settings ────────────────────────────────────────────────────────────
export const serviceItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500),
  icon: z.string().max(50).optional().nullable(),
});

export const siteSettingsSchema = z.object({
  hero_title: z.string().min(1).max(200),
  hero_subtitle: z.string().max(300).optional().nullable(),
  hero_cta_primary_label: z.string().max(50).optional().nullable(),
  hero_cta_primary_url: z.string().max(200).optional().nullable(),
  hero_cta_secondary_label: z.string().max(50).optional().nullable(),
  hero_cta_secondary_url: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  whatsapp: z.string().max(20).optional().nullable(),
  services: z.array(serviceItemSchema).default([]),
  about_content: z.string().max(5000).optional().nullable(),
  contact_info: z.object({
    address: z.string().max(300).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(20).optional(),
    map_embed_url: z.string().url().optional(),
  }).default({}),
  socials: z.object({
    facebook: z.string().url().optional(),
    instagram: z.string().url().optional(),
    youtube: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    twitter: z.string().url().optional(),
  }).default({}),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;

// ─── Role ──────────────────────────────────────────────────────────────────────
export const roleSchema = z.object({
  name: z.string().min(1).max(50),
  permissions: z.record(z.boolean()).default({}),
});

export type RoleInput = z.infer<typeof roleSchema>;
