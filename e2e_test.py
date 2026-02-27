"""
BaxterLabs E2E Test Script
Runs through the complete engagement lifecycle using Scion Staffing test data.
"""
from __future__ import annotations

import os
import sys
import json
import time
import requests
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Projects/master.env"))

# ── Config ──────────────────────────────────────────────────────────────
API_URL = "https://baxterlabs-api.onrender.com"
SB_URL = os.getenv("SUPABASE_URL_BAXTERLABS_STATIC_SITE")
SB_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE")

if not SB_URL or not SB_SERVICE_KEY:
    print("ERROR: Missing Supabase env vars in master.env")
    sys.exit(1)

# ── Results tracking ────────────────────────────────────────────────────
results = []
bugs = []
ids = {}  # Store created resource IDs


def log_test(stage: str, name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    results.append({"stage": stage, "name": name, "passed": passed, "detail": detail})
    icon = "✓" if passed else "✗"
    print(f"  [{icon}] {name}" + (f" — {detail}" if detail else ""))


def log_bug(stage: str, description: str, severity: str, status: str = "Open", detail: str = ""):
    bugs.append({
        "stage": stage, "description": description,
        "severity": severity, "status": status, "detail": detail,
    })


# ── Auth ────────────────────────────────────────────────────────────────
def get_auth_token() -> str:
    """Get a Supabase auth token for the test user via admin magic link."""
    # Step 1: Generate magic link (returns hashed_token at top level)
    resp = requests.post(
        f"{SB_URL}/auth/v1/admin/generate_link",
        headers={
            "apikey": SB_SERVICE_KEY,
            "Authorization": f"Bearer {SB_SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        json={"email": "george@baxterlabs.ai", "type": "magiclink"},
    )
    if resp.status_code != 200:
        print(f"Magic link generation failed: {resp.status_code} {resp.text}")
        sys.exit(1)

    data = resp.json()
    hashed_token = data.get("hashed_token", "")
    if not hashed_token:
        print(f"No hashed_token in response. Keys: {list(data.keys())}")
        sys.exit(1)

    # Step 2: Verify hashed_token to get access_token
    verify_resp = requests.post(
        f"{SB_URL}/auth/v1/verify",
        headers={"apikey": SB_SERVICE_KEY, "Content-Type": "application/json"},
        json={"token_hash": hashed_token, "type": "magiclink"},
    )
    if verify_resp.status_code != 200:
        print(f"Token verification failed: {verify_resp.status_code} {verify_resp.text}")
        sys.exit(1)

    access_token = verify_resp.json().get("access_token", "")
    if not access_token:
        print("No access_token in verify response")
        sys.exit(1)

    return access_token


# ── API helpers ─────────────────────────────────────────────────────────
TOKEN = None
HEADERS = {}


def api_get(path: str):
    resp = requests.get(f"{API_URL}{path}", headers=HEADERS, timeout=30)
    return resp


def api_post(path: str, body: dict = None):
    resp = requests.post(
        f"{API_URL}{path}",
        headers={**HEADERS, "Content-Type": "application/json"},
        json=body,
        timeout=30,
    )
    return resp


def api_put(path: str, body: dict = None):
    resp = requests.put(
        f"{API_URL}{path}",
        headers={**HEADERS, "Content-Type": "application/json"},
        json=body,
        timeout=30,
    )
    return resp


def api_patch(path: str, body: dict = None):
    resp = requests.patch(
        f"{API_URL}{path}",
        headers={**HEADERS, "Content-Type": "application/json"},
        json=body,
        timeout=30,
    )
    return resp


def api_delete(path: str):
    resp = requests.delete(f"{API_URL}{path}", headers=HEADERS, timeout=30)
    return resp


# ═══════════════════════════════════════════════════════════════════════
# STAGE 1: Backend Health & Auth
# ═══════════════════════════════════════════════════════════════════════
def stage_1():
    print("\n═══ STAGE 1: Backend Health & Auth ═══")

    # 1a. Health check
    try:
        resp = requests.get(f"{API_URL}/api/health", timeout=30)
        data = resp.json()
        log_test("1", "Health endpoint returns 200", resp.status_code == 200, f"status={data.get('status')}")
        log_test("1", "Supabase connection OK", data.get("supabase") is True, f"supabase={data.get('supabase')}")
    except Exception as e:
        log_test("1", "Health endpoint reachable", False, str(e))
        return False

    # 1b. Get auth token
    global TOKEN, HEADERS
    try:
        TOKEN = get_auth_token()
        HEADERS = {"Authorization": f"Bearer {TOKEN}"}
        log_test("1", "Auth token obtained", bool(TOKEN), f"token_len={len(TOKEN) if TOKEN else 0}")
    except Exception as e:
        log_test("1", "Auth token obtained", False, str(e))
        return False

    # 1c. Test authenticated endpoint
    resp = api_get("/api/engagements")
    log_test("1", "Authenticated request works", resp.status_code == 200, f"status={resp.status_code}")

    return True


# ═══════════════════════════════════════════════════════════════════════
# STAGE 2: Pipeline — Create Scion Staffing
# ═══════════════════════════════════════════════════════════════════════
def stage_2():
    print("\n═══ STAGE 2: Pipeline — Create Scion Staffing ═══")

    # 2a. Create company
    resp = api_post("/api/pipeline/companies", {
        "name": "Scion Staffing, Inc.",
        "website": "https://scionstaffing.com",
        "industry": "Staffing & Recruiting",
        "revenue_range": "$50M-$100M",
        "employee_count": "79",
        "location": "San Francisco, CA",
        "source": "Warm Network",
        "notes": "Multi-state expansion, 3 service lines. Pass-through revenue masking true margins.",
    })
    ok = resp.status_code == 200 and resp.json().get("id")
    if ok:
        ids["company_id"] = resp.json()["id"]
    log_test("2", "Create pipeline company", ok, f"status={resp.status_code}" + (f" id={ids.get('company_id')}" if ok else f" body={resp.text[:200]}"))
    if not ok:
        log_bug("2", f"Company creation failed: {resp.status_code} {resp.text[:300]}", "Critical")
        return False

    # 2b. Create primary contact (Isaac)
    resp = api_post("/api/pipeline/contacts", {
        "company_id": ids["company_id"],
        "name": "Isaac Schild",
        "title": "CEO",
        "email": "test-isaac@scionstaffing.com",
        "phone": "(415) 392-7500",
        "linkedin_url": "https://linkedin.com/in/isaacschild",
        "is_decision_maker": True,
    })
    ok = resp.status_code == 200 and resp.json().get("id")
    if ok:
        ids["isaac_id"] = resp.json()["id"]
    log_test("2", "Create contact: Isaac Schild (CEO)", ok, f"status={resp.status_code}")

    # 2c. Create interview contacts
    contacts_data = [
        {"name": "Joshua Steele", "title": "Managing Director, Finance & Accounting",
         "email": "test-joshua@scionstaffing.com", "phone": "(415) 392-7501",
         "linkedin_url": "https://linkedin.com/in/joshuasteele"},
        {"name": "Len Friedrichs", "title": "Executive Managing Director",
         "email": "test-len@scionstaffing.com", "phone": "(415) 392-7502",
         "linkedin_url": "https://linkedin.com/in/lenfriedrichs"},
        {"name": "Candice Pacetta", "title": "Sr. Director, Human Resources",
         "email": "test-candice@scionstaffing.com", "phone": "(415) 392-7503",
         "linkedin_url": "https://linkedin.com/in/candicepacketta"},
    ]

    contact_ids = []
    for c in contacts_data:
        resp = api_post("/api/pipeline/contacts", {
            "company_id": ids["company_id"],
            **c,
        })
        ok = resp.status_code == 200 and resp.json().get("id")
        if ok:
            contact_ids.append(resp.json()["id"])
        log_test("2", f"Create contact: {c['name']}", ok, f"status={resp.status_code}")

    ids["joshua_id"] = contact_ids[0] if len(contact_ids) > 0 else None
    ids["len_id"] = contact_ids[1] if len(contact_ids) > 1 else None
    ids["candice_id"] = contact_ids[2] if len(contact_ids) > 2 else None

    # 2d. Create opportunity
    resp = api_post("/api/pipeline/opportunities", {
        "company_id": ids["company_id"],
        "primary_contact_id": ids.get("isaac_id"),
        "title": "Scion Staffing Operational Diagnostic",
        "stage": "identified",
        "estimated_value": 12500,
        "notes": "CEO interested in operational diagnostic. Concerned about margin visibility across 3 service lines.",
    })
    ok = resp.status_code == 200 and resp.json().get("id")
    if ok:
        ids["opp_id"] = resp.json()["id"]
    log_test("2", "Create opportunity", ok, f"status={resp.status_code}" + (f" id={ids.get('opp_id')}" if ok else f" body={resp.text[:200]}"))

    return True


# ═══════════════════════════════════════════════════════════════════════
# STAGE 3: Pipeline — Stage Progression
# ═══════════════════════════════════════════════════════════════════════
def stage_3():
    print("\n═══ STAGE 3: Pipeline — Stage Progression ═══")

    opp_id = ids.get("opp_id")
    if not opp_id:
        log_test("3", "Opportunity exists", False, "No opp_id from stage 2")
        return False

    # Progress through stages
    stages = ["contacted", "discovery_scheduled", "discovery_complete", "proposal_sent", "negotiation"]
    for stage in stages:
        resp = api_put(f"/api/pipeline/opportunities/{opp_id}", {"stage": stage})
        ok = resp.status_code == 200
        log_test("3", f"Stage → {stage}", ok, f"status={resp.status_code}" + (f" body={resp.text[:200]}" if not ok else ""))

    # Add discovery call activity
    resp = api_post("/api/pipeline/activities", {
        "opportunity_id": opp_id,
        "company_id": ids.get("company_id"),
        "contact_id": ids.get("isaac_id"),
        "type": "video_call",
        "subject": "Discovery Call with Isaac Schild",
        "body": "Discussed operational challenges. Isaac concerned about: 1) Pass-through revenue obscuring true margins across staffing/recruiting/exec search lines. 2) Overhead allocation inconsistencies between SF, LA, and Portland offices. 3) No clear visibility into per-placement profitability.",
        "outcome": "Strong fit for 14-day diagnostic. Isaac wants to discuss with board. Follow up next Tuesday.",
    })
    ok = resp.status_code == 200
    if ok:
        ids["activity_id"] = resp.json().get("id")
    log_test("3", "Create discovery call activity", ok, f"status={resp.status_code}" + (f" body={resp.text[:200]}" if not ok else ""))

    # Progress to won
    resp = api_put(f"/api/pipeline/opportunities/{opp_id}", {"stage": "won"})
    ok = resp.status_code == 200
    log_test("3", "Stage → won", ok, f"status={resp.status_code}")

    return True


# ═══════════════════════════════════════════════════════════════════════
# STAGE 4: Pipeline → Engagement Conversion
# ═══════════════════════════════════════════════════════════════════════
def stage_4():
    print("\n═══ STAGE 4: Pipeline → Engagement Conversion ═══")

    opp_id = ids.get("opp_id")
    if not opp_id:
        log_test("4", "Opportunity exists for conversion", False, "No opp_id")
        return False

    # 4a. Conversion preview
    resp = api_get(f"/api/pipeline/opportunities/{opp_id}/conversion-preview")
    ok = resp.status_code == 200
    if ok:
        preview = resp.json()
        log_test("4", "Conversion preview returns data", True, f"company={preview.get('company', {}).get('name')}")
        log_test("4", "Preview includes contacts", len(preview.get("all_contacts", [])) >= 4, f"contacts={len(preview.get('all_contacts', []))}")
        log_test("4", "Preview includes discovery notes", preview.get("discovery_notes") is not None, f"has_notes={preview.get('discovery_notes') is not None}")
    else:
        log_test("4", "Conversion preview", False, f"status={resp.status_code} body={resp.text[:200]}")
        log_bug("4", f"Conversion preview failed: {resp.status_code}", "High")

    # 4b. Convert opportunity
    conversion_body = {
        "fee": 12500,
        "partner_lead": "George DeVries",
        "send_nda": False,
        "interview_contacts": [
            {"pipeline_contact_id": ids["joshua_id"], "contact_number": 1},
            {"pipeline_contact_id": ids["len_id"], "contact_number": 2},
            {"pipeline_contact_id": ids["candice_id"], "contact_number": 3},
        ],
    }
    resp = api_post(f"/api/pipeline/opportunities/{opp_id}/convert", conversion_body)
    ok = resp.status_code == 200
    if ok:
        data = resp.json()
        ids["engagement_id"] = data.get("engagement_id")
        ids["client_id"] = data.get("client_id")
        log_test("4", "Convert opportunity", True, f"eng={ids['engagement_id']}, client={ids['client_id']}")
        log_test("4", "Engagement status is nda_pending", data.get("status") == "nda_pending", f"status={data.get('status')}")
        log_test("4", "Interview contacts created", data.get("interview_contacts_created") == 3, f"count={data.get('interview_contacts_created')}")
    else:
        log_test("4", "Convert opportunity", False, f"status={resp.status_code} body={resp.text[:300]}")
        log_bug("4", f"Conversion failed: {resp.status_code} {resp.text[:300]}", "Critical")
        return False

    # 4c. Verify opportunity updated
    resp = api_get(f"/api/pipeline/opportunities/{opp_id}")
    if resp.status_code == 200:
        opp = resp.json()
        log_test("4", "Opportunity has converted_engagement_id", opp.get("converted_engagement_id") == ids["engagement_id"], "")
        log_test("4", "Opportunity has converted_client_id", opp.get("converted_client_id") == ids["client_id"], "")

    return True


# ═══════════════════════════════════════════════════════════════════════
# STAGE 5: Engagement Status Progression
# ═══════════════════════════════════════════════════════════════════════
def stage_5():
    print("\n═══ STAGE 5: Engagement Status Progression ═══")

    eng_id = ids.get("engagement_id")
    if not eng_id:
        log_test("5", "Engagement exists", False, "No engagement_id")
        return False

    # Check current status
    resp = api_get(f"/api/engagements/{eng_id}")
    if resp.status_code == 200:
        status = resp.json().get("status")
        log_test("5", "Engagement at nda_pending", status == "nda_pending", f"status={status}")
    else:
        log_test("5", "Fetch engagement", False, f"status={resp.status_code}")
        return False

    # Advance status via Supabase REST (simulating DocuSign webhooks)
    statuses = [
        "nda_signed", "discovery_done", "agreement_pending",
        "agreement_signed", "documents_pending", "documents_received",
    ]
    sb_headers = {
        "apikey": SB_SERVICE_KEY,
        "Authorization": f"Bearer {SB_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    for new_status in statuses:
        resp = requests.patch(
            f"{SB_URL}/rest/v1/engagements?id=eq.{eng_id}",
            headers=sb_headers,
            json={"status": new_status},
        )
        ok = resp.status_code in (200, 204)
        log_test("5", f"Status → {new_status}", ok, f"status={resp.status_code}")
        if not ok:
            log_bug("5", f"DB update to {new_status} failed: {resp.status_code} {resp.text[:200]}", "Critical")
            return False

    # Verify final status
    resp = api_get(f"/api/engagements/{eng_id}")
    if resp.status_code == 200:
        final_status = resp.json().get("status")
        log_test("5", "Engagement at documents_received", final_status == "documents_received", f"status={final_status}")

    return True


# ═══════════════════════════════════════════════════════════════════════
# STAGE 6: Invoicing Tests
# ═══════════════════════════════════════════════════════════════════════
def stage_6():
    print("\n═══ STAGE 6: Invoicing Tests ═══")

    eng_id = ids.get("engagement_id")
    if not eng_id:
        log_test("6", "Engagement exists", False, "No engagement_id")
        return False

    # 6a. List invoices for engagement
    resp = api_get(f"/api/engagements/{eng_id}/invoices")
    ok = resp.status_code == 200
    invoice_count = len(resp.json().get("invoices", [])) if ok else 0
    log_test("6", "List engagement invoices", ok, f"count={invoice_count}")

    # 6b. Generate deposit invoice
    resp = api_post(f"/api/engagements/{eng_id}/generate-invoice", {
        "invoice_type": "deposit",
        "send_email": False,
    })
    ok = resp.status_code == 200
    if ok:
        invoice_data = resp.json().get("invoice", {})
        ids["deposit_invoice_id"] = invoice_data.get("id")
        log_test("6", "Generate deposit invoice", True, f"id={ids['deposit_invoice_id']}")
        log_test("6", "Invoice number format BL-YYYY-NNN",
                 invoice_data.get("invoice_number", "").startswith("BL-"),
                 f"number={invoice_data.get('invoice_number')}")
        log_test("6", "Invoice amount is 50% of fee ($6250)",
                 float(invoice_data.get("amount", 0)) == 6250.0,
                 f"amount={invoice_data.get('amount')}")
        log_test("6", "Invoice status is sent",
                 invoice_data.get("status") == "sent",
                 f"status={invoice_data.get('status')}")
    else:
        log_test("6", "Generate deposit invoice", False, f"status={resp.status_code} body={resp.text[:300]}")
        log_bug("6", f"Invoice generation failed: {resp.status_code} {resp.text[:300]}", "Critical")

    # 6c. Revenue summary
    resp = api_get("/api/invoices/revenue-summary")
    ok = resp.status_code == 200
    if ok:
        summary = resp.json()
        log_test("6", "Revenue summary endpoint", True, f"invoiced={summary.get('total_invoiced')}")
    else:
        log_test("6", "Revenue summary endpoint", False, f"status={resp.status_code}")

    # 6d. Mark invoice paid
    if ids.get("deposit_invoice_id"):
        resp = api_post(f"/api/invoices/{ids['deposit_invoice_id']}/mark-paid")
        ok = resp.status_code == 200
        log_test("6", "Mark invoice paid", ok, f"status={resp.status_code}" + (f" body={resp.text[:200]}" if not ok else ""))

    # 6e. Generate a second invoice to test void
    resp = api_post(f"/api/engagements/{eng_id}/generate-invoice", {
        "invoice_type": "final",
        "send_email": False,
    })
    ok = resp.status_code == 200
    if ok:
        ids["test_void_invoice_id"] = resp.json().get("invoice", {}).get("id")
        log_test("6", "Generate test invoice for void", True, "")

        # Void it
        resp2 = api_post(f"/api/invoices/{ids['test_void_invoice_id']}/void")
        ok2 = resp2.status_code == 200
        log_test("6", "Void invoice", ok2, f"status={resp2.status_code}" + (f" body={resp2.text[:200]}" if not ok2 else ""))
    else:
        log_test("6", "Generate test invoice for void", False, f"status={resp.status_code} body={resp.text[:200]}")

    # 6f. PDF download
    if ids.get("deposit_invoice_id"):
        resp = api_get(f"/api/invoices/{ids['deposit_invoice_id']}/download")
        ok = resp.status_code == 200
        if ok:
            url = resp.json().get("url", "")
            log_test("6", "Invoice PDF download URL", bool(url), f"has_url={bool(url)}")
        else:
            log_test("6", "Invoice PDF download URL", False, f"status={resp.status_code} body={resp.text[:200]}")

    # 6g. List all invoices
    resp = api_get("/api/invoices")
    ok = resp.status_code == 200
    log_test("6", "List all invoices", ok, f"count={resp.json().get('count', 0) if ok else 'N/A'}")

    return True


# ═══════════════════════════════════════════════════════════════════════
# STAGE 7: Phase Progression
# ═══════════════════════════════════════════════════════════════════════
def stage_7():
    print("\n═══ STAGE 7: Phase Progression ═══")

    eng_id = ids.get("engagement_id")
    if not eng_id:
        log_test("7", "Engagement exists", False, "No engagement_id")
        return False

    # First need to get engagement to phase_0
    # The engagement should be set to documents_received, then begin-phases
    resp = api_get(f"/api/engagements/{eng_id}")
    if resp.status_code == 200:
        current = resp.json().get("status")
        log_test("7", f"Current engagement status", True, f"status={current}")
    else:
        log_test("7", "Fetch engagement", False, f"status={resp.status_code}")
        return False

    # Begin phases (engagement must be at documents_received)
    resp = api_post(f"/api/engagements/{eng_id}/begin-phases")
    if resp.status_code == 200:
        log_test("7", "Begin phases", True, "")
    else:
        detail = resp.text[:200] if resp.status_code != 200 else ""
        log_test("7", "Begin phases", False, f"status={resp.status_code} {detail}")
        log_bug("7", f"begin-phases failed: status must be documents_received, got {current}", "Medium", detail=detail)
        return False

    # Advance through all phases (0 → 7)
    for phase_num in range(8):
        review_confirmed = phase_num in {1, 3, 6}
        resp = api_post(f"/api/engagements/{eng_id}/advance-phase", {
            "notes": f"Phase {phase_num} completed — test run",
            "review_confirmed": review_confirmed,
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get("review_required"):
                # Retry with confirmation
                resp = api_post(f"/api/engagements/{eng_id}/advance-phase", {
                    "notes": f"Phase {phase_num} completed — test run",
                    "review_confirmed": True,
                })
                data = resp.json() if resp.status_code == 200 else {}
            log_test("7", f"Advance phase {phase_num}", resp.status_code == 200,
                     f"new_status={data.get('new_status')}")
        else:
            log_test("7", f"Advance phase {phase_num}", False,
                     f"status={resp.status_code} body={resp.text[:200]}")
            break

    # Check if final invoice was auto-generated
    resp = api_get(f"/api/engagements/{eng_id}/invoices")
    if resp.status_code == 200:
        invoices = resp.json().get("invoices", [])
        final_invoices = [i for i in invoices if i.get("type") == "final" and i.get("status") != "void"]
        log_test("7", "Final invoice auto-generated on phases_complete",
                 len(final_invoices) > 0,
                 f"final_invoices={len(final_invoices)}")

    return True


# ═══════════════════════════════════════════════════════════════════════
# STAGE 8: Archive & Follow-Up Sequences
# ═══════════════════════════════════════════════════════════════════════
def stage_8():
    print("\n═══ STAGE 8: Archive & Follow-Up Sequences ═══")

    eng_id = ids.get("engagement_id")
    if not eng_id:
        log_test("8", "Engagement exists", False, "No engagement_id")
        return False

    # Check engagement status before archive
    resp = api_get(f"/api/engagements/{eng_id}")
    if resp.status_code == 200:
        current = resp.json().get("status")
        log_test("8", f"Engagement status pre-archive", True, f"status={current}")
    else:
        return False

    # Archive engagement
    resp = api_post(f"/api/engagements/{eng_id}/archive")
    ok = resp.status_code == 200
    if ok:
        data = resp.json()
        log_test("8", "Archive engagement", True, f"files_moved={data.get('message')}")
    else:
        log_test("8", "Archive engagement", False, f"status={resp.status_code} body={resp.text[:300]}")
        log_bug("8", f"Archive failed: {resp.status_code} {resp.text[:300]}", "High")

    # Check engagement status is now 'closed'
    resp = api_get(f"/api/engagements/{eng_id}")
    if resp.status_code == 200:
        status = resp.json().get("status")
        log_test("8", "Engagement status is closed", status == "closed", f"status={status}")

    # Check follow-up sequences
    resp = api_get(f"/api/engagements/{eng_id}/follow-ups")
    if resp.status_code == 200:
        follow_ups = resp.json().get("follow_ups", [])
        log_test("8", "Follow-up sequences created (3)", len(follow_ups) == 3, f"count={len(follow_ups)}")

        touchpoints = [fu.get("touchpoint") for fu in follow_ups]
        log_test("8", "Has 30-day touchpoint", "30_day" in touchpoints, f"touchpoints={touchpoints}")
        log_test("8", "Has 60-day touchpoint", "60_day" in touchpoints, "")
        log_test("8", "Has 90-day touchpoint", "90_day" in touchpoints, "")

        # Store follow-up IDs
        for fu in follow_ups:
            tp = fu.get("touchpoint")
            ids[f"followup_{tp}"] = fu.get("id")
            log_test("8", f"Follow-up {tp} scheduled_date",
                     fu.get("scheduled_date") is not None,
                     f"date={fu.get('scheduled_date')}, status={fu.get('status')}")
    else:
        log_test("8", "Follow-up sequences created", False, f"status={resp.status_code}")

    return True


# ═══════════════════════════════════════════════════════════════════════
# STAGE 9: Follow-Up Actions
# ═══════════════════════════════════════════════════════════════════════
def stage_9():
    print("\n═══ STAGE 9: Follow-Up Actions ═══")

    # 9a. List all follow-ups
    resp = api_get("/api/follow-ups")
    ok = resp.status_code == 200
    log_test("9", "List all follow-ups", ok, f"count={resp.json().get('count', 0) if ok else 'N/A'}")

    # 9b. Get single follow-up with rendered template
    fu_30_id = ids.get("followup_30_day")
    if fu_30_id:
        resp = api_get(f"/api/follow-ups/{fu_30_id}")
        if resp.status_code == 200:
            data = resp.json()
            rendered = data.get("rendered_body", "")
            log_test("9", "30-day follow-up has rendered template", bool(rendered), f"len={len(rendered)}")
            log_test("9", "Template includes contact name",
                     "Isaac" in rendered or "Scion" in rendered,
                     f"has_name={'Isaac' in rendered or 'Scion' in rendered}")
        else:
            log_test("9", "Get 30-day follow-up", False, f"status={resp.status_code}")

    # 9c. Test snooze (30-day)
    if fu_30_id:
        resp = api_patch(f"/api/follow-ups/{fu_30_id}", {
            "action": "snooze",
            "snooze_days": 7,
        })
        ok = resp.status_code == 200
        log_test("9", "Snooze 30-day follow-up (7 days)", ok,
                 f"status={resp.status_code}" + (f" body={resp.text[:200]}" if not ok else f" msg={resp.json().get('message', '')}"))

    # 9d. Test skip (60-day)
    fu_60_id = ids.get("followup_60_day")
    if fu_60_id:
        resp = api_patch(f"/api/follow-ups/{fu_60_id}", {
            "action": "skip",
            "notes": "Skipping for E2E test purposes",
        })
        ok = resp.status_code == 200
        log_test("9", "Skip 60-day follow-up", ok,
                 f"status={resp.status_code}" + (f" body={resp.text[:200]}" if not ok else ""))

    # 9e. Test send (90-day)
    fu_90_id = ids.get("followup_90_day")
    if fu_90_id:
        resp = api_patch(f"/api/follow-ups/{fu_90_id}", {
            "action": "send",
        })
        ok = resp.status_code == 200
        log_test("9", "Send 90-day follow-up", ok,
                 f"status={resp.status_code}" + (f" body={resp.text[:200]}" if not ok else ""))

    return True


# ═══════════════════════════════════════════════════════════════════════
# STAGE 10: Referral Attribution
# ═══════════════════════════════════════════════════════════════════════
def stage_10():
    print("\n═══ STAGE 10: Referral Attribution ═══")

    eng_id = ids.get("engagement_id")

    # Create a new company for referral test
    resp = api_post("/api/pipeline/companies", {
        "name": "Referral Test Corp",
        "industry": "Professional Services",
        "source": "Referral",
    })
    if resp.status_code == 200:
        ref_company_id = resp.json()["id"]
    else:
        log_test("10", "Create referral company", False, f"status={resp.status_code}")
        return False

    # Create opportunity with referral
    resp = api_post("/api/pipeline/opportunities", {
        "company_id": ref_company_id,
        "title": "Referral from Isaac Schild",
        "stage": "identified",
        "estimated_value": 15000,
        "referred_by_engagement_id": eng_id,
        "referred_by_contact_name": "Isaac Schild",
        "notes": "Isaac referred his colleague at a competing staffing firm.",
    })
    ok = resp.status_code == 200
    if ok:
        ref_opp = resp.json()
        ids["referral_opp_id"] = ref_opp.get("id")
        log_test("10", "Create referral opportunity", True, f"id={ids['referral_opp_id']}")
        log_test("10", "Referral fields populated",
                 ref_opp.get("referred_by_engagement_id") == eng_id,
                 f"ref_eng={ref_opp.get('referred_by_engagement_id')}")
    else:
        log_test("10", "Create referral opportunity", False, f"status={resp.status_code} body={resp.text[:200]}")

    # Check pipeline stats for referral metrics
    resp = api_get("/api/pipeline/stats")
    if resp.status_code == 200:
        stats = resp.json()
        referrals = stats.get("referrals", {})
        log_test("10", "Pipeline stats include referral metrics",
                 referrals.get("total_opportunities", 0) > 0,
                 f"referrals={referrals}")
    else:
        log_test("10", "Pipeline stats", False, f"status={resp.status_code}")

    return True


# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════
def main():
    print("╔══════════════════════════════════════════════════╗")
    print("║  BaxterLabs E2E Test — Scion Staffing Lifecycle ║")
    print("╚══════════════════════════════════════════════════╝")
    print(f"API: {API_URL}")
    print(f"Supabase: {SB_URL}")
    print(f"Date: {date.today().isoformat()}")

    # Stage 1: Health & Auth
    if not stage_1():
        print("\n❌ STAGE 1 FAILED — Cannot proceed without auth")
        write_report()
        return

    # Stage 2: Pipeline Create
    stage_2()

    # Stage 3: Pipeline Stage Progression
    stage_3()

    # Stage 4: Pipeline → Engagement Conversion
    if not stage_4():
        print("\n❌ STAGE 4 FAILED — Cannot proceed without engagement")
        write_report()
        return

    # Stage 5: Advance engagement status via DB (simulating DocuSign flow)
    if not stage_5():
        print("\n❌ STAGE 5 FAILED — Cannot proceed")
        write_report()
        return

    # Stage 6: Invoicing
    stage_6()

    # Stage 7: Phase Progression
    stage_7()

    # Stage 8: Archive & Follow-Up Sequences
    stage_8()

    # Stage 9: Follow-Up Actions
    stage_9()

    # Stage 10: Referral Attribution
    stage_10()

    # Print IDs
    print("\n═══ RESOURCE IDS ═══")
    for key, val in ids.items():
        print(f"  {key}: {val}")

    write_report()


def write_report():
    """Write the test results to a report file."""
    passed = sum(1 for r in results if r["passed"])
    failed = sum(1 for r in results if not r["passed"])
    total = len(results)

    print(f"\n═══ SUMMARY ═══")
    print(f"Total: {total} | Passed: {passed} | Failed: {failed} | Bugs: {len(bugs)}")

    # Print all results
    for key, val in ids.items():
        pass  # Already printed

    if bugs:
        print(f"\n═══ BUGS ═══")
        for b in bugs:
            print(f"  [{b['severity']}] Stage {b['stage']}: {b['description']} ({b['status']})")

    # Output IDs as JSON for next steps
    print(f"\n═══ IDS JSON ═══")
    print(json.dumps(ids, indent=2))


if __name__ == "__main__":
    main()
