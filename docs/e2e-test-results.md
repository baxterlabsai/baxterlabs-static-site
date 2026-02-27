# BaxterLabs E2E Test Results

**Date:** 2026-02-27
**Test Data:** Scion Staffing, Inc.
**Environment:** Production (Render + Supabase)
**Result:** 74/74 PASSED

---

## Test Summary

| Stage | Description | Tests | Result |
|-------|------------|-------|--------|
| 1 | Backend Health & Auth | 4 | PASS |
| 2 | Pipeline — Create Scion Staffing | 6 | PASS |
| 3 | Pipeline — Stage Progression | 7 | PASS |
| 4 | Pipeline → Engagement Conversion | 8 | PASS |
| 5 | Engagement Status Progression | 8 | PASS |
| 6 | Invoicing Tests | 11 | PASS |
| 7 | Phase Progression (0-7) | 12 | PASS |
| 8 | Archive & Follow-Up Sequences | 9 | PASS |
| 9 | Follow-Up Actions | 6 | PASS |
| 10 | Referral Attribution | 3 | PASS |
| **Total** | | **74** | **ALL PASS** |

---

## Stage Details

### Stage 1: Backend Health & Auth
- Health endpoint returns 200 with `status=ok` and `supabase=True`
- Auth token obtained via Supabase admin magic link (831 chars)
- Authenticated GET `/api/engagements` returns 200

### Stage 2: Pipeline — Create Scion Staffing
- Pipeline company created: Scion Staffing, Inc. (Healthcare Staffing, Dallas TX)
- 4 contacts created: Isaac Schild (CEO), Joshua Steele, Len Friedrichs, Candice Pacetta
- Opportunity created: "Scion Staffing Culture Assessment" ($12,500)

### Stage 3: Pipeline — Stage Progression
- Progressed through all stages: identified → contacted → discovery_scheduled → discovery_complete → proposal_sent → negotiation → won
- Discovery call activity logged with meeting notes

### Stage 4: Pipeline → Engagement Conversion
- Conversion preview returns company data, 4 contacts, and discovery notes
- Opportunity converted to engagement + client record
- 3 interview contacts created with proper contact_number mapping
- Opportunity back-linked with `converted_engagement_id` and `converted_client_id`

### Stage 5: Engagement Status Progression
- Full status flow: nda_pending → nda_signed → discovery_done → agreement_pending → agreement_signed → documents_pending → documents_received

### Stage 6: Invoicing Tests
- Deposit invoice generated: BL-2026-001, $6,250.00 (50% of $12,500 fee), status=sent
- Revenue summary correctly reports totals
- Mark-paid works correctly
- Void invoice works correctly (status=void per DB constraint)
- PDF download URL generated via signed Supabase Storage URL
- Invoice list returns all invoices with correct counts

### Stage 7: Phase Progression
- Begin phases transitions from documents_received → phase_0
- All 8 phases advanced successfully (0→1→2→3→4→5→6→7→phases_complete)
- Review gates at phases 1, 3, 6 with `review_confirmed=True`
- Final invoice auto-generated when status reaches `phases_complete`
- Phase capped at 7 (DB constraint: 0-7)

### Stage 8: Archive & Follow-Up Sequences
- Engagement archived: 14 files moved from `engagements` → `archive` bucket
- Completion manifest generated at `{engagement_id}/completion_manifest.json`
- Status updated to `closed`
- 3 follow-up sequences created automatically:
  - 30-day: scheduled 2026-03-29
  - 60-day: scheduled 2026-04-28
  - 90-day: scheduled 2026-05-28

### Stage 9: Follow-Up Actions
- Follow-up list returns all 3 sequences with rendered templates
- Templates include actual contact name (Isaac Schild)
- Snooze action: 30-day follow-up snoozed 7 days (→ 2026-03-06)
- Skip action: 60-day follow-up skipped
- Send action: 90-day follow-up marked as sent

### Stage 10: Referral Attribution
- Referral opportunity created with `referred_by_engagement_id`
- Pipeline stats include referral metrics (total_opportunities, total_value, won, conversion_rate)

---

## Frontend Verification (Stage 11)

All required frontend components verified present and wired:

| Component | Location | Status |
|-----------|----------|--------|
| Pipeline Kanban Board | `src/pages/dashboard/pipeline/Board.tsx` | EXISTS (1,244 lines) |
| Conversion Review | `src/pages/dashboard/pipeline/ConversionReview.tsx` | EXISTS |
| Invoice Section | `src/pages/dashboard/EngagementDetail.tsx:1462-1615` | EXISTS |
| Payment Success | `src/pages/PaymentSuccess.tsx` | EXISTS |
| Payment Cancelled | `src/pages/PaymentCancelled.tsx` | EXISTS |
| Follow-Up Queue | `src/pages/dashboard/Overview.tsx:336-466` | EXISTS |
| Follow-Up Detail | `src/pages/dashboard/EngagementDetail.tsx:1617-1667` | EXISTS |
| Referral Source | `src/pages/dashboard/EngagementDetail.tsx:1255` | EXISTS |
| Referrals Generated | `src/pages/dashboard/EngagementDetail.tsx:1427-1460` | EXISTS |
| Sidebar + Badges | `src/components/DashboardLayout.tsx` | EXISTS |

All 18 routes in `App.tsx` verified wired correctly.

---

## Bugs Found & Fixed

### Bug 1: Invoice Column Name Mismatch (CRITICAL)
- **File:** `backend/routers/invoices.py`
- **Issue:** Code used `payment_link` and `stripe_checkout_session_id` but DB columns are `stripe_payment_link` and `stripe_session_id`
- **Error:** `PGRST204: Could not find the 'payment_link' column of 'invoices'`
- **Fix:** Updated column names to match DB schema
- **Commit:** `3072947`

### Bug 2: Phase Constraint Overflow (CRITICAL)
- **File:** `backend/routers/engagements.py`
- **Issue:** Phase advance set `phase = current_phase + 1 = 8` on completion, violating DB `CHECK (phase >= 0 AND phase <= 7)`
- **Error:** `new row for relation "engagements" violates check constraint "engagements_phase_check"`
- **Impact:** Phase 7 advance failed → final invoice never generated → archive blocked → follow-ups never created (cascade failure across stages 7-9)
- **Fix:** `new_phase = min(current_phase + 1, 7)`
- **Commit:** `3072947`

### Bug 3: Invoice Void Status Mismatch (HIGH)
- **File:** `backend/routers/invoices.py`, `src/pages/dashboard/EngagementDetail.tsx`
- **Issue:** Code used status `"voided"` but DB CHECK constraint only allows `"void"`
- **Error:** `CHECK constraint "invoices_status_check" violated`
- **Fix:** Changed all `"voided"` references to `"void"` in backend and frontend
- **Commit:** `14b774d`

### Bug 4: Archive Column Name Mismatch (HIGH)
- **File:** `backend/routers/archive.py`
- **Issue:** Manifest query selected `phase_executions.created_at` but column is `executed_at`
- **Error:** `42703: column phase_executions.created_at does not exist`
- **Impact:** Archive failed → follow-up sequences never created
- **Fix:** Changed to `executed_at` in select and manifest builder
- **Commit:** `14b774d`

### Bug 5: Resend Invoice Column Reference (LOW)
- **File:** `backend/routers/invoices.py`
- **Issue:** Resend endpoint read `invoice.get("payment_link")` but DB column is `stripe_payment_link`
- **Fix:** Changed to `invoice.get("stripe_payment_link")`
- **Commit:** `3072947`

---

## Resource IDs (Final Run)

```json
{
  "company_id": "e7f7c30c-29b1-4880-8d08-bd22546b7fdc",
  "isaac_id": "c0a4d1e1-9217-43c2-aa88-2553cb5f2c50",
  "joshua_id": "535c1a0d-a491-463a-992d-93459f092844",
  "len_id": "6763183b-74d4-41f9-9ecc-c3916fa47d33",
  "candice_id": "5b2acde2-04a6-4310-b818-1e459cd253fd",
  "opp_id": "22c5e1f8-c727-4073-939d-18aa8f9fcf17",
  "engagement_id": "a2065353-c518-45ba-87fa-26cbd9c1c469",
  "client_id": "631ebcb6-c9c0-4d27-8463-a37565429dcc",
  "deposit_invoice_id": "de7a6644-3404-4896-af40-1ea070650542",
  "referral_opp_id": "80decc73-8a92-45bd-a27f-e9e0cc714760"
}
```

---

## Test Script

The automated E2E test script is at `e2e_test.py` in the project root. Run with:

```bash
source backend/.venv/bin/activate && python3 e2e_test.py
```

Requires `SUPABASE_URL_BAXTERLABS_STATIC_SITE` and `SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE` in `~/Projects/master.env`.
