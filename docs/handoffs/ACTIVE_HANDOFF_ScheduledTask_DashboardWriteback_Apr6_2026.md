# Handoff: Scheduled Task Dashboard Write-Back Integration

**Date:** 2026-04-06
**Author:** Claude Code (GATE 5 deliverable)
**Status:** Claude Code work complete. Cowork plugin updates pending.

---

## Summary

Four Cowork scheduled tasks now have persistent dashboard surfaces. Previously, their outputs lived only in Cowork session history. Now each task writes to a Supabase table, and the dashboard reads and displays the data.

| Scheduled Task | Table | Dashboard Surface | Status |
|---|---|---|---|
| Pipeline Priority Briefing | `pipeline_briefings` | Overview Morning Briefing card | DB + API + Frontend complete |
| Friday Metrics Rollup | `weekly_metrics_rollups` | Overview Rollup section + `/dashboard/analytics` | DB + API + Frontend complete |
| LinkedIn Commenting Pre-Brief | `commenting_opportunities` | `/dashboard/content/commenting` | DB + API + Frontend complete |
| Video Script Prep | `content_posts` (type=`video_script`) | Content Calendar (type filter) | DB + API + Frontend complete |

---

## 1. Database Migrations

### Migration 062: `pipeline_briefings`

**File:** `supabase/migrations/062_pipeline_briefings.sql`

```sql
CREATE TABLE pipeline_briefings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_date    DATE NOT NULL UNIQUE,
  pipeline_status  TEXT NOT NULL,
  follow_ups_due   JSONB NOT NULL DEFAULT '[]',
  priority_actions JSONB NOT NULL DEFAULT '[]',
  raw_analysis     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:** `idx_pipeline_briefings_date` on `(briefing_date DESC)`
**RLS:** `authenticated_full_access` — FOR ALL TO authenticated USING (true) WITH CHECK (true)
**Constraint:** `UNIQUE(briefing_date)` — one briefing per day

### Migration 063: `weekly_metrics_rollups`

**File:** `supabase/migrations/063_weekly_metrics_rollups.sql`

```sql
CREATE TABLE weekly_metrics_rollups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start  DATE NOT NULL UNIQUE,
  narrative   TEXT NOT NULL,
  metrics     JSONB NOT NULL DEFAULT '{}',
  highlights  JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes:** `idx_weekly_metrics_week` on `(week_start DESC)`
**RLS:** `authenticated_full_access`
**Constraint:** `UNIQUE(week_start)` — one rollup per week (keyed on Monday date)

### Migration 064: `commenting_opportunities`

**File:** `supabase/migrations/064_commenting_opportunities.sql`

```sql
CREATE TABLE commenting_opportunities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_date     DATE NOT NULL,
  rank              INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 5),
  profile_name      TEXT NOT NULL,
  profile_url       TEXT NOT NULL,
  post_summary      TEXT NOT NULL,
  relevance_reason  TEXT NOT NULL,
  suggested_angle   TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acted_on', 'skipped', 'saved')),
  acted_at          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (briefing_date, rank)
);
```

**Indexes:** `idx_commenting_opps_date` on `(briefing_date DESC)`, `idx_commenting_opps_pending` partial on `(status) WHERE status = 'pending'`
**RLS:** `authenticated_full_access`
**Constraints:** `CHECK (rank BETWEEN 1 AND 5)`, `UNIQUE(briefing_date, rank)` — prevents duplicates on Cowork retry

### Migration 065: `content_posts` type update

**File:** `supabase/migrations/065_content_posts_video_script_type.sql`

```sql
ALTER TABLE content_posts DROP CONSTRAINT content_posts_type_check;
ALTER TABLE content_posts ADD CONSTRAINT content_posts_type_check
  CHECK (type IN ('linkedin', 'blog', 'video_script'));
```

---

## 2. API Endpoints

All endpoints require `Authorization: Bearer <supabase_jwt>` header with `role: authenticated`.

