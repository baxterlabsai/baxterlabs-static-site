# BaxterLabs.ai — Production Deployment Guide

Last updated: February 2026

---

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel      │────▶│   Render     │────▶│  Supabase    │
│   (Frontend)  │     │   (Backend)  │     │  (DB+Storage)│
│   React/Vite  │     │   FastAPI    │     │  PostgreSQL  │
└──────────────┘     └──────────────┘     └──────────────┘
  baxterlabs.ai    api.baxterlabs.ai     rqpnymffdhcvbudfbhra
```

## Prerequisites

- Render account (Starter plan, $7/mo)
- Vercel account (free tier)
- Domain: baxterlabs.ai with DNS access
- DocuSign developer/production account
- Gmail app password (or Resend/Postmark account)
- Supabase project (already provisioned: `rqpnymffdhcvbudfbhra`)

---

## Step 1: Deploy Backend to Render

1. Log in to [Render](https://render.com) → **New → Web Service**
2. Connect your GitHub repository: `baxterlabsai/baxterlabs-static-site`
3. Configure:
   - **Name**: `baxterlabs-api`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Starter ($7/mo)
4. Add all environment variables from `deploy/render-env-template.txt`
5. Click **Deploy**
6. Note the service URL (e.g., `https://baxterlabs-api.onrender.com`)

> ⚠️ **Render free tier spins down after inactivity.** Starter ($7/mo) keeps the service always-on.

---

## Step 2: Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com) → **Add New → Project**
2. Import from GitHub: `baxterlabsai/baxterlabs-static-site`
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (repo root — frontend is at root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables from `deploy/vercel-env-template.txt`:
   - `VITE_API_URL` = your Render URL from Step 1
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**

> The `vercel.json` in the repo root handles SPA rewrites automatically — all routes redirect to `index.html`.

---

## Step 3: DNS Configuration

1. In **Vercel** → Project Settings → Domains:
   - Add `baxterlabs.ai` and `www.baxterlabs.ai`
   - Vercel will provide DNS records (A record or CNAME)
2. In your DNS provider:
   - Point `baxterlabs.ai` → Vercel (per their instructions)
   - Point `www.baxterlabs.ai` → Vercel
3. **Option A** (custom API domain):
   - In Render → your service → Settings → Custom Domains
   - Add `api.baxterlabs.ai`
   - Add a CNAME record: `api.baxterlabs.ai` → your Render service hostname
4. **Option B** (use Render default URL):
   - Skip custom API domain
   - Set `VITE_API_URL` in Vercel to the Render default URL
5. Wait for DNS propagation (usually < 1 hour, up to 48 hours)

---

## Step 4: Supabase Production Settings

1. In [Supabase Dashboard](https://supabase.com/dashboard) → your project:
   - Verify RLS policies are enabled on all tables
   - Verify storage buckets `engagements` and `archive` exist and are set to **private**
2. Update the partner account password if needed:
   - Authentication → Users → george@baxterlabs.ai
3. Verify the anon key in Vercel matches your Supabase project's anon key

---

## Step 5: DocuSign Production Cutover

1. In [DocuSign Admin](https://admin.docusign.com):
   - Promote your integration from sandbox to production (requires DocuSign review)
   - Note: This may take 1-2 business days
2. Update Render environment variables:
   - `DOCUSIGN_BASE_URL` → `https://na4.docusign.net/restapi` (or your region)
   - Update template IDs if different in production
3. Update webhook configuration in DocuSign:
   - Webhook URL: `https://api.baxterlabs.ai/api/docusign/webhook` (or Render URL)
   - Events: envelope-completed, envelope-signed
4. Test: Create a test intake and verify NDA is received

---

## Step 6: Email Configuration

### Using Gmail SMTP (current setup):
1. Ensure Gmail "App Passwords" are enabled (requires 2FA)
2. Set `SMTP_USERNAME` and `SMTP_PASSWORD` in Render env vars
3. Set `FROM_EMAIL` to your Gmail address

### Upgrading to Resend or Postmark (recommended for production):
1. Sign up at [Resend](https://resend.com) or [Postmark](https://postmarkapp.com)
2. Add and verify `baxterlabs.ai` as a sending domain
3. Add DNS records:
   - **SPF**: `v=spf1 include:_spf.resend.com ~all` (or Postmark equivalent)
   - **DKIM**: Provider-specific CNAME records
4. Update backend email service to use the new provider's API
5. Test: Send a test email and verify inbox delivery (not spam)

---

## Step 7: Security Checklist

Before going live, verify:

- [ ] **HTTPS active** on both frontend (Vercel auto-SSL) and backend (Render auto-SSL)
- [ ] **CORS** — `ALLOWED_ORIGINS` in backend only includes production domains
  - Update `FRONTEND_URL` env var on Render
- [ ] **DocuSign webhook HMAC** secret is set and matching
- [ ] **Supabase RLS** policies are active on all 10 tables
- [ ] **Service role key** is ONLY used server-side (never in frontend env vars)
- [ ] **Upload tokens** and **deliverable tokens** are validated correctly
- [ ] **DEVELOPMENT_MODE=false** on Render (emails will actually send)
- [ ] **No test data** in production database
- [ ] **Partner password** is strong and not shared

---

## Step 8: Production Smoke Test

Run this abbreviated test against the live system:

1. Fill intake form at `baxterlabs.ai/get-started`
2. Verify email notification received at george@baxterlabs.ai
3. Log in to dashboard at `baxterlabs.ai/dashboard`
4. Verify new engagement appears in Overview
5. Check that DocuSign NDA sends from production (not sandbox)
6. Test upload portal link (send to yourself)
7. Verify Capacity Calendar and Client Directory load correctly

If all checks pass — **you're live!**

---

## Rollback Procedures

| Component | How to Rollback |
|-----------|----------------|
| **Frontend (Vercel)** | Dashboard → Deployments → click "..." on previous deploy → Promote to Production |
| **Backend (Render)** | Dashboard → your service → Events → Manual Deploy → select previous commit |
| **Database (Supabase)** | Dashboard → Database → Backups → Point-in-time recovery |
| **DNS** | Revert DNS records to previous values (changes propagate in minutes to hours) |

---

## Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Render (Backend) | Starter | $7/mo |
| Vercel (Frontend) | Free | $0/mo |
| Supabase (DB + Storage) | Free tier | $0/mo |
| DocuSign | Developer | $0–$10/mo |
| Gmail SMTP | Included | $0/mo |
| Domain (baxterlabs.ai) | Annual | ~$12/year |
| **Total** | | **~$8/mo** |

---

## Monitoring

- **Render**: Built-in logs and metrics at render.com dashboard
- **Vercel**: Deployment logs and analytics at vercel.com dashboard
- **Supabase**: Database metrics, logs, and storage usage at supabase.com dashboard
- **Uptime**: Consider adding [UptimeRobot](https://uptimerobot.com) (free) to monitor `api.baxterlabs.ai/api/health`
