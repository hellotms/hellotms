# Hellotms.com.bd — Deployment Reference

> Keep this file locally. Do NOT commit secrets to Git.

---

## 1. Public Site — Cloudflare Pages (acadome.dev)

### Build Settings (Cloudflare Pages Dashboard)
| Setting              | Value                                   |
|---------------------|-----------------------------------------|
| Build command       | `pnpm --filter @hellotms/public build`  |
| Build output dir    | `apps/public/out`                       |
| Root directory      | `/`                                     |
| Node version        | `20`                                    |

### Environment Variables (Cloudflare Pages → Settings → Environment Variables)
```
NODE_VERSION=20
PNPM_VERSION=9
NEXT_PUBLIC_SITE_URL=https://acadome.dev
```

---

## 2. Admin Panel — Cloudflare Pages (ad.acadome.dev)

### Build Settings
| Setting              | Value                                    |
|---------------------|------------------------------------------|
| Build command       | `pnpm --filter @hellotms/admin build`    |
| Build output dir    | `apps/admin/dist`                        |
| Root directory      | `/`                                      |
| Node version        | `20`                                     |

### Environment Variables (Cloudflare Pages → Settings → Environment Variables)
```
NODE_VERSION=20
PNPM_VERSION=9
VITE_SUPABASE_URL=https://tvebmpftgkkkvppqjgir.supabase.co
VITE_SUPABASE_ANON_KEY=<get from Supabase dashboard → Project Settings → API>
VITE_SUPABASE_SERVICE_KEY=<get from Supabase dashboard → Project Settings → API>
VITE_API_BASE_URL=https://api.acadome.dev
BREVO_API_KEY=<get from Brevo → Account → SMTP & API → API Keys>
BREVO_SENDER_EMAIL=noreply@mail1.acadome.me
BREVO_SENDER_NAME=Marketing Solution
```

---

## 3. Cloudflare Worker (api.acadome.dev)

### Deploy Command (run from project root)
```bash
cd workers/api
pnpm run deploy
```

### Secrets — Set once via CLI (NOT in wrangler.toml)
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_KEY
wrangler secret put BREVO_API_KEY
wrangler secret put BREVO_SENDER_EMAIL
wrangler secret put BREVO_SENDER_NAME
```

### wrangler.toml vars (already in file, for reference)
```toml
[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGINS = "https://acadome.dev,https://ad.acadome.dev"
```

---

## 4. Cloudflare R2 Storage 

### Configuration
1. Bucket: `hellotms-media`
2. Public URL: `https://pub-d74fef399a584bd1a3f644d818273e03.r2.dev`
3. API Access: Use the Access Key ID and Secret Access Key generated in the R2 dashboard (from Manage R2 API Tokens).

### wrangler.toml binding (already added)
```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "hellotms-media"

[vars]
R2_PUBLIC_URL = "https://pub-d74fef399a584bd1a3f644d818273e03.r2.dev"
```

### Note for Future Custom Domain
When a custom domain (e.g., `media.hellotms.com.bd`) is added to the bucket:
1. Update `R2_PUBLIC_URL` in `wrangler.toml` (and redeploy worker).
2. The Admin panel will automatically fetch the new URL for future uploads.


---

## 5. Supabase Migrations (apply in order)

Run from Supabase dashboard → SQL Editor, or via CLI:
```bash
supabase db push
```

Migration files (in order):
- `001_initial_schema.sql`
- `002_rls_policies.sql`
- `003_add_project_media_fields.sql`
- `004_add_project_proposal_date.sql`
- `005_project_media_and_roles_label.sql`
- `006_contact_submissions_and_profile_fields.sql` ← NEW

---

## 6. Local Development

```bash
# Start all services
pnpm run dev:public   # localhost:3000  — Public site
pnpm run dev:admin    # localhost:5173  — Admin panel

# Start Cloudflare Worker locally
cd workers/api
pnpm run dev          # localhost:8976  — API worker

# Supabase local (optional)
supabase start
```

### Local .env files
- `apps/admin/.env` — Supabase keys + Brevo + local API URL
- `apps/public/.env` — NEXT_PUBLIC_SITE_URL
- `workers/api/.env` — (use wrangler dev, secrets auto-loaded)
