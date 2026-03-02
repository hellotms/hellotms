# Marketing Solution — Hello TMS

Production-ready Events Management System for [hellotms.com.bd](https://hellotms.com.bd).

## Architecture

```
hellotms.com.bd/              ← pnpm workspace root
├── apps/
│   ├── admin/                ← Vite + React 18 SPA  (admin.hellotms.com.bd)
│   └── public/               ← Next.js 14 App Router (hellotms.com.bd)
├── workers/
│   └── api/                  ← Cloudflare Worker + Hono (api.hellotms.com.bd)
├── packages/
│   └── shared/               ← TypeScript types, Zod schemas, utils
└── supabase/
    └── migrations/           ← SQL migrations for Supabase Postgres
```

## Tech Stack

| Layer | Technology |
|---|---|
| Admin SPA | Vite 5 · React 18 · TypeScript · Tailwind CSS · shadcn/ui colors |
| Public Site | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Backend API | Cloudflare Worker · Hono v4 |
| Database | Supabase (Postgres + Auth + RLS + Storage) |
| Email | Brevo REST API |
| PDF | pdf-lib (pure JS — Worker compatible) |
| State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Currency | BDT (৳) |

## Admin Modules

| Module | URL |
|---|---|
| Dashboard | /dashboard |
| Companies | /companies |
| Projects | /projects |
| Invoices | /invoices |
| Leads | /leads |
| CMS | /cms |
| Staff | /staff |
| Settings | /settings |

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) ≥ 9  (`npm install -g pnpm`)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`pnpm add -g wrangler`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- A [Cloudflare](https://cloudflare.com) account (free tier works)
- A [Supabase](https://supabase.com) project
- A [Brevo](https://brevo.com) account (free tier for 300 emails/day)

---

## Local Development Setup

### 1. Clone & Install

```bash
git clone https://github.com/yourorg/hellotms.com.bd.git
cd hellotms.com.bd
pnpm install
```

### 2. Environment Variables

```bash
# Admin SPA
cp apps/admin/.env.example apps/admin/.env.local
# Edit with your Supabase URL and anon key

# Public site
cp apps/public/.env.example apps/public/.env.local
# Edit with your Supabase URL and anon key

# Worker (local dev)
cp workers/api/.env.example workers/api/.dev.vars
# Edit with your Supabase service role key and Brevo credentials
```

### 3. Start Supabase locally

```bash
supabase start
supabase db push   # applies migrations from supabase/migrations/
```

### 4. Run all services

```bash
# Terminal 1 — Cloudflare Worker (Hono API)
cd workers/api
pnpm dev        # runs on localhost:8787

# Terminal 2 — Admin SPA
cd apps/admin
pnpm dev        # runs on localhost:5173

# Terminal 3 — Public site
cd apps/public
pnpm dev        # runs on localhost:3000
```

Or run everything from root:
```bash
pnpm dev        # pnpm --parallel dev for all workspaces
```

---

## Database

### Apply migrations

```bash
# Against local Supabase
supabase db push

# Against remote Supabase project
supabase db push --linked
```

### Migrations

| File | Description |
|---|---|
| `001_initial_schema.sql` | All tables, indexes, default data |
| `002_rls_policies.sql` | Row Level Security policies for all tables |

### First admin user

After deploying, create the first admin via Supabase dashboard:
1. Go to Authentication → Users → Invite user
2. After they sign up, update their `profiles.role_id` to the `owner` role via the Table Editor

---

## Deployment

### Supabase (Database + Auth + Storage)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy the project URL and anon/service keys
3. Run `supabase db push --linked` to apply migrations
4. Create storage bucket `invoices` (private) in the dashboard

### Cloudflare Worker (API)

```bash
cd workers/api

# Set secrets
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put BREVO_API_KEY
wrangler secret put BREVO_SENDER_EMAIL
wrangler secret put BREVO_SENDER_NAME

# Deploy
wrangler deploy
```

### Admin SPA — Cloudflare Pages

```bash
# In Cloudflare Pages dashboard:
# Framework preset: Vite
# Build command: pnpm --filter @hellotms/admin build
# Build output: apps/admin/dist
# Root directory: (leave empty)
# Environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL

# Custom domain: admin.hellotms.com.bd
```

### Public Site — Cloudflare Pages

```bash
# In Cloudflare Pages dashboard:
# Framework preset: Next.js
# Build command: pnpm --filter @hellotms/public build
# Build output: apps/public/.next
# Root directory: (leave empty)
# Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_BASE_URL

# Custom domain: hellotms.com.bd
```

### DNS Configuration

| Type | Name | Target |
|---|---|---|
| CNAME | `@` | `<pages-project>.pages.dev` |
| CNAME | `www` | `<pages-project>.pages.dev` |
| CNAME | `admin` | `<admin-pages-project>.pages.dev` |
| CNAME | `api` | `hellotms-api.<account>.workers.dev` |

---

## Email (Brevo)

1. Create a free account at [brevo.com](https://brevo.com)
2. Go to **SMTP & API** → **API Keys** → create a key
3. Verify your sender domain: `hellotms.com.bd` (add DKIM/SPF/DMARC DNS records)
4. Set `BREVO_SENDER_EMAIL=noreply@hellotms.com.bd` in Worker secrets

---

## Project Structure Details

### packages/shared
Shared TypeScript types, Zod validation schemas, and utilities used by both admin and worker:
- `types/index.ts` — All entity interfaces
- `schemas/index.ts` — Zod schemas for form validation
- `utils/index.ts` — `formatBDT`, `computeProjectDurations`, `slugify`, `generateInvoiceNumber`

### workers/api
Cloudflare Worker serving as a secure gateway:
- `/leads` — Public endpoint for contact form submissions
- `/staff` — Invite, role management (requires `manage_staff` permission)
- `/invoices/:id/send` — Generate PDF → upload → send via Brevo
- `/invoices/:id/pdf` — Return signed PDF URL
- Cron (daily 8AM UTC) — Supabase keepalive ping

### Admin SPA Features
- Role-based access control via Supabase RLS + `can()` hook
- Date range filtering across all financial reports
- Full project lifecycle: Brief → Quotation → Execution → Review → Completed
- 5 timeline duration calculations per project
- Inline ledger (income/expense) CRUD
- Collection tracking
- Invoice builder with PDF generation and email delivery
- CMS for public website content management

---

## License

Proprietary — © 2024 Hello TMS. All rights reserved.
