"""
BaxterLabs E2E Test Suite
=========================
Exercises the full 18-step engagement workflow against a running local backend.

Prerequisites:
  - Backend running at http://localhost:8000
  - Supabase accessible with valid credentials
  - All env vars loaded from ~/Projects/master.env
  - DocuSign steps are simulated (test manually with DocuSign sandbox)
  - Firecrawl steps are simulated if API key not configured
  - Emails are logged (DEVELOPMENT_MODE=true), not actually sent

Usage:
  cd tests && python e2e_test.py
  cd tests && python e2e_test.py --cleanup  # Delete test records after run

Test records are prefixed with "E2E_TEST_" for easy identification.
"""
from __future__ import annotations

import os
import sys
import json
import time
import argparse
from datetime import datetime, timezone
from typing import List, Tuple, Optional

from dotenv import load_dotenv

load_dotenv(os.path.expanduser("~/Projects/master.env"))

import httpx
from supabase import create_client

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "http://localhost:8000"
SUPABASE_URL = os.environ["SUPABASE_URL_BAXTERLABS_STATIC_SITE"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY_BAXTERLABS_STATIC_SITE"]
PARTNER_PASSWORD = os.environ.get("PARTNER_PASSWORD", "")

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# Track created resources for cleanup
created_engagement_ids: List[str] = []
created_client_ids: List[str] = []
results: List[Tuple[int, str, bool, str]] = []  # (step_num, name, passed, detail)

TOTAL_STEPS = 18


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def get_auth_token() -> str:
    """Sign in as partner and return JWT token."""
    auth = sb.auth.sign_in_with_password({
        "email": "george@baxterlabs.ai",
        "password": PARTNER_PASSWORD,
    })
    return auth.session.access_token


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Test step wrapper
# ---------------------------------------------------------------------------

def run_step(step_num: int, total: int, name: str, func):
    """Run a test step, catch exceptions, record result."""
    print(f"\n[Step {step_num}/{total}] {name}...")
    try:
        result = func()
        if result is True or result is None:
            results.append((step_num, name, True, "OK"))
            print(f"  PASSED")
        elif isinstance(result, str):
            # Skipped with reason
            results.append((step_num, name, True, f"Skipped: {result}"))
            print(f"  SKIPPED: {result}")
        else:
            results.append((step_num, name, True, str(result)))
            print(f"  PASSED -- {result}")
    except AssertionError as e:
        results.append((step_num, name, False, str(e)))
        print(f"  FAILED: {e}")
    except Exception as e:
        results.append((step_num, name, False, str(e)))
        print(f"  ERROR: {e}")


# ---------------------------------------------------------------------------
# Shared mutable state across steps
# ---------------------------------------------------------------------------

class State:
    token: Optional[str] = None
    engagement_id: Optional[str] = None
    client_id: Optional[str] = None
    upload_token: Optional[str] = None


state = State()


# ---------------------------------------------------------------------------
# Step implementations
# ---------------------------------------------------------------------------

def step_01_submit_intake():
    """POST /api/intake -- Submit test client data."""
    payload = {
        "company_name": "E2E_TEST_AcmeCorp",
        "primary_contact_name": "E2E Test User",
        "primary_contact_email": "e2e-test@example.com",
        "primary_contact_phone": "(555) 000-0000",
        "industry": "Technology / SaaS",
        "revenue_range": "$5M - $10M",
        "employee_count": "26 - 100",
        "website_url": "https://example.com",
        "pain_points": "E2E test -- margin compression",
        "referral_source": "Other",
        "preferred_start_date": None,
        "interview_contacts": [
            {
                "name": "E2E Contact One",
                "title": "CFO",
                "email": "contact1@example.com",
                "phone": "",
                "linkedin_url": "",
            }
        ],
    }
    with httpx.Client(timeout=30) as client:
        r = client.post(f"{BASE_URL}/api/intake", json=payload)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"Intake did not succeed: {data}"
    state.engagement_id = data["engagement_id"]
    state.client_id = data["client_id"]
    created_engagement_ids.append(state.engagement_id)
    created_client_ids.append(state.client_id)
    return f"engagement_id={state.engagement_id}"


def step_02_verify_db_records():
    """Verify client + engagement exist in DB with correct status."""
    assert state.engagement_id, "No engagement_id from step 1"
    result = (
        sb.table("engagements")
        .select("*, clients(*)")
        .eq("id", state.engagement_id)
        .execute()
    )
    assert result.data, "Engagement not found in database"
    eng = result.data[0]
    assert eng["status"] == "nda_pending", f"Expected status 'nda_pending', got '{eng['status']}'"
    assert eng["clients"]["company_name"] == "E2E_TEST_AcmeCorp", "Company name mismatch"
    return f"status={eng['status']}, client={eng['clients']['company_name']}"


def step_03_verify_nda_record():
    """Verify NDA legal_document record exists (or create one if DocuSign not configured)."""
    assert state.engagement_id, "No engagement_id"
    result = (
        sb.table("legal_documents")
        .select("*")
        .eq("engagement_id", state.engagement_id)
        .eq("type", "nda")
        .execute()
    )
    if result.data:
        return f"NDA record found (status={result.data[0]['status']})"
    else:
        # DocuSign not configured -- insert a pending NDA record
        sb.table("legal_documents").insert({
            "engagement_id": state.engagement_id,
            "type": "nda",
            "status": "pending",
        }).execute()
        return "DocuSign not configured -- NDA record inserted manually"


def step_04_simulate_nda_signed():
    """Simulate NDA signing via direct DB updates."""
    assert state.engagement_id, "No engagement_id"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Update legal doc status
    sb.table("legal_documents").update({
        "status": "signed",
        "signed_at": now_iso,
    }).eq("engagement_id", state.engagement_id).eq("type", "nda").execute()

    # Update engagement status
    sb.table("engagements").update({
        "status": "nda_signed",
    }).eq("id", state.engagement_id).execute()

    # Verify
    eng = sb.table("engagements").select("status").eq("id", state.engagement_id).execute()
    assert eng.data[0]["status"] == "nda_signed", f"Status not updated: {eng.data[0]['status']}"
    return "DocuSign NDA signing simulated"


def step_05_verify_or_simulate_research():
    """Verify research documents exist, or insert a dummy dossier if Firecrawl not configured."""
    assert state.engagement_id, "No engagement_id"
    result = (
        sb.table("research_documents")
        .select("*")
        .eq("engagement_id", state.engagement_id)
        .execute()
    )
    if result.data:
        return f"Research found ({len(result.data)} documents)"
    else:
        sb.table("research_documents").insert({
            "engagement_id": state.engagement_id,
            "type": "company_dossier",
            "content": "E2E TEST -- simulated company dossier content.",
        }).execute()
        return "Firecrawl simulated -- dummy dossier inserted"


def step_06_get_auth_token():
    """Authenticate as partner and obtain JWT token."""
    assert PARTNER_PASSWORD, "PARTNER_PASSWORD env var not set"
    state.token = get_auth_token()
    assert state.token, "Auth token is empty"
    return f"Token obtained (length={len(state.token)})"


def step_07_list_engagements():
    """GET /api/engagements -- List all engagements (authed)."""
    assert state.token, "No auth token"
    with httpx.Client(timeout=30) as client:
        r = client.get(f"{BASE_URL}/api/engagements", headers=auth_headers(state.token))
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "engagements" in data, "Missing 'engagements' key in response"
    # Find our test engagement
    found = any(e["id"] == state.engagement_id for e in data["engagements"])
    assert found, f"Test engagement {state.engagement_id} not found in list"
    return f"Found test engagement in list of {data['count']}"


def step_08_get_engagement_detail():
    """GET /api/engagements/{id} -- Get full engagement detail."""
    assert state.token and state.engagement_id, "Missing token or engagement_id"
    with httpx.Client(timeout=30) as client:
        r = client.get(
            f"{BASE_URL}/api/engagements/{state.engagement_id}",
            headers=auth_headers(state.token),
        )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("id") == state.engagement_id, "Engagement ID mismatch"
    assert "research_documents" in data, "Missing research_documents in detail"
    assert "interview_contacts" in data, "Missing interview_contacts in detail"
    return f"Detail retrieved (status={data.get('status')}, research_docs={len(data.get('research_documents', []))})"


def step_09_start_engagement():
    """POST /api/engagements/{id}/start -- Start engagement (set to discovery_done first)."""
    assert state.token and state.engagement_id, "Missing token or engagement_id"

    # Pre-condition: engagement must be in nda_signed or discovery_done
    sb.table("engagements").update({
        "status": "discovery_done",
    }).eq("id", state.engagement_id).execute()

    with httpx.Client(timeout=30) as client:
        r = client.post(
            f"{BASE_URL}/api/engagements/{state.engagement_id}/start",
            json={"fee": 12500},
            headers=auth_headers(state.token),
        )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"Start engagement failed: {data}"

    # Verify status changed to agreement_pending
    eng = sb.table("engagements").select("status").eq("id", state.engagement_id).execute()
    assert eng.data[0]["status"] == "agreement_pending", f"Status is {eng.data[0]['status']}, expected agreement_pending"
    return f"agreement_sent={data.get('agreement_sent', False)}"


def step_10_simulate_agreement_signed():
    """Simulate agreement signing + transition to documents_pending."""
    assert state.engagement_id, "No engagement_id"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Check if agreement legal doc already exists (from start endpoint with DocuSign)
    existing = (
        sb.table("legal_documents")
        .select("id")
        .eq("engagement_id", state.engagement_id)
        .eq("type", "agreement")
        .execute()
    )
    if not existing.data:
        sb.table("legal_documents").insert({
            "engagement_id": state.engagement_id,
            "type": "agreement",
            "status": "signed",
            "signed_at": now_iso,
        }).execute()
    else:
        sb.table("legal_documents").update({
            "status": "signed",
            "signed_at": now_iso,
        }).eq("engagement_id", state.engagement_id).eq("type", "agreement").execute()

    # Update engagement to documents_pending (the status that allows uploads)
    sb.table("engagements").update({
        "status": "documents_pending",
    }).eq("id", state.engagement_id).execute()

    # Verify
    eng = sb.table("engagements").select("status").eq("id", state.engagement_id).execute()
    assert eng.data[0]["status"] == "documents_pending", f"Status: {eng.data[0]['status']}"
    return "Agreement signed simulated, status=documents_pending"


def step_11_upload_test_files():
    """Upload test files via the upload portal."""
    assert state.engagement_id, "No engagement_id"

    # Get upload token
    eng = (
        sb.table("engagements")
        .select("upload_token")
        .eq("id", state.engagement_id)
        .execute()
    )
    assert eng.data, "Engagement not found"
    state.upload_token = eng.data[0]["upload_token"]
    assert state.upload_token, "upload_token is empty"

    # Upload test files using valid item_keys from the checklist
    test_items = [
        ("income_stmt_ytd", "financial"),
        ("payroll_register", "payroll"),
        ("ap_aging", "vendor"),
    ]

    uploaded = 0
    with httpx.Client(timeout=30) as client:
        for item_key, category in test_items:
            files = {"file": (f"test_{item_key}.pdf", b"E2E test file content", "application/pdf")}
            data = {"item_key": item_key}
            r = client.post(
                f"{BASE_URL}/api/upload/{state.upload_token}",
                files=files,
                data=data,
            )
            assert r.status_code == 200, f"Upload {item_key} failed ({r.status_code}): {r.text}"
            uploaded += 1

    return f"Uploaded {uploaded} files"


def step_12_check_upload_status():
    """GET /api/upload/{token}/status -- Verify upload checklist shows uploaded files."""
    assert state.upload_token, "No upload_token"
    with httpx.Client(timeout=30) as client:
        r = client.get(f"{BASE_URL}/api/upload/{state.upload_token}/status")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert "checklist" in data, "Missing 'checklist' in response"
    progress = data.get("progress", {})
    total_uploaded = progress.get("total_uploaded", 0)
    assert total_uploaded >= 3, f"Expected at least 3 uploads, got {total_uploaded}"
    return f"total_uploaded={total_uploaded}, required_uploaded={progress.get('required_uploaded', 0)}/{progress.get('required_total', 0)}"


def step_13_advance_through_phases():
    """Advance engagement through all 8 phases (0-7)."""
    assert state.token and state.engagement_id, "Missing token or engagement_id"

    # Pre-condition: set status to documents_received so begin-phases works
    sb.table("engagements").update({
        "status": "documents_received",
    }).eq("id", state.engagement_id).execute()

    # Begin phases (phase 0)
    with httpx.Client(timeout=30) as client:
        r = client.post(
            f"{BASE_URL}/api/engagements/{state.engagement_id}/begin-phases",
            headers=auth_headers(state.token),
        )
    assert r.status_code == 200, f"begin-phases failed ({r.status_code}): {r.text}"

    # Advance through phases 0-7
    # Review gates are at phases 1, 3, 6
    review_gate_phases = {1, 3, 6}
    phases_advanced = 0

    with httpx.Client(timeout=60) as client:
        for _ in range(8):
            # Reload to check current state
            eng = (
                sb.table("engagements")
                .select("phase, status")
                .eq("id", state.engagement_id)
                .execute()
            )
            current_phase = eng.data[0]["phase"]
            current_status = eng.data[0]["status"]

            if current_status == "phases_complete" or current_phase > 7:
                break

            review_confirmed = current_phase in review_gate_phases
            r = client.post(
                f"{BASE_URL}/api/engagements/{state.engagement_id}/advance-phase",
                json={
                    "review_confirmed": review_confirmed,
                    "notes": f"E2E phase {current_phase}",
                },
                headers=auth_headers(state.token),
            )
            assert r.status_code == 200, f"Advance phase {current_phase} failed ({r.status_code}): {r.text}"

            resp_data = r.json()
            # If review was required but we didn't confirm, retry with confirmation
            if resp_data.get("review_required"):
                r = client.post(
                    f"{BASE_URL}/api/engagements/{state.engagement_id}/advance-phase",
                    json={"review_confirmed": True, "notes": f"E2E phase {current_phase} (confirmed)"},
                    headers=auth_headers(state.token),
                )
                assert r.status_code == 200, f"Confirmed advance phase {current_phase} failed: {r.text}"

            phases_advanced += 1

    # Verify final status
    eng = sb.table("engagements").select("phase, status").eq("id", state.engagement_id).execute()
    final_status = eng.data[0]["status"]
    assert final_status == "phases_complete", f"Expected 'phases_complete', got '{final_status}'"
    return f"Advanced {phases_advanced} phases, final status={final_status}"


def step_14_ensure_deliverables():
    """POST /api/engagements/{id}/deliverables/ensure -- Create 6 deliverable records."""
    assert state.token and state.engagement_id, "Missing token or engagement_id"
    with httpx.Client(timeout=30) as client:
        r = client.post(
            f"{BASE_URL}/api/engagements/{state.engagement_id}/deliverables/ensure",
            headers=auth_headers(state.token),
        )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"ensure failed: {data}"
    deliverables = data.get("deliverables", [])
    assert len(deliverables) == 6, f"Expected 6 deliverables, got {len(deliverables)}"
    wave1_count = sum(1 for d in deliverables if d.get("wave") == 1)
    wave2_count = sum(1 for d in deliverables if d.get("wave") == 2)
    return f"Created {len(deliverables)} deliverables (wave1={wave1_count}, wave2={wave2_count})"


def step_15_upload_approve_release_wave1():
    """Upload + approve all Wave 1 deliverables, then release Wave 1."""
    assert state.token and state.engagement_id, "Missing token or engagement_id"

    deliverables_result = (
        sb.table("deliverables")
        .select("*")
        .eq("engagement_id", state.engagement_id)
        .eq("wave", 1)
        .execute()
    )
    assert deliverables_result.data, "No Wave 1 deliverables found"
    assert len(deliverables_result.data) == 4, f"Expected 4 Wave 1 deliverables, got {len(deliverables_result.data)}"

    with httpx.Client(timeout=60) as client:
        for d in deliverables_result.data:
            d_id = d["id"]
            d_type = d["type"]

            # Upload a test file (.pdf is in allowed list for deliverables)
            files = {"file": (f"test_{d_type}.pdf", b"E2E test deliverable content", "application/pdf")}
            r = client.post(
                f"{BASE_URL}/api/engagements/{state.engagement_id}/deliverables/{d_id}/upload",
                files=files,
                headers=auth_headers(state.token),
            )
            assert r.status_code == 200, f"Upload deliverable {d_type} failed ({r.status_code}): {r.text}"

            # Approve
            r = client.put(
                f"{BASE_URL}/api/deliverables/{d_id}/approve",
                headers=auth_headers(state.token),
            )
            assert r.status_code == 200, f"Approve deliverable {d_type} failed ({r.status_code}): {r.text}"

        # Release Wave 1
        r = client.post(
            f"{BASE_URL}/api/engagements/{state.engagement_id}/release-wave1",
            headers=auth_headers(state.token),
        )
    assert r.status_code == 200, f"release-wave1 failed ({r.status_code}): {r.text}"

    # Verify status
    eng = sb.table("engagements").select("status").eq("id", state.engagement_id).execute()
    assert eng.data[0]["status"] == "wave_1_released", f"Status: {eng.data[0]['status']}"
    return "4 deliverables uploaded, approved, and released"


def step_16_debrief_complete():
    """POST /api/engagements/{id}/debrief-complete -- Mark debrief as done."""
    assert state.token and state.engagement_id, "Missing token or engagement_id"
    with httpx.Client(timeout=30) as client:
        r = client.post(
            f"{BASE_URL}/api/engagements/{state.engagement_id}/debrief-complete",
            headers=auth_headers(state.token),
        )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"debrief-complete failed: {data}"

    eng = sb.table("engagements").select("debrief_complete, status").eq("id", state.engagement_id).execute()
    assert eng.data[0]["debrief_complete"] is True, "debrief_complete not set to True"
    return f"status={eng.data[0]['status']}"


def step_17_upload_approve_release_wave2():
    """Upload + approve all Wave 2 deliverables, then release Wave 2."""
    assert state.token and state.engagement_id, "Missing token or engagement_id"

    deliverables_result = (
        sb.table("deliverables")
        .select("*")
        .eq("engagement_id", state.engagement_id)
        .eq("wave", 2)
        .execute()
    )
    assert deliverables_result.data, "No Wave 2 deliverables found"
    assert len(deliverables_result.data) == 2, f"Expected 2 Wave 2 deliverables, got {len(deliverables_result.data)}"

    with httpx.Client(timeout=60) as client:
        for d in deliverables_result.data:
            d_id = d["id"]
            d_type = d["type"]

            # Upload a test file
            files = {"file": (f"test_{d_type}.pdf", b"E2E test deliverable content", "application/pdf")}
            r = client.post(
                f"{BASE_URL}/api/engagements/{state.engagement_id}/deliverables/{d_id}/upload",
                files=files,
                headers=auth_headers(state.token),
            )
            assert r.status_code == 200, f"Upload deliverable {d_type} failed ({r.status_code}): {r.text}"

            # Approve
            r = client.put(
                f"{BASE_URL}/api/deliverables/{d_id}/approve",
                headers=auth_headers(state.token),
            )
            assert r.status_code == 200, f"Approve deliverable {d_type} failed ({r.status_code}): {r.text}"

        # Release Wave 2 (deck)
        r = client.post(
            f"{BASE_URL}/api/engagements/{state.engagement_id}/release-deck",
            headers=auth_headers(state.token),
        )
    assert r.status_code == 200, f"release-deck failed ({r.status_code}): {r.text}"

    # Verify status
    eng = sb.table("engagements").select("status").eq("id", state.engagement_id).execute()
    assert eng.data[0]["status"] == "wave_2_released", f"Status: {eng.data[0]['status']}"
    return "2 deliverables uploaded, approved, and released"


def step_18_archive_engagement():
    """POST /api/engagements/{id}/archive -- Archive and close the engagement."""
    assert state.token and state.engagement_id, "Missing token or engagement_id"
    with httpx.Client(timeout=60) as client:
        r = client.post(
            f"{BASE_URL}/api/engagements/{state.engagement_id}/archive",
            headers=auth_headers(state.token),
        )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data.get("success") is True, f"archive failed: {data}"

    # Verify status is closed
    eng = sb.table("engagements").select("status").eq("id", state.engagement_id).execute()
    assert eng.data[0]["status"] == "closed", f"Status: {eng.data[0]['status']}, expected 'closed'"
    return f"Engagement archived -- {data.get('message', '')}"


# ---------------------------------------------------------------------------
# Concurrent Engagement Isolation Test
# ---------------------------------------------------------------------------

def run_concurrent_test(token: str):
    """Create 3 test engagements, advance to different statuses, upload files,
    and verify NO cross-contamination between engagements."""

    print("\n" + "=" * 55)
    print("CONCURRENT ENGAGEMENT ISOLATION TEST")
    print("=" * 55)

    concurrent_ids: List[str] = []
    concurrent_client_ids: List[str] = []
    concurrent_upload_tokens: List[str] = []
    passed = True

    try:
        # ── Create 3 test engagements ────────────────────────────────────
        print("\n  Creating 3 concurrent test engagements...")
        for label in ["A", "B", "C"]:
            payload = {
                "company_name": f"E2E_TEST_Concurrent_{label}",
                "primary_contact_name": f"Concurrent {label} User",
                "primary_contact_email": f"concurrent-{label.lower()}@example.com",
                "primary_contact_phone": "(555) 000-0001",
                "industry": "Technology / SaaS",
                "pain_points": f"E2E concurrent test {label}",
                "interview_contacts": [],
            }
            with httpx.Client(timeout=30) as client:
                r = client.post(f"{BASE_URL}/api/intake", json=payload)
            assert r.status_code == 200, f"Concurrent intake {label} failed: {r.text}"
            data = r.json()
            eid = data["engagement_id"]
            cid = data["client_id"]
            concurrent_ids.append(eid)
            concurrent_client_ids.append(cid)
            created_engagement_ids.append(eid)
            created_client_ids.append(cid)
            print(f"    Engagement {label}: {eid}")

        # ── Advance each to a different status ───────────────────────────
        print("  Advancing to different statuses...")

        now_iso = datetime.now(timezone.utc).isoformat()

        # A -> nda_signed
        sb.table("legal_documents").insert({
            "engagement_id": concurrent_ids[0],
            "type": "nda",
            "status": "signed",
            "signed_at": now_iso,
        }).execute()
        sb.table("engagements").update({"status": "nda_signed"}).eq("id", concurrent_ids[0]).execute()
        print(f"    A -> nda_signed")

        # B -> documents_pending (so uploads are allowed)
        sb.table("legal_documents").insert({
            "engagement_id": concurrent_ids[1],
            "type": "nda",
            "status": "signed",
            "signed_at": now_iso,
        }).execute()
        sb.table("engagements").update({"status": "documents_pending"}).eq("id", concurrent_ids[1]).execute()
        print(f"    B -> documents_pending")

        # C -> documents_pending (so uploads are allowed)
        sb.table("legal_documents").insert({
            "engagement_id": concurrent_ids[2],
            "type": "nda",
            "status": "signed",
            "signed_at": now_iso,
        }).execute()
        sb.table("engagements").update({"status": "documents_pending"}).eq("id", concurrent_ids[2]).execute()
        print(f"    C -> documents_pending")

        # ── Get upload tokens ────────────────────────────────────────────
        for eid in concurrent_ids:
            eng = sb.table("engagements").select("upload_token").eq("id", eid).execute()
            concurrent_upload_tokens.append(eng.data[0]["upload_token"])

        # ── Upload a distinct file to B and C ────────────────────────────
        print("  Uploading distinct files to B and C...")

        # B gets income_stmt_ytd
        with httpx.Client(timeout=30) as client:
            files_b = {"file": ("concurrent_B_income.pdf", b"CONCURRENT_B_FILE_DATA", "application/pdf")}
            r = client.post(
                f"{BASE_URL}/api/upload/{concurrent_upload_tokens[1]}",
                files=files_b,
                data={"item_key": "income_stmt_ytd"},
            )
        assert r.status_code == 200, f"Upload to B failed: {r.text}"
        print(f"    B: uploaded income_stmt_ytd")

        # C gets balance_sheet
        with httpx.Client(timeout=30) as client:
            files_c = {"file": ("concurrent_C_balance.pdf", b"CONCURRENT_C_FILE_DATA", "application/pdf")}
            r = client.post(
                f"{BASE_URL}/api/upload/{concurrent_upload_tokens[2]}",
                files=files_c,
                data={"item_key": "balance_sheet"},
            )
        assert r.status_code == 200, f"Upload to C failed: {r.text}"
        print(f"    C: uploaded balance_sheet")

        # ── Verify NO cross-contamination ────────────────────────────────
        print("  Verifying isolation (no cross-contamination)...")

        for i, (eid, label) in enumerate(zip(concurrent_ids, ["A", "B", "C"])):
            docs = (
                sb.table("documents")
                .select("*")
                .eq("engagement_id", eid)
                .eq("document_type", "client_upload")
                .execute()
            )
            doc_count = len(docs.data)

            if label == "A":
                # A should have 0 documents (we didn't upload to A)
                if doc_count != 0:
                    print(f"    FAIL: Engagement A has {doc_count} documents (expected 0)")
                    passed = False
                else:
                    print(f"    OK: Engagement A has 0 documents")

            elif label == "B":
                # B should have exactly 1 document (income_stmt_ytd)
                if doc_count != 1:
                    print(f"    FAIL: Engagement B has {doc_count} documents (expected 1)")
                    passed = False
                else:
                    b_item = docs.data[0].get("item_name", "")
                    if b_item != "income_stmt_ytd":
                        print(f"    FAIL: Engagement B doc is '{b_item}', expected 'income_stmt_ytd'")
                        passed = False
                    else:
                        print(f"    OK: Engagement B has 1 document (income_stmt_ytd)")

            elif label == "C":
                # C should have exactly 1 document (balance_sheet)
                if doc_count != 1:
                    print(f"    FAIL: Engagement C has {doc_count} documents (expected 1)")
                    passed = False
                else:
                    c_item = docs.data[0].get("item_name", "")
                    if c_item != "balance_sheet":
                        print(f"    FAIL: Engagement C doc is '{c_item}', expected 'balance_sheet'")
                        passed = False
                    else:
                        print(f"    OK: Engagement C has 1 document (balance_sheet)")

        # ── Also verify via the upload status API ────────────────────────
        print("  Verifying isolation via upload status API...")
        with httpx.Client(timeout=30) as client:
            for i, (ut, label) in enumerate(zip(concurrent_upload_tokens, ["A", "B", "C"])):
                r = client.get(f"{BASE_URL}/api/upload/{ut}/status")
                if r.status_code == 200:
                    data = r.json()
                    api_uploaded = data.get("progress", {}).get("total_uploaded", 0)
                    expected = 0 if label == "A" else 1
                    if api_uploaded != expected:
                        print(f"    FAIL: Upload status API for {label} reports {api_uploaded} uploads (expected {expected})")
                        passed = False
                    else:
                        print(f"    OK: Upload status API for {label} reports {api_uploaded} uploads")
                else:
                    print(f"    FAIL: Upload status API for {label} returned {r.status_code}")
                    passed = False

        if passed:
            print("\n  CONCURRENT ISOLATION: ALL CHECKS PASSED")
            results.append((19, "Concurrent Engagement Isolation", True, "OK"))
        else:
            print("\n  CONCURRENT ISOLATION: SOME CHECKS FAILED")
            results.append((19, "Concurrent Engagement Isolation", False, "Cross-contamination detected"))

    except Exception as e:
        print(f"\n  CONCURRENT ISOLATION: ERROR -- {e}")
        results.append((19, "Concurrent Engagement Isolation", False, str(e)))


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

def cleanup():
    """Delete all test records created during the run."""
    print("\nCleaning up test data...")
    for eid in created_engagement_ids:
        try:
            # Delete related records first (foreign key dependencies)
            for table in [
                "activity_log",
                "deliverables",
                "documents",
                "research_documents",
                "legal_documents",
                "phase_executions",
                "interview_contacts",
            ]:
                sb.table(table).delete().eq("engagement_id", eid).execute()

            # Get client_id before deleting engagement
            eng = sb.table("engagements").select("client_id").eq("id", eid).execute()
            if eng.data:
                client_id = eng.data[0]["client_id"]
                sb.table("engagements").delete().eq("id", eid).execute()
                # Only delete client if no other engagements reference it
                other = sb.table("engagements").select("id").eq("client_id", client_id).execute()
                if not other.data:
                    sb.table("clients").delete().eq("id", client_id).execute()
            print(f"  Cleaned up engagement {eid}")
        except Exception as e:
            print(f"  Failed to clean up {eid}: {e}")

    # Clean up storage files
    for eid in created_engagement_ids:
        try:
            # List and remove all files under this engagement in both buckets
            for bucket_name in ["engagements", "archive"]:
                try:
                    items = sb.storage.from_(bucket_name).list(path=eid)
                    if items:
                        # Recursively collect file paths
                        _remove_storage_recursive(bucket_name, eid)
                except Exception:
                    pass
        except Exception:
            pass

    print("Cleanup complete.")


def _remove_storage_recursive(bucket: str, prefix: str):
    """Recursively remove all files under a storage prefix."""
    try:
        items = sb.storage.from_(bucket).list(path=prefix)
        for item in items:
            name = item.get("name", "")
            if not name:
                continue
            child_path = f"{prefix}/{name}"
            if item.get("id") is None:
                # Folder -- recurse
                _remove_storage_recursive(bucket, child_path)
            else:
                # File -- remove
                try:
                    sb.storage.from_(bucket).remove([child_path])
                except Exception:
                    pass
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def print_summary():
    """Print test results summary."""
    print("\n" + "=" * 55)
    passed = sum(1 for _, _, p, _ in results if p)
    failed = sum(1 for _, _, p, _ in results if not p)
    total = len(results)
    print(f"E2E Test Results: {passed}/{total} passed, {failed} failed")
    if failed:
        print("\nFailed steps:")
        for step, name, p, detail in results:
            if not p:
                print(f"  Step {step} -- {name}: {detail}")
    print("=" * 55)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BaxterLabs E2E Test Suite")
    parser.add_argument("--cleanup", action="store_true", help="Clean up test records after run")
    args = parser.parse_args()

    print("=" * 55)
    print("BaxterLabs E2E Test Suite")
    print(f"Target: {BASE_URL}")
    print(f"Supabase: {SUPABASE_URL}")
    print(f"Started: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 55)

    # ── Preflight: verify backend is running ──────────────────────────────
    print("\nPreflight: checking backend health...")
    try:
        with httpx.Client(timeout=10) as client:
            r = client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200, f"Health check failed: {r.status_code}"
        health = r.json()
        assert health.get("status") == "ok", f"Health status: {health}"
        assert health.get("supabase") is True, "Supabase not reachable"
        print(f"  Backend OK, Supabase OK")
    except httpx.ConnectError:
        print(f"  ERROR: Cannot connect to {BASE_URL}. Is the backend running?")
        print(f"  Start it with: cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000")
        sys.exit(1)
    except Exception as e:
        print(f"  ERROR: {e}")
        sys.exit(1)

    # ── Run all 18 steps ──────────────────────────────────────────────────
    run_step(1, TOTAL_STEPS, "Submit intake form", step_01_submit_intake)
    run_step(2, TOTAL_STEPS, "Verify client + engagement in DB", step_02_verify_db_records)
    run_step(3, TOTAL_STEPS, "Verify/create NDA record", step_03_verify_nda_record)
    run_step(4, TOTAL_STEPS, "Simulate NDA signed", step_04_simulate_nda_signed)
    run_step(5, TOTAL_STEPS, "Verify/simulate research", step_05_verify_or_simulate_research)
    run_step(6, TOTAL_STEPS, "Get auth token", step_06_get_auth_token)
    run_step(7, TOTAL_STEPS, "List engagements (authed)", step_07_list_engagements)
    run_step(8, TOTAL_STEPS, "Get engagement detail", step_08_get_engagement_detail)
    run_step(9, TOTAL_STEPS, "Start engagement", step_09_start_engagement)
    run_step(10, TOTAL_STEPS, "Simulate agreement signed", step_10_simulate_agreement_signed)
    run_step(11, TOTAL_STEPS, "Upload test files via portal", step_11_upload_test_files)
    run_step(12, TOTAL_STEPS, "Check upload status", step_12_check_upload_status)
    run_step(13, TOTAL_STEPS, "Advance through all phases", step_13_advance_through_phases)
    run_step(14, TOTAL_STEPS, "Ensure deliverables", step_14_ensure_deliverables)
    run_step(15, TOTAL_STEPS, "Upload, approve, release Wave 1", step_15_upload_approve_release_wave1)
    run_step(16, TOTAL_STEPS, "Mark debrief complete", step_16_debrief_complete)
    run_step(17, TOTAL_STEPS, "Upload, approve, release Wave 2", step_17_upload_approve_release_wave2)
    run_step(18, TOTAL_STEPS, "Archive engagement", step_18_archive_engagement)

    # ── Concurrent isolation test ─────────────────────────────────────────
    run_concurrent_test(state.token)

    # ── Print summary ─────────────────────────────────────────────────────
    print_summary()

    # ── Cleanup (optional) ────────────────────────────────────────────────
    if args.cleanup:
        cleanup()
    else:
        print(f"\nTest engagement IDs: {created_engagement_ids}")
        print("Run with --cleanup to delete test records")

    # Exit with appropriate code
    failed_count = sum(1 for _, _, p, _ in results if not p)
    sys.exit(1 if failed_count > 0 else 0)