### Pipeline Briefings (`backend/routers/briefings.py`)

| Method | Path | Response | Notes |
|---|---|---|---|
| GET | `/api/pipeline/briefings` | `PipelineBriefing[]` | `?limit=N` (default 10, max 50) |
| GET | `/api/pipeline/briefings/latest` | `PipelineBriefing \| null` | Used by Overview Morning Briefing card |
| GET | `/api/pipeline/briefings/{id}` | `PipelineBriefing` | 404 if not found |

**Response shape:**
```json
{
  "id": "uuid",
  "briefing_date": "2026-04-06",
  "pipeline_status": "Pipeline healthy: 12 opportunities, $340K value...",
  "follow_ups_due": [
    {"company": "Acme Corp", "contact": "Jane Smith", "due_date": "2026-04-04", "context": "Discovery follow-up"}
  ],
  "priority_actions": [
    {"rank": 1, "action": "Call Jane Smith...", "company": "Acme Corp", "rationale": "Highest value opportunity"}
  ],
  "raw_analysis": "Full analysis text...",
  "created_at": "2026-04-06T07:02:00.000000+00:00"
}
```

### Analytics Rollups (`backend/routers/analytics.py`)

| Method | Path | Response | Notes |
|---|---|---|---|
| GET | `/api/analytics/rollups` | `WeeklyRollup[]` | `?limit=N` (default 8, max 52) |
| GET | `/api/analytics/rollups/latest` | `WeeklyRollup \| null` | Used by Overview Rollup section |
| GET | `/api/analytics/rollups/{id}` | `WeeklyRollup` | 404 if not found |

**Response shape:**
```json
{
  "id": "uuid",
  "week_start": "2026-03-30",
  "narrative": "Strong week: 4 new prospects identified...",
  "metrics": {
    "pipeline_value": 340000,
    "new_prospects": 4,
    "discovery_calls": 2,
    "proposals_sent": 1,
    "posts_published": 3,
    "avg_engagement_rate": 8.2,
    "emails_sent": 12,
    "meetings_held": 5
  },
  "highlights": [
    {"category": "win", "text": "Acme Corp moved to proposal stage"},
    {"category": "flag", "text": "Content engagement dipped on Tuesday"},
    {"category": "metric", "text": "Response rate up 15%"}
  ],
  "created_at": "2026-04-04T17:00:00.000000+00:00"
}
```

**Highlight categories:** `win` (green dot), `flag` (amber dot), `metric` (blue dot)

### Commenting Opportunities (`backend/routers/commenting.py`)

| Method | Path | Response | Notes |
|---|---|---|---|
| GET | `/api/commenting` | `CommentingOpp[]` | `?date=YYYY-MM-DD` (default today), `?days=N` (default 1, max 30), `?status=X` |
| GET | `/api/commenting/stats` | `{"pending_count": N}` | Today's pending count for sidebar badge |
| GET | `/api/commenting/{id}` | `CommentingOpp` | 404 if not found |
| PATCH | `/api/commenting/{id}` | `CommentingOpp` | Body: `{"status": "acted_on\|skipped\|saved"}` |

**Response shape:**
```json
{
  "id": "uuid",
  "briefing_date": "2026-04-06",
  "rank": 1,
  "profile_name": "Sarah Chen",
  "profile_url": "https://linkedin.com/in/sarachen",
  "post_summary": "Posted about AI-driven due diligence...",
  "relevance_reason": "Directly relevant to BaxterLabs advisory...",
  "suggested_angle": "Share your experience with structured data rooms...",
  "status": "pending",
  "acted_at": null,
  "created_at": "2026-04-06T07:00:00.000000+00:00"
}
```

**Status values:** `pending` (initial), `acted_on` (commented), `skipped` (deliberately passed), `saved` (bookmarked for later)
**PATCH to `acted_on`** auto-sets `acted_at` timestamp.

### Content Posts (existing, updated)

