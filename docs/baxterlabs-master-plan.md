# BaxterLabs.ai — Engagement Platform Master Plan

**Implementation Master Plan** · Version 1.0 · February 23, 2026
Approach 3: Python / FastAPI + Supabase · Target: 3–5 concurrent engagements

---

Complete build plan for the diagnostic engagement platform — 9 milestones from foundation to production deploy. Designed for execution with Claude Code.

---

## Contents

| # | Milestone | # | Milestone |
|---|-----------|---|-----------|
| 00 | [Overview & Stack](#00--overview--stack) | 05 | [Upload Portal](#05--upload-portal) |
| 01 | [Foundation](#01--foundation) | 06 | [Phase Management](#06--phase-management--prompt-system) |
| 02 | [Public Site + Intake](#02--public-site--intake-flow) | 07 | [Deliverables + Debrief](#07--deliverables--debrief-flow) |
| 03 | [Research Pipeline](#03--research-pipeline) | 08 | [Polish + QA](#08--polish--qa) |
| 04 | [Partner Dashboard](#04--partner-dashboard-core) | 09 | [Archive + Deploy](#09--archive--deploy) |

---

## 00 — Overview & Stack

Project scope, technology choices, repo structure, and milestone summary. This is the reference frame for everything that follows.

> **What We're Building**
>
> A platform to manage BaxterLabs Advisory's 14-day diagnostic engagements at scale (3–5 concurrent). Replaces manual Google Drive workflows with: a public marketing site, token-based client portals for uploads and deliverables, an authenticated partner dashboard, and a FastAPI backend handling DocuSign, Firecrawl research, transactional email, and Supabase storage. Infrastructure cost: ~$42–47/mo supporting $36K–$75K/mo revenue potential.

### Technology Stack

| Component | Choice |
|-----------|--------|
| **Frontend** | React (Vite) — public site, client portals, partner dashboard |
| **Backend** | Python / FastAPI — 16 API endpoints, all business logic + email |
| **Database** | Supabase (PostgreSQL) — 10 tables, RLS, Auth, Storage buckets |
| **File Storage** | Supabase Storage — structured buckets per engagement |
| **Auth** | Supabase Auth — partner login (email/password). Client portals use token URLs. |
| **Legal Documents** | DocuSign — NDA + Engagement Agreement templates, webhook callbacks |
| **Research** | Firecrawl Python SDK — company website scraping + contact web search |
| **Email** | Resend or Postmark — transactional email via `send_email()` utility in FastAPI |
| **LinkedIn Prep** | Claude in Chrome — human-assisted, not automated. No API integration. |
| **Scheduling** | Calendly — embed on Get Started page (post-intake-submission) |
| **Deploy (Backend)** | Render — $7/mo starter plan |
| **Deploy (Frontend)** | Vercel or Render — free tier static hosting |

### Monorepo Structure

| Directory | Purpose |
|-----------|---------|
| `/frontend` | React app (Vite) — public pages, client portals, partner dashboard |
| `/backend` | FastAPI service — endpoints, DocuSign, Firecrawl, email utility |
| `/supabase` | Migration files, seed data, RLS policies |
| `/docs` | This plan, architecture diagrams, brand assets |
| `/legacy` | Archived static site files (reference only) |

### Milestone Summary

| Milestone | Summary | Dependencies | Key Outputs |
|-----------|---------|--------------|-------------|
| **1. Foundation** | Repo, Supabase schema, FastAPI skeleton, email utility, env config | None | Monorepo, 10 tables, running API |
| **2. Public Site + Intake** | All 4 marketing pages from existing copy + intake form + Calendly + NDA | M1 | End-to-end: form → NDA → call booked |
| **3. Research Pipeline** | Firecrawl company + interview contact research, dossier/brief generation | M1 | Auto-research on NDA sign + Start Engagement |
| **4. Partner Dashboard** | Auth login, overview, engagement detail, Start Engagement gate | M1, M2 | Partner can view + start engagements |
| **5. Upload Portal** | Token-based upload page, checklist slots, progress tracking | M1, M4 | Client uploads → partner sees inventory |
| **6. Phase Management** | Prompt library, variable injection, phase advancement, review gates | M4 | Copy prompt → Cowork → advance phase |
| **7. Deliverables + Debrief** | Wave 1 + Wave 2 release, deliverable portal, post-debrief actions | M4, M6 | Two-wave client delivery flow |
| **8. Polish + QA** | Responsive, error handling, loading states, SEO, bio placeholders | M2–M7 | Production-quality UX |
| **9. Archive + Deploy** | Phase 7 archive, full E2E test, deploy to Render + Vercel, DNS | All | Live production system |

---

## 01 — Foundation

Everything downstream depends on this. Repo structure, database schema, running API skeleton, email utility, environment configuration. Nothing works without it.

### Milestone 1: Foundation — Repo, Schema, API Skeleton

Restructure the existing static site repo into a monorepo. Set up Supabase project with all 10 tables, RLS policies, and storage buckets. Stand up a FastAPI service with auth middleware, email utility, and health check.

- **Depends:** None
- **Outputs:** Monorepo · 10 Tables · Running API

---

#### Repo Setup

- [ ] **Restructure repo** — create `/frontend`, `/backend`, `/supabase`, `/docs`, `/legacy` directories. Move existing static site files to `/legacy`.
- [ ] **Initialize frontend** — `npm create vite@latest` with React + TypeScript in `/frontend`. Install React Router, Tailwind CSS (or styled-components — match brand guide).
- [ ] **Initialize backend** — Python venv in `/backend`. Install FastAPI, uvicorn, supabase-py, python-docusign, firecrawl-py, httpx, python-dotenv. Create `requirements.txt`.
- [ ] **Environment config** — `.env.example` with all required keys: SUPABASE_URL, SUPABASE_SERVICE_KEY, DOCUSIGN_*, FIRECRAWL_API_KEY, EMAIL_API_KEY, FRONTEND_URL. Add `.env` to .gitignore.
- [ ] **Root README** — project overview, setup instructions, architecture diagram link, how to run locally.

#### Supabase Schema

- [ ] **Create Supabase project** — new project (or use existing). Note project URL + anon key + service role key.
- [ ] **Migration: clients table** — id (uuid), company_name, primary_contact_name, primary_contact_email, primary_contact_phone, industry, revenue_range, employee_count, website_url, referral_source, created_at
- [ ] **Migration: engagements table** — id (uuid), client_id (FK), status (enum), phase (0–7), fee, start_date, target_end_date, partner_lead, discovery_notes, pain_points, preferred_start_date, debrief_complete (bool), upload_token (unique), deliverable_token (unique), created_at, updated_at
- [ ] **Migration: interview_contacts table** — id, engagement_id (FK), contact_number (1/2/3), name, title, email, phone, linkedin_url
- [ ] **Migration: legal_documents table** — id, engagement_id (FK), type (nda/agreement), docusign_envelope_id, status, signed_pdf_path, sent_at, signed_at
- [ ] **Migration: documents table** — id, engagement_id (FK), category (financial/payroll/vendor/revenue/operations/legal), filename, storage_path, file_size, uploaded_at
- [ ] **Migration: research_documents table** — id, engagement_id (FK), type (company_dossier/interview_brief), content (text/jsonb), source_urls (jsonb), contact_name (nullable), created_at
- [ ] **Migration: phase_prompts table** — id, phase (0–7), name, template_text, variables (jsonb list), version, is_active (bool), created_at
- [ ] **Migration: phase_executions table** — id, engagement_id (FK), phase, prompt_version, executed_at, notes
- [ ] **Migration: deliverables table** — id, engagement_id (FK), type (exec_summary/full_report/workbook/roadmap/deck/retainer_proposal), status (draft/approved/released), wave (1/2), storage_path, approved_at, released_at
- [ ] **Migration: activity_log table** — id, engagement_id (FK), actor, action, details (jsonb), created_at
- [ ] **Status enum** — intake, nda_pending, nda_signed, discovery_done, agreement_pending, agreement_signed, documents_pending, documents_received, phase_1 through phase_6, debrief, wave_1_released, wave_2_released, closed
- [ ] **RLS policies** — partner dashboard reads require auth. Upload portal validates token. Deliverable portal validates token. Service role key used for backend writes.
- [ ] **Storage buckets** — create `engagements` bucket. Folder structure created per-engagement by API: inbox/{category}/, research/, working_papers/, deliverables/, qc/, legal/. Plus top-level `archive` bucket.

#### FastAPI Skeleton

- [ ] **App structure** — `main.py`, `/routers` (intake, engagements, docusign, upload, deliverables, research), `/services` (email, docusign, firecrawl, supabase_client), `/models` (Pydantic schemas), `/middleware` (auth).
- [ ] **Supabase client** — singleton client using service role key. Helper functions for common queries.
- [ ] **Auth middleware** — verify Supabase JWT for partner dashboard routes. Token validation for client portal routes.
- [ ] **Email utility** — `send_email(to, subject, html_body, attachments=None)` using Resend or Postmark SDK. Template rendering for each of the 11 notification types.
- [ ] **Health check** — `GET /api/health` returns status + Supabase connection check.
- [ ] **CORS config** — allow frontend origin (localhost:5173 dev, production domain).
- [ ] **Activity logger** — utility function `log_activity(engagement_id, actor, action, details)` that writes to activity_log table. Called from every state-changing endpoint.

#### ✅ Acceptance Criteria

- [ ] Monorepo with /frontend, /backend, /supabase directories, each runnable locally
- [ ] All 10 Supabase tables created with correct columns, types, and foreign keys
- [ ] RLS policies active — unauthenticated requests to dashboard data blocked
- [ ] FastAPI running locally, `GET /api/health` returns 200 with Supabase connection confirmed
- [ ] `send_email()` sends a test email successfully via chosen provider
- [ ] `.env.example` documents all required environment variables

---

## 02 — Public Site + Intake Flow

The front door. Build all 4 public pages from the existing website copy document, wire the Get Started page intake form to the backend, integrate DocuSign NDA sending, and embed Calendly scheduling.

### Milestone 2: Public Website + Intake + NDA + Scheduling

Four marketing pages built from 19_Website_Copy.docx with BaxterLabs brand standards. Get Started page: intake form → FastAPI creates records → NDA sent via DocuSign → Calendly embed appears for discovery call booking.

- **Depends:** M1
- **Outputs:** 4 Pages · Intake API · DocuSign NDA · Calendly

---

#### Public Pages (from existing copy)

- [ ] **Homepage `/`** — Hero (H1 + subheadline + CTA), social proof strip ($400K+ / 14 Days / $12,500), problem block, solution block, 3 feature cards, 5-step process, Who We Serve, CTA block. All copy from Website Copy doc.
- [ ] **Services `/services`** — Phase 1 14-Day Audit section ($12,500), Phase 2 Implementation Retainer ($5K–$10K/mo). Copy from Website Copy doc.
- [ ] **About `/about`** — George DeVries bio (placeholder fields for now), Alfonso Cordon bio (placeholder fields), Why BaxterLabs section. Copy from Website Copy doc.
- [ ] **Get Started `/get-started`** — Two-section page: intake form (Section 1) + Calendly embed (Section 2, appears after form submission).
- [ ] **Navigation + footer** — header nav (Home, Services, About, Get Started CTA button), footer (Dark Teal bg per brand guide, contact email, copyright).
- [ ] **Brand standards** — Deep Crimson (#66151C) primary, Dark Teal (#005454) secondary, Playfair Display headings, Inter body, Gold (#C9A84C) accents, Ivory (#FAF8F2) alternating sections per Brand Style Guide v1.1.

#### Intake Form (Get Started Page)

- [ ] **Form fields** — Company name, primary contact (name, email, phone), industry dropdown, revenue range dropdown, employee count, company website URL, pain points (textarea), 3 interview contacts (each: name, title, email, phone, LinkedIn URL optional), preferred start date, referral source.
- [ ] **Client-side validation** — required fields marked, email format, URL format, phone format. Inline error messages.
- [ ] **Submit → `POST /api/intake`** — sends form data to backend. Loading state on button. Error handling for API failures.
- [ ] **Success state** — form collapses or shows confirmation. Calendly embed appears below with "Schedule Your Discovery Call" heading.

#### Backend: Intake Endpoint

- [ ] **`POST /api/intake`** — validate input → create client record → create engagement record (status: 'nda_pending') → create 3 interview_contact records → generate upload_token + deliverable_token (uuid4) → trigger NDA send → email partner "New intake received" → return success + engagement_id.

#### DocuSign Integration

- [ ] **DocuSign developer account** — create app, get integration key, RSA key pair for JWT auth. Configure redirect URIs.
- [ ] **NDA template** — create in DocuSign with merge fields: company_name, contact_name, date. Single signer role.
- [ ] **`POST /api/docusign/send-nda`** — authenticate with DocuSign → populate NDA template → send to primary contact email → store envelope_id in legal_documents → update engagement status to 'nda_pending'.
- [ ] **`POST /api/docusign/webhook`** — receive DocuSign Connect callback → verify → if NDA signed: update legal_documents status, update engagement status to 'nda_signed', download signed PDF to storage, email partner "NDA signed", trigger company research (M3). If agreement signed: similar flow (M4).
- [ ] **Webhook security** — HMAC signature verification on incoming DocuSign webhooks.

#### Calendly Integration

- [ ] **Calendly embed** — use Calendly inline embed widget on Get Started page. 30-minute "Discovery Call" event type. Prefill name + email from the form submission. Only appears after successful intake submission.

#### ✅ Acceptance Criteria

- [ ] All 4 public pages render with correct copy and brand styling
- [ ] Intake form submits → client + engagement + interview contacts created in Supabase
- [ ] NDA arrives in test email inbox via DocuSign within 60 seconds of form submission
- [ ] DocuSign webhook correctly updates engagement status to 'nda_signed' on signing
- [ ] Partner receives email notification for both intake and NDA signing events
- [ ] Calendly embed appears after form submission with prefilled contact info
- [ ] Mobile responsive across all 4 pages

---

## 03 — Research Pipeline

Automated intelligence gathering. Firecrawl scrapes company websites and searches for contacts on NDA signing and Start Engagement triggers. Outputs structured dossiers and interview briefs.

### Milestone 3: Firecrawl Research Automation

Two research jobs: company research (triggered by NDA signing) produces a Pre-Discovery Dossier; interview contact research (triggered by Start Engagement) produces per-person Interview Briefs. Both stored in Supabase.

- **Depends:** M1
- **Outputs:** Company Dossier · Interview Briefs · Email Notifications

---

#### Company Research (Trigger: NDA Signed)

- [ ] **`POST /api/engagements/{id}/research/discovery`** — called automatically when DocuSign webhook sets status to 'nda_signed'.
- [ ] **Firecrawl: website scrape** — scrape client's website_url. Target pages: about, team/leadership, services/products, press/news/blog, careers/jobs. Extract: company overview, leadership names + titles, service lines, recent news, hiring signals, tech stack hints.
- [ ] **Firecrawl: primary contact search** — web search for primary contact name + company. Find: public bios, LinkedIn URL, conference talks, articles, board positions.
- [ ] **Assemble dossier** — structured markdown: Company Overview, Leadership Team, Services/Products, Recent News & Growth Signals, Primary Contact Background, LinkedIn URLs Discovered. Store in research_documents table (type: 'company_dossier').
- [ ] **Upload to storage** — save markdown to Supabase Storage: `{engagement_id}/research/company_dossier.md`
- [ ] **Email partner** — "Research dossier ready for {company_name}. Review before discovery call."

#### Interview Research (Trigger: Start Engagement)

- [ ] **`POST /api/engagements/{id}/research/interviews`** — called when partner clicks 'Start Engagement' in dashboard (M4).
- [ ] **Firecrawl: per-contact search** — for each of 3 interview contacts: web search name + company + title. Find: public bios, LinkedIn URL, talks, publications, web mentions.
- [ ] **Assemble interview briefs** — per person: name, title, tenure estimate, background summary, likely perspective (based on role), suggested questions. Store in research_documents table (type: 'interview_brief', one row per contact).
- [ ] **Upload to storage** — `{engagement_id}/research/interview_brief_{contact_number}.md`
- [ ] **Email partner** — "Interview briefs ready for {company_name}. 3 contact profiles available."

#### Error Handling

- [ ] **Graceful failures** — if Firecrawl can't find a page or contact, log the gap, include "No public information found" in the relevant section, still deliver the dossier with available data. Never block the engagement flow.
- [ ] **Async execution** — research runs as a background task (BackgroundTasks in FastAPI) so the webhook/start endpoint returns immediately. Partner is emailed when complete.

#### ✅ Acceptance Criteria

- [ ] NDA signing triggers company research automatically — dossier appears in Supabase within 2 minutes
- [ ] Dossier includes company overview, leadership, services, and LinkedIn URLs when available
- [ ] Start Engagement triggers interview research — 3 briefs appear in Supabase
- [ ] Partner receives email notification for both research completions
- [ ] Partial data (some contacts not found) still produces a deliverable brief

---

## 04 — Partner Dashboard (Core)

Where George lives. Login, see all engagements, drill into detail, and trigger the 'Start Engagement' decision gate.

### Milestone 4: Partner Dashboard — Auth, Overview, Detail, Start Gate

Supabase Auth login. Engagement overview table. Engagement detail page with all data sections. Start Engagement page as the human decision gate — reviews everything, sets fee/dates, clicks the button that triggers agreement + folders + research.

- **Depends:** M1, M2
- **Outputs:** Login · Overview · Detail · Start Engagement · Agreement Send

---

#### Authentication

- [ ] **Login page `/dashboard/login`** — email + password form. Supabase Auth signInWithPassword. Redirect to /dashboard on success. Session persistence.
- [ ] **Auth guard** — React route protection. All `/dashboard/*` routes require valid session. Redirect to login if unauthenticated.
- [ ] **Create initial partner user** — George's account via Supabase Auth dashboard or seed script.

#### Engagement Overview

- [ ] **Overview page `/dashboard`** — table of all engagements: client name, status, phase, document count, days remaining, fee. Sortable columns. Status badge colors. Click row → engagement detail.
- [ ] **`GET /api/engagements`** — returns all engagements with client name joined. Auth required.

#### Engagement Detail

- [ ] **Detail page `/dashboard/engagement/{id}`** — THE key page. Sections: Status & Phase Tracker, Client Info, Interview Contacts, Research Dossier (rendered markdown), Interview Briefs, Legal Documents (NDA/Agreement status + signed PDF links), Document Inventory, Document Gaps, Activity Log.
- [ ] **`GET /api/engagements/{id}`** — returns full engagement detail with all related data: client, contacts, legal docs, documents, research, deliverables, activity log. Auth required.
- [ ] **Action buttons** — contextual based on status. "Start Engagement" (if nda_signed/discovery_done), "Advance Phase" (if in phases), more actions added in later milestones.

#### Start Engagement Gate

- [ ] **Start page `/dashboard/engagement/{id}/start`** — review panel showing intake data + research dossier + discovery notes field. Set: engagement fee (input), target start date (datepicker), partner lead (dropdown). Preview agreement terms. Big "START ENGAGEMENT" button.
- [ ] **`POST /api/engagements/{id}/start`** — validates partner auth → updates engagement (fee, dates, partner_lead) → creates Supabase Storage folder structure (inbox/6 categories, research, working_papers, deliverables, qc, legal) → triggers DocuSign agreement send → triggers interview research (M3) → status → 'agreement_pending' → log activity.
- [ ] **DocuSign: Engagement Agreement template** — merge fields: company_name, scope, fee, start_date, end_date, terms. Two signer roles (client + partner).
- [ ] **`POST /api/docusign/send-agreement`** — populate agreement template → send via DocuSign → store envelope_id.
- [ ] **Webhook: agreement signed** — extend DocuSign webhook handler: if agreement signed → update status to 'agreement_signed' → download signed PDF → create storage folders → trigger upload portal email (M5).

#### ✅ Acceptance Criteria

- [ ] Partner can log in and see all engagements in overview table
- [ ] Engagement detail page shows all client data, research dossier, legal doc statuses
- [ ] Start Engagement page shows review data + fee/date inputs + START button
- [ ] Clicking START creates storage folders, sends agreement, triggers interview research
- [ ] Agreement signing webhook updates status and triggers upload portal email

---

## 05 — Upload Portal

Token-based client upload page. Structured slots matching the ~25-item Data Request Checklist. No account needed.

### Milestone 5: Client Upload Portal

Token-based upload page at /upload/{token}. Six categories matching the Data Request Checklist (~25 items, 12 required). Progress bar. Each upload → Supabase Storage → partner notified. "Submission Complete" button advances status.

- **Depends:** M1, M4
- **Outputs:** Upload Page · File Routing · Progress Tracking · Notifications

---

#### Upload Portal Frontend

- [ ] **Upload page `/upload/{token}`** — validates token against engagement upload_token. Shows company name + engagement context. 6 collapsible category sections with labeled upload slots per checklist item. Required items marked. Drag-and-drop + click-to-upload per slot.
- [ ] **Checklist categories + items:**
  - **A: Financial** — P&L ✱, Balance Sheet ✱, Cash Flow, GL Export ✱, Budget vs Actual, Tax Returns
  - **B: Payroll** — Payroll Summary ✱, Org Chart ✱, Headcount History, Contractor Spend, PTO
  - **C: Vendor** — Vendor List ✱, Software Subs ✱, Top 10 Contracts, Insurance
  - **D: Revenue** — Revenue by Customer ✱, Invoicing ✱, AR Aging ✱, Revenue by Line, Rate Card, Churn
  - **E: Operations** — Process Docs, PM Export, CSAT, CRM Export
  - **F: Legal** — Entity Docs, Key Contracts, Pending Legal
  - ✱ = required
- [ ] **Progress bar** — "8 of 12 required documents received" with visual progress indicator. Updates in real-time after each upload.
- [ ] **"Submission Complete" button** — appears when all required docs uploaded (or can be clicked anyway with confirmation). Triggers status change to 'documents_received'.
- [ ] **Token expiry** — if token expired (30 days), show friendly message with contact email.

#### Upload Backend

- [ ] **`POST /api/upload/{token}`** — validate token → accept file + category + item_name → upload to Supabase Storage `{engagement_id}/inbox/{category}/{filename}` → create document record → email partner "{filename} received for {company}".
- [ ] **`GET /api/upload/{token}/status`** — returns checklist with uploaded/missing status per item. Used by frontend for progress display.
- [ ] **Submission complete handler** — update engagement status → 'documents_received' → email partner "All documents received for {company}, ready for Phase 1."

#### Dashboard Integration

- [ ] **Document inventory on detail page** — show all uploaded files with name, category, date, size. Highlight missing required items in red ("Document Gaps" section).

#### ✅ Acceptance Criteria

- [ ] Client can access upload portal via token URL — no login required
- [ ] Files upload to correct Supabase Storage paths by category
- [ ] Progress bar accurately reflects required items uploaded vs total required
- [ ] Partner receives email notification per individual file upload
- [ ] "Submission Complete" changes engagement status and notifies partner
- [ ] Expired token shows graceful error message

---

## 06 — Phase Management + Prompt System

The operational engine. Prompts in the database, rendered with live variables, copied to clipboard for Cowork execution. Phase advancement with review gates.

### Milestone 6: Phase Prompts + Advancement + Review Gates

Migrate 8 phase prompts from PDF into Supabase. Build prompt library page with variable injection. Add "Copy Prompt" to engagement detail. Phase advancement endpoint with review gates after Phases 1, 3, and 6.

- **Depends:** M4
- **Outputs:** Prompt Library · Variable Injection · Phase Tracking · Review Gates

---

#### Prompt Migration

- [ ] **Extract prompts** — from BaxterLabs_Phase_Prompts_v3.pdf, extract all 8 phase prompts (0–7) as text. Identify variable insertion points and mark with `{variable_name}` syntax.
- [ ] **Seed phase_prompts table** — insert all 8 prompts with: phase number, name, template_text, variables list, version 1, is_active = true.
- [ ] **Path updates** — update storage paths in prompts: 01_Inbox/ → `{engagement_id}/inbox/`, etc. Tag Phase 5 deck output as Wave 2. Update Phase 7 to reference API archive endpoint.

#### Prompt Library Page

- [ ] **Library page `/dashboard/prompts`** — all 8 phases listed with name, description, variable count, version. Click to expand and see full template text. Read-only reference view.

#### Variable Injection + Copy

- [ ] **`GET /api/engagements/{id}/prompt/{phase}`** — fetches active prompt template → injects engagement-specific variables: {client_name}, {company_name}, {engagement_id}, {fee}, {start_date}, {end_date}, {partner_lead}, {storage_base} (engagement_id path), {interview_contacts} (formatted list), {pain_points}. Returns rendered prompt text.
- [ ] **Phase prompt panel on detail page** — shows current phase prompt (rendered with variables). "Copy Phase {N} Prompt" button → copies to clipboard. Visual confirmation: "Copied!"

#### Phase Advancement

- [ ] **`POST /api/engagements/{id}/advance-phase`** — validates current phase → creates phase_execution record (prompt version used) → increments phase → updates engagement status → logs activity. Optional notes field for partner observations.
- [ ] **Review gates** — after Phases 1, 3, and 6: advance-phase returns a "review required" flag. Dashboard shows review confirmation dialog: "Phase {N} complete. Please review outputs before advancing. Confirm review?" Must confirm to proceed.
- [ ] **Phase tracker UI** — visual 8-phase timeline on engagement detail. Current phase highlighted. Completed phases checked. Review gate phases marked with shield icon.

#### ✅ Acceptance Criteria

- [ ] All 8 prompts in Supabase with correct variable placeholders
- [ ] Prompt library page shows all phases with expandable templates
- [ ] "Copy Prompt" renders variables correctly for a specific engagement and copies to clipboard
- [ ] Phase advancement creates execution record and updates engagement phase/status
- [ ] Review gates block advancement until partner confirms after Phases 1, 3, 6

---

## 07 — Deliverables + Debrief Flow

Two-wave release. Wave 1: four documents after Executive Debrief. Wave 2: deck + retainer proposal released by partner as a separate post-debrief action.

### Milestone 7: Two-Wave Deliverables + Client Portal

Deliverable records with wave tagging. Wave 1 approval + release (4 docs). Post-debrief "Release Deck + Proposal" button for Wave 2. Client-facing deliverable access portal at /deliverables/{token}.

- **Depends:** M4, M6
- **Outputs:** Wave 1 Release · Wave 2 Release · Deliverable Portal · Post-Debrief UI

---

#### Deliverable Records

- [ ] **Create deliverable records** — when engagement reaches Phase 5 (or partner uploads deliverables): create 6 deliverable rows. Wave 1: exec_summary, full_report, workbook, roadmap (status: draft). Wave 2: deck, retainer_proposal (status: draft).
- [ ] **Deliverable upload** — partner can upload/replace deliverable files on engagement detail page. Each upload updates the corresponding deliverable record's storage_path.

#### Wave 1 Release

- [ ] **`PUT /api/deliverables/{id}/approve`** — partner marks individual deliverables as 'approved'. Can approve one at a time or batch.
- [ ] **Release Wave 1 action** — when all 4 Wave 1 deliverables approved, "Release to Client" button appears. Click → sets all Wave 1 to 'released' → updates engagement status → emails client with deliverable portal link `/deliverables/{token}`.

#### Wave 2 Release (Post-Debrief)

- [ ] **Debrief complete toggle** — on engagement detail page: "Mark Debrief Complete" button. Sets debrief_complete = true.
- [ ] **"Release Presentation + Retainer Proposal" button** — only visible when debrief_complete = true AND Wave 2 deliverables are approved. Separate from Wave 1 release.
- [ ] **`POST /api/engagements/{id}/release-deck`** — sets Wave 2 deliverables to 'released' → emails client "Additional materials from your Executive Debrief are now available" with deliverable portal link.

#### Deliverable Portal (Client-Facing)

- [ ] **Portal page `/deliverables/{token}`** — validates token. Shows company name, engagement dates. Two sections: Wave 1 (4 docs with download links) and Wave 2 (deck + proposal, only visible if released). Professional BaxterLabs branding. Download buttons per file.
- [ ] **Token expiry** — 30-day expiry with friendly message if expired.

#### ✅ Acceptance Criteria

- [ ] Partner can upload, approve, and release Wave 1 deliverables independently
- [ ] Client receives email with portal link when Wave 1 released
- [ ] Wave 2 button only appears after debrief marked complete + Wave 2 deliverables approved
- [ ] Client portal shows Wave 1 docs immediately, Wave 2 appears only after separate release
- [ ] Client receives separate email when Wave 2 released

---

## 08 — Polish + QA

Production-quality UX. Responsive design, error states, loading indicators, SEO, accessibility, and the remaining dashboard pages.

### Milestone 8: Polish, Remaining Pages, QA

Responsive across all pages and devices. Error handling for every API call. Loading states. SEO meta tags per Website Copy doc. Complete the remaining dashboard pages: Client Directory and Capacity Calendar.

- **Depends:** M2–M7
- **Outputs:** Responsive · Error Handling · SEO · Client Directory · Capacity Calendar

---

#### Responsive + UX

- [ ] **Mobile responsive** — all public pages, upload portal, deliverable portal tested at 375px, 768px, 1024px, 1440px.
- [ ] **Loading states** — skeleton loaders or spinners for every data fetch. Button loading states for every form submission.
- [ ] **Error handling** — toast notifications for API errors. Retry logic for transient failures. Friendly error pages for 404/500.
- [ ] **Empty states** — meaningful empty states for: no engagements, no documents uploaded, no research yet, no deliverables.

#### SEO + Content

- [ ] **Meta tags** — per-page title + description (150–160 chars). Target keywords from Website Copy doc: profit leak audit, operational efficiency consulting, mid-market business advisor, management consulting for SMBs, business diagnostic, EBITDA improvement, cost reduction consulting.
- [ ] **Bio placeholders** — flag remaining [PLACEHOLDER] fields in About page. George to fill in partner bios.
- [ ] **Open Graph tags** — og:title, og:description, og:image for social sharing.

#### Remaining Dashboard Pages

- [ ] **Client Directory `/dashboard/clients`** — all clients with company, primary contact, last engagement date + status. Click → view engagement history.
- [ ] **Capacity Calendar `/dashboard/calendar`** — Gantt-style view of 14-day engagement blocks. Phase overlap warnings when > 3 concurrent in same phase. Open availability windows highlighted.

#### ✅ Acceptance Criteria

- [ ] No layout breakage at any standard breakpoint (375/768/1024/1440px)
- [ ] Every API-calling interaction shows loading state and handles errors gracefully
- [ ] All public pages have unique meta descriptions under 160 characters
- [ ] Client Directory and Capacity Calendar functional

---

## 09 — Archive + Deploy

Phase 7 archive endpoint, full end-to-end test of the complete 18-step workflow, and production deployment.

### Milestone 9: Archive + End-to-End Test + Production Deploy

Build Phase 7 archive endpoint. Run full E2E test of all 18 workflow steps with test data. Deploy FastAPI to Render, frontend to Vercel. Configure DNS, production environment variables, DocuSign production, email provider.

- **Depends:** All
- **Outputs:** Archive API · E2E Test · Live Production System

---

#### Phase 7 Archive

- [ ] **`POST /api/engagements/{id}/archive`** — moves all files from `{engagement_id}/` to `archive/{engagement_id}/` in Supabase Storage. Preserves folder structure. Generates Completion Manifest (JSON: all files, all phases executed, all deliverables released, final status). Sets status → 'closed'. Emails partner: "Engagement archived."
- [ ] **Archive button on dashboard** — only visible when status is 'wave_2_released' or later. Confirmation dialog: "This will archive all files and close the engagement. This action cannot be undone."

#### End-to-End Test

- [ ] **Full 18-step walkthrough** — test with real data: fill intake → verify NDA arrives → sign NDA → verify research triggers → login to dashboard → review dossier → click Start Engagement → verify agreement arrives → sign agreement → upload test documents → advance through phases → mark debrief complete → release Wave 1 → release Wave 2 → archive.
- [ ] **Email verification** — confirm all 11 email notification types fire at correct moments with correct content.
- [ ] **Token expiry test** — verify upload and deliverable portal tokens expire after 30 days.
- [ ] **Concurrent engagement test** — create 2–3 test engagements simultaneously. Verify UUID isolation — no data cross-contamination.

#### Production Deploy

- [ ] **Render setup (backend)** — create Web Service on Render. Python runtime, start command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`. Set all environment variables. Starter plan ($7/mo).
- [ ] **Vercel setup (frontend)** — connect repo, set build command (`cd frontend && npm run build`), output directory (`frontend/dist`). Set environment variables (API URL). Free tier.
- [ ] **DNS configuration** — point baxterlabs.ai to Vercel. Set up api.baxterlabs.ai subdomain pointing to Render (or use /api proxy through Vercel).
- [ ] **DocuSign production** — switch from sandbox to production DocuSign environment. Update API endpoints and credentials.
- [ ] **Email production** — verify sending domain with Resend/Postmark. Set up SPF/DKIM records for deliverability.
- [ ] **SSL + security** — HTTPS on both frontend and backend. Verify CORS, webhook signature verification, token validation all working in production.
- [ ] **Smoke test in production** — run abbreviated E2E test against live system. Verify intake → NDA → dashboard → at minimum.

#### ✅ Acceptance Criteria

- [ ] Archive endpoint moves all files and generates Completion Manifest
- [ ] Full 18-step E2E test passes with no errors
- [ ] 2–3 concurrent test engagements show no cross-contamination
- [ ] Production site live at baxterlabs.ai with working API
- [ ] DocuSign sends from production (not sandbox)
- [ ] All emails deliver to inbox (not spam) with verified domain

---

*BaxterLabs Advisory · Platform Master Plan v1.0 · February 23, 2026 · Confidential*
