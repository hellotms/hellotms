// ─── Core Entity Types ───────────────────────────────────────────────────────

export type RoleName = 'super_admin' | 'admin' | 'staff' | 'viewer' | string;

export interface Role {
  id: string;
  name: RoleName;
  permissions: Record<string, boolean>;
  created_at: string;
}

export interface Profile {
  id: string; // = auth.users.id
  name: string;
  email: string;
  role_id: string;
  role?: Role;
  avatar_url?: string | null;
  phone?: string | null;
  address?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  created_at: string;
}

export type ProjectStatus = 'draft' | 'active' | 'completed';

export interface Project {
  id: string;
  company_id: string;
  company?: Company;
  title: string;
  slug: string;
  status: ProjectStatus;
  description?: string | null;
  cover_image_url?: string | null;
  gallery_urls?: string[] | null;
  venue?: string | null;
  event_start_date: string; // ISO date
  proposal_date?: string | null;
  event_end_date?: string | null;
  location?: string | null;
  notes?: string | null;
  is_published: boolean;
  is_featured: boolean;
  project_created_at?: string | null;
  project_completed_at?: string | null;
  budget?: number | null;
  advance_received?: number | null;
  created_by?: string | null;
  created_at: string;
}

export type LedgerEntryType = 'income' | 'expense';
export type PaidStatus = 'paid' | 'unpaid';

export interface LedgerEntry {
  id: string;
  project_id: string;
  type: LedgerEntryType;
  category: string;
  amount: number;
  entry_date: string; // ISO date
  paid_status?: PaidStatus | null;
  note?: string | null;
  attachment_url?: string | null;
  deleted_at?: string | null;
  created_at: string;
}

export interface Collection {
  id: string;
  project_id: string;
  amount: number;
  payment_date: string; // ISO date
  method?: string | null;
  note?: string | null;
  created_at: string;
}

export type InvoiceType = 'estimate' | 'invoice';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  project_id: string;
  company_id: string;
  project?: Project;
  company?: Company;
  invoice_number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  total_amount: number;
  due_date?: string | null;
  sent_at?: string | null;
  paid_at?: string | null;
  pdf_url?: string | null;
  created_by?: string | null;
  created_at: string;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export type LeadStatus = 'new' | 'contacted' | 'closed';

export interface Lead {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  event_date?: string | null;
  location?: string | null;
  budget_range?: string | null;
  message?: string | null;
  is_starred?: boolean;
  status: LeadStatus;
  notes?: string | null;
  created_at: string;
}

export interface SiteSettings {
  id: number; // singleton row id=1
  hero_title: string;
  site_motto?: string | null;
  hero_subtitle?: string | null;
  hero_cta_primary_label?: string | null;
  hero_cta_primary_url?: string | null;
  hero_cta_secondary_label?: string | null;
  hero_cta_secondary_url?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  services: ServiceItem[];
  about_content?: string | null;
  contact_info: ContactInfo;
  socials: Socials;
  updated_at: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon?: string | null;
}

export interface ContactInfo {
  address?: string;
  email?: string;
  phone?: string;
  map_embed_url?: string;
}

export interface Socials {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  twitter?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  created_at: string;
  profile?: Profile;
}

export interface HealthLog {
  id: string;
  pinged_at: string;
  status: 'ok' | 'error';
}

// ─── Computed / View Types ───────────────────────────────────────────────────

export interface ProjectFinancials {
  project_id: string;
  total_income: number;
  total_expense: number;
  profit: number;
  total_collected: number;
  due: number;
  first_payment_date?: string | null;
  last_payment_date?: string | null;
}

export interface ProjectDurations {
  event_duration_days: number | null;
  days_since_started: number | null;
  days_since_ended: number | null;
  collection_duration_days: number | null;
  days_to_full_collection_from_end: number | null;
  completion_time_days: number | null;
}

export interface DashboardKPIs {
  total_revenue: number;
  total_expense: number;
  net_profit: number;
  total_due: number;
  active_projects: number;
  completed_projects: number;
  leads_count: number;
}

export interface RevenueExpensePoint {
  date: string;
  revenue: number;
  expense: number;
  profit: number;
}

// ─── API Request / Response Types ────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