| Method | Path | Notes |
|---|---|---|
| GET | `/api/content-posts?type=video_script` | Filters to video scripts only |
| GET | `/api/content-posts?type=video_script&status=draft` | Draft video scripts |

No new endpoints — existing content-posts CRUD handles `video_script` type automatically after the CHECK constraint update.

---

## 3. Frontend Surfaces

### 3.1 Morning Briefing Card — Overview

**URL:** `/dashboard` (Overview page, always visible regardless of filter tab)
**File:** `src/pages/dashboard/Overview.tsx`
**Endpoint:** `GET /api/pipeline/briefings/latest`

**Three rendering states:**
1. **No briefing (null):** "No briefing yet today — Cowork runs this weekdays at 7:00 AM PT"
2. **Stale briefing (3+ days old):** Red warning banner "No briefing received in Xd+ days — the Cowork scheduled task may need attention." Shows last briefing content below at 60% opacity with "Last priority actions" heading.
3. **Fresh briefing:** Shows "Generated at {time}" in header, pipeline status summary, numbered priority actions with rank badges.

### 3.2 Weekly Rollup Section — Overview

**URL:** `/dashboard` (Overview page, visible on "All" tab only)
**File:** `src/pages/dashboard/Overview.tsx`
**Endpoint:** `GET /api/analytics/rollups/latest`

Shows most recent rollup with narrative, top 4 metrics grid, and highlights with color-coded dots. "View history" links to Analytics page.

### 3.3 Analytics Page — Rollup History

**URL:** `/dashboard/analytics`
**File:** `src/pages/dashboard/Analytics.tsx`
**Endpoint:** `GET /api/analytics/rollups?limit=8`
**Sidebar:** Top-level "Analytics" section (purple dot, after Engagements, before Content)

Expand/collapse list of up to 8 weekly rollups. Most recent expanded by default. Each rollup shows narrative, full metrics grid, and highlights.

### 3.4 Commenting Page

**URL:** `/dashboard/content/commenting`
**File:** `src/pages/dashboard/content/Commenting.tsx`
**Endpoints:** `GET /api/commenting`, `GET /api/commenting/stats`, `PATCH /api/commenting/{id}`
**Sidebar:** Under Content section with pending count badge

Card-based layout (following News.tsx pattern):
- **Header:** Rank badge + profile name + LinkedIn external link icon
- **Body:** Post summary (2-line clamp, click to expand), italic relevance reason, teal-highlighted suggested angle block
- **Footer:** Status badge + action buttons (Mark Acted / Skip / Save)
- **Toggle:** "Today only" / "Last 7 days"

### 3.5 Content Calendar — Video Script Support

**URL:** `/dashboard/content/calendar`
**File:** `src/pages/dashboard/content/ContentCalendar.tsx`

- `video_script` added to `POST_TYPES` array
- Purple (`bg-purple-500` / `#7C3AED`) color in `TYPE_COLORS` map
- Labels display as "Video Script" (underscore replaced with space)
- Filter dropdown includes "Video Script" option
- Create form includes "Video Script" type option

---

## 4. Write-Back Contracts (Cowork Plugin Specs)

### 4.1 Pipeline Priority Briefing

**Table:** `pipeline_briefings`
**Schedule:** Weekdays 7:00 AM PT
**Write method:** `INSERT INTO pipeline_briefings (...) VALUES (...)`

**Required columns:**

| Column | Type | Required | Notes |
|---|---|---|---|
| `briefing_date` | DATE | Yes | Today's date, `YYYY-MM-DD`. UNIQUE — use `ON CONFLICT (briefing_date) DO UPDATE` for retries. |
| `pipeline_status` | TEXT | Yes | 1-2 sentence summary of pipeline health. Include opportunity count, total value, overdue count. |
| `follow_ups_due` | JSONB | Yes | Array of objects: `[{"company": str, "contact": str, "due_date": "YYYY-MM-DD", "context": str}]` |
| `priority_actions` | JSONB | Yes | Array of exactly 3 objects: `[{"rank": 1-3, "action": str, "company": str, "rationale": str}]` |
| `raw_analysis` | TEXT | No | Full analysis output for reference. Optional but recommended. |

