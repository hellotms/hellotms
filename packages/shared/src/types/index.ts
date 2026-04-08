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
  /** When true, user must complete /setup before accessing the admin panel */
  force_password_change?: boolean;
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
  is_published: boolean;
  created_at: string;
}

export type ProjectStatus = 'draft' | 'active' | 'completed';

export interface Project {
  id: string;
  company_id: string;
  company?: Company;
  title: string;
  status: ProjectStatus;
  description?: string | null;
  cover_image_url?: string | null;
  gallery_urls?: string[] | null;
  event_start_date: string; // ISO date
  proposal_date?: string | null;
  event_end_date?: string | null;
  location?: string | null;
  notes?: string | null;
  category?: string | null;
  payment_status?: 'paid' | 'unpaid' | null;
  paid_at?: string | null;
  is_published: boolean;
  is_featured: boolean;
  project_created_at?: string | null;
  project_completed_at?: string | null;
  invoice_amount?: number | null;
  advance_received?: number | null;
  created_by?: string | null;
  created_at: string;
}

export type LedgerEntryType = 'income' | 'expense';
export type PaidStatus = 'paid' | 'unpaid' | 'partial';

export interface LedgerEntry {
  id: string;
  project_id: string;
  type: LedgerEntryType;
  category: string;
  amount: number;
  quantity?: number | null;
  face_value?: number | null;
  entry_date: string; // ISO date
  paid_status?: PaidStatus | null;
  paid_amount?: number | null;
  due_amount?: number | null;
  note?: string | null;
  attachment_url?: string | null;
  is_external: boolean;
  deleted_at?: string | null;
  created_at: string;
}

export interface LedgerPayment {
  id: string;
  ledger_id: string;
  amount: number;
  payment_date: string; // ISO date
  method?: string | null;
  note?: string | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface Collection {
  id: string;
  project_id: string;
  name?: string | null;
  amount: number;
  payment_date: string; // ISO date
  method?: string | null;
  note?: string | null;
  deleted_at?: string | null;
  created_at: string;
}

export type InvoiceType = 'estimate' | 'invoice';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  project_id?: string;
  company_id?: string;
  other_company_name?: string | null;
  other_project_name?: string | null;
  project?: Project;
  company?: Company;
  invoice_number: string;
  subject?: string | null;
  invoice_date?: string | null;
  type: InvoiceType;
  status: InvoiceStatus;
  total_amount: number;
  discount_type?: 'flat' | 'percent' | null;
  discount_value?: number | null;
  notes?: string | null;
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
  ledger_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  cost_price?: number;
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
  status: LeadStatus;
  is_starred?: boolean;
  notes?: string | null;
  company?: string | null;
  replied_by?: string | null;
  replied_at?: string | null;
  created_at: string;
}

export interface HeroSlide {
  id: string;
  image_url: string;
  title?: string | null;
  subtitle?: string | null;
  order: number;
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
  company_logo_url?: string | null;
  public_site_url?: string | null;
  invoice_pad_url?: string | null;
  pad_margin_top?: number | null;
  pad_margin_bottom?: number | null;
  phone?: string | null;
  whatsapp?: string | null;
  services: ServiceItem[];
  about_content?: string | null;
  about_page_config?: AboutPageConfig | null;
  services_page_config?: ServicesPageConfig | null;
  contact_info: ContactInfo;
  socials: Socials;
  hero_slider?: HeroSlide[] | null;
  login_bg_url?: string | null;
  windows_app_url?: string | null;
  android_app_url?: string | null;
  show_windows_msi?: boolean;
  show_windows_exe?: boolean;
  updated_at: string;
}

export interface AboutPageConfig {
  hero: {
    badge: string;
    title_primary: string;
    title_highlight: string;
    description: string;
  };
  mission: {
    badge: string;
    title_primary: string;
    title_highlight: string;
    statement: string;
    description_p1: string;
    description_p2: string;
    stats_value: string;
    stats_label: string;
  };
  values: {
    badge: string;
    title_primary: string;
    title_highlight: string;
    items: { title: string; text: string; icon: string }[];
  };
  journey: {
    badge: string;
    title_primary: string;
    title_highlight: string;
    milestones: { year: string; title: string; text: string }[];
  };
}

export interface ServicesPageConfig {
  hero: {
    badge: string;
    title_primary: string;
    title_highlight: string;
    description: string;
  };
  services: {
    icon: string;
    title: string;
    description: string;
    features: string[];
  }[];
  process: {
    badge: string;
    title_primary: string;
    title_highlight: string;
    steps: { step: string; title: string; text: string }[];
  };
  cta: {
    title_primary: string;
    title_highlight: string;
    description: string;
    button_label: string;
    button_url: string;
  };
}

export interface Notice {
  id: string;
  title: string;
  body?: string | null;
  cover_url?: string | null;
  attachments?: unknown[] | null;
  is_pinned: boolean;
  expires_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { name: string; avatar_url: string | null } | null;
}

export interface TrashBinItem {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  entity_data: Record<string, unknown>;
  deleted_by?: string | null;
  deleted_at: string;
  expires_at: string;
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
  invoice_amount: number;
  received: number;
  total_standard_expense: number;
  others_expense: number;
  due_client: number;
  due_vendor: number;
  gross_profit: number;
  net_profit: number;
  profit_ratio: number;
  turnover_days: number | null;
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
  total_revenue: number; // Sum of collections + advance
  total_expense: number; // Sum of standard expenses
  total_others_expense: number;
  gross_profit: number;
  net_profit: number;
  total_due: number; // Client due
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

export type AppPlatform = 'windows' | 'android';

export interface AppVersion {
  id: string;
  platform: AppPlatform;
  version: string;
  file_extension: string;
  url: string;
  size?: number | null;
  changelog?: string | null;
  signature?: string | null;
  is_latest: boolean;
  created_at: string;
  created_by?: string | null;
  deleted_at?: string | null;
}