**Example INSERT:**
```sql
INSERT INTO pipeline_briefings (briefing_date, pipeline_status, follow_ups_due, priority_actions, raw_analysis)
VALUES (
  CURRENT_DATE,
  'Pipeline healthy: 12 active opportunities, $340K total value. 3 follow-ups overdue.',
  '[{"company": "Acme Corp", "contact": "Jane Smith", "due_date": "2026-04-04", "context": "Discovery follow-up"}]'::jsonb,
  '[{"rank": 1, "action": "Call Jane Smith at Acme Corp", "company": "Acme Corp", "rationale": "Highest value opportunity"}]'::jsonb,
  'Full analysis text...'
)
ON CONFLICT (briefing_date) DO UPDATE SET
  pipeline_status = EXCLUDED.pipeline_status,
  follow_ups_due = EXCLUDED.follow_ups_due,
  priority_actions = EXCLUDED.priority_actions,
  raw_analysis = EXCLUDED.raw_analysis;
```

### 4.2 Friday Metrics Rollup

**Table:** `weekly_metrics_rollups`
**Schedule:** Fridays
**Write method:** `INSERT INTO weekly_metrics_rollups (...) VALUES (...)`

**Required columns:**

| Column | Type | Required | Notes |
|---|---|---|---|
| `week_start` | DATE | Yes | Monday of the reporting week. UNIQUE — use `ON CONFLICT (week_start) DO UPDATE` for retries. |
| `narrative` | TEXT | Yes | 2-4 sentence narrative summary of the week. |
| `metrics` | JSONB | Yes | Object with numeric KPIs. Recommended keys: `pipeline_value`, `new_prospects`, `discovery_calls`, `proposals_sent`, `posts_published`, `avg_engagement_rate`, `emails_sent`, `meetings_held`. All values numeric. |
| `highlights` | JSONB | Yes | Array of objects: `[{"category": "win"|"flag"|"metric", "text": str}]`. Categories determine dot color in UI. |

**Example INSERT:**
```sql
INSERT INTO weekly_metrics_rollups (week_start, narrative, metrics, highlights)
VALUES (
  date_trunc('week', CURRENT_DATE)::date,
  'Strong week: 4 new prospects identified...',
  '{"pipeline_value": 340000, "new_prospects": 4, "discovery_calls": 2, "proposals_sent": 1, "posts_published": 3, "avg_engagement_rate": 8.2, "emails_sent": 12, "meetings_held": 5}'::jsonb,
  '[{"category": "win", "text": "Acme Corp moved to proposal stage"}, {"category": "flag", "text": "Content engagement dipped"}]'::jsonb
)
ON CONFLICT (week_start) DO UPDATE SET
  narrative = EXCLUDED.narrative,
  metrics = EXCLUDED.metrics,
  highlights = EXCLUDED.highlights;
```

### 4.3 LinkedIn Commenting Pre-Brief

**Table:** `commenting_opportunities`
**Schedule:** Weekdays
**Write method:** `INSERT INTO commenting_opportunities (...) VALUES (...)`

**Required columns:**

| Column | Type | Required | Notes |
|---|---|---|---|
| `briefing_date` | DATE | Yes | Today's date, `YYYY-MM-DD` |
| `rank` | INTEGER | Yes | 1-5. CHECK constraint enforced. |
| `profile_name` | TEXT | Yes | LinkedIn profile display name |
| `profile_url` | TEXT | Yes | Full LinkedIn profile URL |
| `post_summary` | TEXT | Yes | 1-2 sentence summary of the post to comment on |
| `relevance_reason` | TEXT | Yes | Why this post matters to BaxterLabs |
| `suggested_angle` | TEXT | Yes | Specific commenting angle/approach |

**Constraints:**
- `UNIQUE(briefing_date, rank)` — use `ON CONFLICT (briefing_date, rank) DO UPDATE` for retries
- `CHECK (rank BETWEEN 1 AND 5)` — exactly 5 opportunities per day
- `status` defaults to `'pending'` — do NOT set status on insert; the dashboard manages status transitions

**Example INSERT (5 rows):**
```sql
INSERT INTO commenting_opportunities (briefing_date, rank, profile_name, profile_url, post_summary, relevance_reason, suggested_angle)
VALUES
  (CURRENT_DATE, 1, 'Sarah Chen', 'https://linkedin.com/in/sarachen', 'Posted about AI-driven due diligence...', 'Directly relevant to BaxterLabs...', 'Share your experience with...'),
  (CURRENT_DATE, 2, 'Marcus Johnson', 'https://linkedin.com/in/marcusjohnson', '...', '...', '...'),
  (CURRENT_DATE, 3, 'Lisa Park', 'https://linkedin.com/in/lisapark', '...', '...', '...'),
  (CURRENT_DATE, 4, 'David Kim', 'https://linkedin.com/in/davidkim', '...', '...', '...'),
  (CURRENT_DATE, 5, 'Rachel Torres', 'https://linkedin.com/in/racheltorres', '...', '...', '...')
ON CONFLICT (briefing_date, rank) DO UPDATE SET
  profile_name = EXCLUDED.profile_name,
  profile_url = EXCLUDED.profile_url,
  post_summary = EXCLUDED.post_summary,
  relevance_reason = EXCLUDED.relevance_reason,
  suggested_angle = EXCLUDED.suggested_angle;
```

### 4.4 Video Script Prep

**Table:** `content_posts` (existing table, new type value)
**Schedule:** Tuesdays
**Write method:** `INSERT INTO content_posts (...) VALUES (...)`

**Required columns:**

| Column | Type | Required | Notes |
|---|---|---|---|
| `type` | TEXT | Yes | Must be `'video_script'` |
| `title` | TEXT | Yes | Video topic/title |
| `body` | TEXT | Yes | Full script with sections (HOOK, SETUP, TENSION, PAYOFF, CTA) |
| `status` | TEXT | Yes | Set to `'draft'` on initial write |
| `scheduled_date` | TIMESTAMPTZ | No | Target Tuesday date for the video |

**Example INSERT:**
```sql
INSERT INTO content_posts (type, title, body, status, scheduled_date)
VALUES (
  'video_script',
  'Why 90-Day Diagnostics Outperform 6-Month Audits',
  'HOOK (0-3s): "Every PE firm I work with asks..."
SETUP (3-15s): The traditional model...
TENSION (15-30s): Here is what the data shows...
PAYOFF (30-45s): The difference is not scope...
CTA (45-55s): If your diligence process...',
  'draft',
  '2026-04-08T00:00:00Z'
);
```

---

## 5. Cowork-Side Work Pending

The following Cowork plugin skills need updating to write to the new tables. Each skill currently generates output in session history only — it needs to add a Supabase MCP `execute_sql` call at the end of its execution.

### 5.1 Pipeline Priority Briefing skill

**What to change:** After generating the briefing analysis, add an `execute_sql` call to INSERT into `pipeline_briefings` using the contract in Section 4.1.
**Input data the skill already has:** Pipeline status, follow-ups due, priority actions (these are already computed by the skill — just need to be structured into the JSONB format and written).
**Key consideration:** Use `ON CONFLICT (briefing_date) DO UPDATE` so retries don't fail on the UNIQUE constraint.

### 5.2 Friday Metrics Rollup skill

**What to change:** After generating the weekly summary, add an `execute_sql` call to INSERT into `weekly_metrics_rollups` using the contract in Section 4.2.
**Input data the skill already has:** Narrative summary, KPI metrics, highlights.
**Key consideration:** `week_start` must be the Monday of the reporting week. Use `date_trunc('week', CURRENT_DATE)::date` in SQL or compute it in the skill.

### 5.3 LinkedIn Commenting Pre-Brief skill

**What to change:** After identifying the 5 commenting opportunities, add an `execute_sql` call to INSERT 5 rows into `commenting_opportunities` using the contract in Section 4.3.
**Input data the skill already has:** Profile names, URLs, post summaries, relevance reasons, suggested angles.
**Key consideration:** Always write exactly 5 rows ranked 1-5. The UNIQUE(briefing_date, rank) constraint prevents duplicates. Do NOT set the `status` column — it defaults to `'pending'` and is managed by the dashboard.

### 5.4 Video Script Prep skill

**What to change:** After generating the video script, add an `execute_sql` call to INSERT into `content_posts` with `type='video_script'` using the contract in Section 4.4.
**Input data the skill already has:** Title, script body, target date.
**Key consideration:** This reuses the existing `content_posts` table. Set `status='draft'` so it appears in the Content Calendar as a draft awaiting review.

---

## 6. Known Gaps and Deferred Work

1. **Analytics page is minimal.** Currently only shows weekly rollups. The sidebar section is designed to host future analytics surfaces (e.g., pipeline trend charts, content performance dashboards) — the section label "Analytics" and route `/dashboard/analytics` are intentionally broad.

2. **No real-time updates.** All dashboard surfaces use `apiGet` on mount/navigation. There is no WebSocket or polling — if Cowork writes a briefing while the dashboard is open, the user must refresh to see it. This matches the existing pattern for all other dashboard surfaces.

3. **Content Calendar create form includes "Video Script" option.** Users can manually create video_script posts through the calendar form. This is intentional — it allows manual script creation when the Cowork task hasn't run or when the user wants to add scripts outside the Tuesday schedule.

4. **Commenting page "Open in LinkedIn" links.** The external link icon opens the profile URL in a new tab. It does NOT deep-link to the specific post — only to the profile. Deep-linking to specific LinkedIn posts would require the skill to capture the post URL (not just the profile URL). This could be a future enhancement to the skill and the `post_url` column could be added to the table.

5. **Backend venv.** A new `.venv-arm64` was created alongside the existing `.venv` (which has an x86_64/arm64 architecture mismatch). The old `.venv` should be removed and `.venv-arm64` renamed to `.venv` to avoid confusion. This was not done during the handoff to avoid destructive operations without explicit approval.

---

## 7. File Inventory

### New files (6)

| File | Lines | Purpose |
|---|---|---|
| `supabase/migrations/062_pipeline_briefings.sql` | 17 | pipeline_briefings table |
| `supabase/migrations/063_weekly_metrics_rollups.sql` | 15 | weekly_metrics_rollups table |
| `supabase/migrations/064_commenting_opportunities.sql` | 27 | commenting_opportunities table |
| `supabase/migrations/065_content_posts_video_script_type.sql` | 7 | content_posts CHECK constraint |
| `backend/routers/briefings.py` | 75 | Pipeline briefings read-only API |
| `backend/routers/analytics.py` | 73 | Weekly rollups read-only API |
| `backend/routers/commenting.py` | 113 | Commenting opportunities API (read + PATCH) |
| `src/pages/dashboard/Analytics.tsx` | 139 | Rollup history page |
| `src/pages/dashboard/content/Commenting.tsx` | 199 | Commenting opportunities page |

### Modified files (5)

| File | Changes | Purpose |
|---|---|---|
| `backend/routers/content.py` | +1 line | Added `video_script` to VALID_POST_TYPES |
| `backend/main.py` | +3 lines | Import + register briefings, analytics, commenting routers |
| `src/pages/dashboard/Overview.tsx` | +215 lines | Morning Briefing card + Weekly Rollup section |
| `src/components/DashboardLayout.tsx` | +26 lines | Analytics sidebar section, Commenting entry + badge |
| `src/pages/dashboard/content/ContentCalendar.tsx` | +13/-5 lines | video_script type + purple color + label formatter |
| `src/App.tsx` | +4 lines | Import + routes for Analytics, Commenting |
