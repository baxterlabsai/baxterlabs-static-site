from __future__ import annotations

import os
import re
import io
import csv
import logging
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, log_activity, create_engagement_folders
import json
from models.pipeline import (
    CompanyCreate, CompanyUpdate,
    ContactCreate, ContactUpdate,
    OpportunityCreate, OpportunityUpdate,
    ActivityCreate, ActivityUpdate, ActivityFromNotesInput,
    TaskCreate, TaskUpdate,
    ConversionRequest,
    WebsiteIntakeRequest, WebsiteIntakeResponse,
)

logger = logging.getLogger("baxterlabs.pipeline")

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

VALID_STAGES = {
    "identified", "contacted", "discovery_scheduled",
    "discovery_complete", "negotiation", "agreement_sent",
    "won", "lost", "dormant",
    "partner_identified", "partner_researched", "partner_outreach",
    "relationship_building", "active_referrer", "partner_dormant",
}
VALID_ACTIVITY_TYPES = {
    "video_call", "phone_call", "email", "dm",
    "linkedin", "meeting", "note", "referral",
    "plugin_research", "plugin_outreach_draft", "plugin_call_prep",
    "plugin_enrichment", "plugin_content", "partnership_meeting",
    "referral_received", "referral_sent",
    "research", "outreach_draft", "call_prep", "enrichment",
}
VALID_PRIORITIES = {"high", "normal", "low"}
VALID_TASK_STATUSES = {"pending", "complete", "skipped"}
VALID_TASK_TYPES = {
    # Outreach channels
    "email", "linkedin_dm", "linkedin_audio", "linkedin_comment",
    "linkedin_inmail", "phone_warm", "phone_cold", "referral_intro",
    "in_person", "conference",
    # Operational types
    "video_call", "review_draft", "prep", "follow_up", "admin", "other",
}
VALID_COMPANY_TYPES = {"prospect", "partner", "connector"}
VALID_LEAD_TIERS = {"tier_1", "tier_2", "tier_3"}
VALID_ACTIVITY_STATUSES = {"draft", "sent", "discarded", "logged"}
VALID_OUTREACH_CHANNELS = {"email", "linkedin", "phone", "other"}


# ==========================================================================
# Companies
# ==========================================================================

@router.get("/companies")
async def list_companies(
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    company_type: Optional[str] = Query(None),
    has_lead_score: Optional[bool] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = sb.table("pipeline_companies").select("*").eq("is_deleted", False)
    if search:
        query = query.ilike("name", f"%{search}%")
    if industry:
        query = query.eq("industry", industry)
    if company_type:
        query = query.eq("company_type", company_type)
    if has_lead_score is True:
        query = query.not_.is_("lead_score", "null")
    result = query.order("created_at", desc=True).execute()
    return {"companies": result.data, "count": len(result.data)}


@router.post("/companies")
async def create_company(body: CompanyCreate, user: dict = Depends(verify_partner_auth)):
    if body.company_type and body.company_type not in VALID_COMPANY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid company_type: {body.company_type}")
    sb = get_supabase()
    row = body.model_dump(exclude_none=True)
    row["created_by"] = user.get("sub")
    result = sb.table("pipeline_companies").insert(row).execute()
    return result.data[0]


@router.get("/companies/{company_id}")
async def get_company(company_id: str, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    company = sb.table("pipeline_companies").select("*").eq("id", company_id).eq("is_deleted", False).execute()
    if not company.data:
        raise HTTPException(status_code=404, detail="Company not found")

    contacts = sb.table("pipeline_contacts").select("*").eq("company_id", company_id).eq("is_deleted", False).order("created_at", desc=True).execute()
    opportunities = sb.table("pipeline_opportunities").select("*").eq("company_id", company_id).eq("is_deleted", False).order("created_at", desc=True).execute()
    activities = sb.table("pipeline_activities").select("*, pipeline_contacts(id, name, email), pipeline_companies(id, name), pipeline_opportunities(id, title)").eq("company_id", company_id).eq("is_deleted", False).order("occurred_at", desc=True).limit(50).execute()

    return {
        **company.data[0],
        "contacts": contacts.data,
        "opportunities": opportunities.data,
        "activities": activities.data,
    }


@router.put("/companies/{company_id}")
async def update_company(company_id: str, body: CompanyUpdate, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "company_type" in updates and updates["company_type"] not in VALID_COMPANY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid company_type: {updates['company_type']}")
    result = sb.table("pipeline_companies").update(updates).eq("id", company_id).eq("is_deleted", False).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return result.data[0]


@router.delete("/companies/{company_id}")
async def delete_company(company_id: str, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    result = (
        sb.table("pipeline_companies")
        .update({"is_deleted": True, "deleted_at": datetime.utcnow().isoformat()})
        .eq("id", company_id)
        .eq("is_deleted", False)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"success": True}


# ==========================================================================
# Contacts
# ==========================================================================

@router.get("/contacts")
async def list_contacts(
    search: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    lead_tier: Optional[str] = Query(None),
    is_connector: Optional[bool] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = sb.table("pipeline_contacts").select("*, pipeline_companies(id, name)").eq("is_deleted", False)
    if search:
        query = query.ilike("name", f"%{search}%")
    if company_id:
        query = query.eq("company_id", company_id)
    if lead_tier:
        query = query.eq("lead_tier", lead_tier)
    if is_connector is not None:
        query = query.eq("is_connector", is_connector)
    result = query.order("created_at", desc=True).execute()
    return {"contacts": result.data, "count": len(result.data)}


@router.post("/contacts")
async def create_contact(body: ContactCreate, user: dict = Depends(verify_partner_auth)):
    if body.lead_tier and body.lead_tier not in VALID_LEAD_TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid lead_tier: {body.lead_tier}")
    sb = get_supabase()
    row = body.model_dump(exclude_none=True)
    row["created_by"] = user.get("sub")
    result = sb.table("pipeline_contacts").insert(row).execute()
    return result.data[0]


@router.get("/contacts/{contact_id}")
async def get_contact(contact_id: str, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    contact = sb.table("pipeline_contacts").select("*, pipeline_companies(id, name)").eq("id", contact_id).eq("is_deleted", False).execute()
    if not contact.data:
        raise HTTPException(status_code=404, detail="Contact not found")

    activities = sb.table("pipeline_activities").select("*").eq("contact_id", contact_id).eq("is_deleted", False).order("occurred_at", desc=True).limit(50).execute()
    opportunities = sb.table("pipeline_opportunities").select("*").eq("primary_contact_id", contact_id).eq("is_deleted", False).order("created_at", desc=True).execute()

    return {
        **contact.data[0],
        "activities": activities.data,
        "opportunities": opportunities.data,
    }


@router.put("/contacts/{contact_id}")
async def update_contact(contact_id: str, body: ContactUpdate, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "lead_tier" in updates and updates["lead_tier"] not in VALID_LEAD_TIERS:
        raise HTTPException(status_code=400, detail=f"Invalid lead_tier: {updates['lead_tier']}")
    result = sb.table("pipeline_contacts").update(updates).eq("id", contact_id).eq("is_deleted", False).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")
    return result.data[0]


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    result = (
        sb.table("pipeline_contacts")
        .update({"is_deleted": True, "deleted_at": datetime.utcnow().isoformat()})
        .eq("id", contact_id)
        .eq("is_deleted", False)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True}


# ==========================================================================
# Opportunities
# ==========================================================================

@router.get("/opportunities")
async def list_opportunities(
    stage: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    company_type: Optional[str] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()

    # If filtering by company_type, get matching company IDs first
    if company_type:
        type_companies = (
            sb.table("pipeline_companies")
            .select("id")
            .eq("is_deleted", False)
            .eq("company_type", company_type)
            .execute()
        )
        type_ids = [c["id"] for c in type_companies.data]
        if not type_ids:
            return {"opportunities": [], "count": 0}

    query = (
        sb.table("pipeline_opportunities")
        .select("*, pipeline_companies!pipeline_opportunities_company_id_fkey(id, name), pipeline_contacts!pipeline_opportunities_primary_contact_id_fkey(id, name)")
        .eq("is_deleted", False)
    )
    if stage:
        query = query.eq("stage", stage)
    if assigned_to:
        query = query.eq("assigned_to", assigned_to)
    if company_type:
        query = query.in_("company_id", type_ids)
    result = query.order("created_at", desc=True).execute()
    return {"opportunities": result.data, "count": len(result.data)}


@router.post("/opportunities")
async def create_opportunity(body: OpportunityCreate, user: dict = Depends(verify_partner_auth)):
    if body.stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {body.stage}")
    sb = get_supabase()
    row = body.model_dump(exclude_none=True)
    # Serialize date to ISO string for JSON transport
    if body.estimated_close_date:
        row["estimated_close_date"] = body.estimated_close_date.isoformat()
    row["created_by"] = user.get("sub")
    result = sb.table("pipeline_opportunities").insert(row).execute()
    return result.data[0]


@router.get("/opportunities/{opp_id}")
async def get_opportunity(opp_id: str, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    opp = (
        sb.table("pipeline_opportunities")
        .select("*, pipeline_companies!pipeline_opportunities_company_id_fkey(id, name), pipeline_contacts!pipeline_opportunities_primary_contact_id_fkey(id, name)")
        .eq("id", opp_id)
        .eq("is_deleted", False)
        .execute()
    )
    if not opp.data:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    activities = (
        sb.table("pipeline_activities")
        .select("*")
        .eq("opportunity_id", opp_id)
        .eq("is_deleted", False)
        .order("occurred_at", desc=True)
        .limit(50)
        .execute()
    )
    tasks = (
        sb.table("pipeline_tasks")
        .select("*")
        .eq("opportunity_id", opp_id)
        .order("created_at", desc=True)
        .execute()
    )

    return {
        **opp.data[0],
        "activities": activities.data,
        "tasks": tasks.data,
    }


@router.put("/opportunities/{opp_id}")
async def update_opportunity(opp_id: str, body: OpportunityUpdate, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "stage" in updates and updates["stage"] not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage: {updates['stage']}")
    if "estimated_close_date" in updates and isinstance(updates["estimated_close_date"], date):
        updates["estimated_close_date"] = updates["estimated_close_date"].isoformat()

    # Fetch current stage before update for transition logging
    from_stage = None
    if "stage" in updates:
        try:
            current = sb.table("pipeline_opportunities").select("stage").eq("id", opp_id).eq("is_deleted", False).execute()
            if current.data:
                from_stage = current.data[0]["stage"]
        except Exception:
            pass

    result = sb.table("pipeline_opportunities").update(updates).eq("id", opp_id).eq("is_deleted", False).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # Log stage transition (non-blocking)
    if "stage" in updates and from_stage and from_stage != updates["stage"]:
        try:
            sb.table("pipeline_stage_transitions").insert({
                "opportunity_id": opp_id,
                "from_stage": from_stage,
                "to_stage": updates["stage"],
                "transitioned_by": user.get("sub"),
            }).execute()
        except Exception as e:
            logger.warning(f"Stage transition log failed (non-blocking): {e}")

    return result.data[0]


def _gather_conversion_data(sb, opp_id: str):
    """Shared logic for gathering conversion data (used by both preview and convert)."""
    # Fetch opportunity
    opp = sb.table("pipeline_opportunities").select("*").eq("id", opp_id).eq("is_deleted", False).execute()
    if not opp.data:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp = opp.data[0]

    # Get company data
    company = sb.table("pipeline_companies").select("*").eq("id", opp["company_id"]).execute()
    if not company.data:
        raise HTTPException(status_code=404, detail="Associated company not found")
    company = company.data[0]

    # Get primary contact
    contact = None
    if opp.get("primary_contact_id"):
        contact_result = sb.table("pipeline_contacts").select("*").eq("id", opp["primary_contact_id"]).execute()
        if contact_result.data:
            contact = contact_result.data[0]

    # Get all contacts for this company
    all_contacts = (
        sb.table("pipeline_contacts")
        .select("*")
        .eq("company_id", opp["company_id"])
        .eq("is_deleted", False)
        .order("created_at")
        .execute()
    )

    # Gather activities for discovery notes extraction
    activities = (
        sb.table("pipeline_activities")
        .select("type, subject, body, outcome, next_action, occurred_at")
        .eq("opportunity_id", opp_id)
        .eq("is_deleted", False)
        .order("occurred_at", desc=True)
        .execute()
    )

    # Extract discovery notes from meeting-type activities
    discovery_parts = []
    pain_points_parts = []
    meeting_types = {"video_call", "phone_call", "meeting"}

    for act in activities.data:
        if act.get("type") in meeting_types:
            if act.get("body"):
                discovery_parts.append(act["body"])
            if act.get("outcome"):
                discovery_parts.append(f"Outcome: {act['outcome']}")

        # Scan all activity bodies for pain point language
        body_text = (act.get("body") or "") + " " + (act.get("outcome") or "")
        pain_keywords = ["pain point", "challenge", "problem", "issue", "struggle",
                         "bottleneck", "waste", "leak", "loss", "inefficien"]
        for keyword in pain_keywords:
            if keyword in body_text.lower():
                # Extract the sentence containing the keyword
                for sentence in body_text.replace("\n", ". ").split(". "):
                    if keyword in sentence.lower() and sentence.strip():
                        pain_points_parts.append(sentence.strip())
                break

    discovery_notes = "\n\n".join(discovery_parts) if discovery_parts else None
    pain_points = "\n".join(list(dict.fromkeys(pain_points_parts))) if pain_points_parts else None

    # Suggested start date: estimated_close_date + 7 days or None
    suggested_start = None
    if opp.get("estimated_close_date"):
        try:
            close_dt = date.fromisoformat(str(opp["estimated_close_date"]))
            suggested_start = (close_dt + timedelta(days=7)).isoformat()
        except (ValueError, TypeError):
            pass

    return {
        "opportunity": opp,
        "company": company,
        "primary_contact": contact,
        "all_contacts": all_contacts.data,
        "activities": activities.data,
        "discovery_notes": discovery_notes,
        "pain_points": pain_points,
        "suggested_start_date": suggested_start,
    }


@router.get("/opportunities/{opp_id}/conversion-preview")
async def conversion_preview(opp_id: str, user: dict = Depends(verify_partner_auth)):
    """Return all data that would be used in conversion, without actually converting."""
    sb = get_supabase()
    data = _gather_conversion_data(sb, opp_id)
    opp = data["opportunity"]
    company = data["company"]
    contact = data["primary_contact"]

    return {
        "opportunity_id": opp_id,
        "company": {
            "name": company.get("name"),
            "website": company.get("website"),
            "industry": company.get("industry"),
            "revenue_range": company.get("revenue_range"),
            "employee_count": company.get("employee_count"),
            "location": company.get("location"),
        },
        "primary_contact": {
            "id": contact["id"] if contact else None,
            "name": contact["name"] if contact else None,
            "email": contact.get("email") if contact else None,
            "phone": contact.get("phone") if contact else None,
            "title": contact.get("title") if contact else None,
            "linkedin_url": contact.get("linkedin_url") if contact else None,
        } if contact else None,
        "all_contacts": [
            {
                "id": c["id"],
                "name": c["name"],
                "title": c.get("title"),
                "email": c.get("email"),
                "phone": c.get("phone"),
                "linkedin_url": c.get("linkedin_url"),
                "is_decision_maker": c.get("is_decision_maker", False),
            }
            for c in data["all_contacts"]
        ],
        "discovery_notes": data["discovery_notes"],
        "pain_points": data["pain_points"],
        "suggested_fee": opp.get("estimated_value") or 12500,
        "suggested_partner_lead": opp.get("assigned_to") or "George DeVries",
        "suggested_start_date": data["suggested_start_date"],
        "referral_source": company.get("source"),
        "already_converted": opp.get("converted_engagement_id") is not None,
        "stage": opp.get("stage"),
    }


@router.post("/opportunities/{opp_id}/convert")
async def convert_opportunity(
    opp_id: str,
    body: Optional[ConversionRequest] = None,
    user: dict = Depends(verify_partner_auth),
):
    """Convert a won/negotiation/agreement_sent/discovery_complete opportunity into a client + engagement."""
    sb = get_supabase()
    req = body or ConversionRequest()

    # 1. Gather all data
    data = _gather_conversion_data(sb, opp_id)
    opp = data["opportunity"]
    company = data["company"]
    contact = data["primary_contact"]

    # 2. Validate
    allowed_stages = {"won", "negotiation", "agreement_sent", "discovery_complete"}
    if opp["stage"] not in allowed_stages:
        raise HTTPException(
            status_code=400,
            detail=f"Opportunity stage must be won, negotiation, agreement_sent, or discovery_complete (current: '{opp['stage']}')",
        )
    if opp.get("converted_engagement_id"):
        raise HTTPException(status_code=400, detail="Opportunity has already been converted")

    # 3. Use overrides or extracted data
    discovery_notes = req.discovery_notes_override or data["discovery_notes"]
    pain_points = req.pain_points_override or data["pain_points"]

    # 4. Create client record
    client_row = {
        "company_name": company["name"],
        "primary_contact_name": contact["name"] if contact else company["name"],
        "primary_contact_email": (contact or {}).get("email", ""),
        "primary_contact_phone": (contact or {}).get("phone"),
        "industry": company.get("industry"),
        "revenue_range": company.get("revenue_range"),
        "employee_count": company.get("employee_count"),
        "website_url": company.get("website"),
        "referral_source": req.referral_source or company.get("source"),
    }
    client_result = sb.table("clients").insert(client_row).execute()
    new_client_id = client_result.data[0]["id"]

    # 5. Create engagement record
    # If stage is "won", agreement has already been signed
    eng_status = "agreement_signed" if opp["stage"] == "won" else "agreement_pending"
    import secrets as _secrets
    onboarding_token = _secrets.token_urlsafe(32)
    engagement_row = {
        "client_id": new_client_id,
        "status": eng_status,
        "phase": 0,
        "fee": req.fee,
        "partner_lead": req.partner_lead,
        "discovery_notes": discovery_notes,
        "pain_points": pain_points,
        "upload_token": str(uuid.uuid4()),
        "onboarding_token": onboarding_token,
    }
    if req.preferred_start_date:
        engagement_row["preferred_start_date"] = req.preferred_start_date
    engagement_result = sb.table("engagements").insert(engagement_row).execute()
    new_engagement = engagement_result.data[0]
    new_engagement_id = new_engagement["id"]

    # 6. Create interview contacts
    created_contacts_count = 0
    if req.interview_contacts:
        # Use explicit mapping from the request
        for mapping in req.interview_contacts[:3]:
            pc = sb.table("pipeline_contacts").select("*").eq("id", mapping.pipeline_contact_id).execute()
            if pc.data:
                pc = pc.data[0]
                sb.table("interview_contacts").insert({
                    "engagement_id": new_engagement_id,
                    "contact_number": mapping.contact_number,
                    "name": pc["name"],
                    "title": pc.get("title"),
                    "email": pc.get("email"),
                    "phone": pc.get("phone"),
                    "linkedin_url": pc.get("linkedin_url"),
                }).execute()
                created_contacts_count += 1
    else:
        # Auto-select: primary contact first, then decision makers, up to 3
        all_contacts = data["all_contacts"]
        selected = []
        # Primary contact first
        if contact:
            selected.append(contact)
        # Then decision makers
        for c in all_contacts:
            if c["id"] != (contact or {}).get("id") and c.get("is_decision_maker"):
                selected.append(c)
        # Then remaining contacts
        for c in all_contacts:
            if c["id"] not in [s["id"] for s in selected if s.get("id")]:
                selected.append(c)

        # Also inject contacts from interview_contacts_json (website intake)
        icj = opp.get("interview_contacts_json")
        if icj:
            parsed = json.loads(icj) if isinstance(icj, str) else icj
            for raw_c in parsed:
                # Synthetic contacts have id=None — add if not already in selected by email
                existing_emails = {s.get("email") for s in selected if s.get("email")}
                if raw_c.get("email") not in existing_emails:
                    selected.append({
                        "id": None,
                        "name": raw_c["name"],
                        "title": raw_c.get("title"),
                        "email": raw_c.get("email"),
                        "phone": raw_c.get("phone"),
                        "linkedin_url": raw_c.get("linkedin_url"),
                    })

        for i, c in enumerate(selected[:3], start=1):
            sb.table("interview_contacts").insert({
                "engagement_id": new_engagement_id,
                "contact_number": i,
                "name": c["name"],
                "title": c.get("title"),
                "email": c.get("email"),
                "phone": c.get("phone"),
                "linkedin_url": c.get("linkedin_url"),
            }).execute()
            created_contacts_count += 1

    # 7. Update pipeline opportunity
    sb.table("pipeline_opportunities").update({
        "converted_client_id": new_client_id,
        "converted_engagement_id": new_engagement_id,
        "stage": "won",
    }).eq("id", opp_id).execute()

    # 8. Create storage folders (non-blocking)
    try:
        create_engagement_folders(new_engagement_id)
    except Exception as e:
        logger.warning(f"Failed to create storage folders: {e}")

    # 9. Log activity
    log_activity(
        engagement_id=new_engagement_id,
        actor="system",
        action="engagement_created_from_pipeline",
        details={
            "opportunity_id": opp_id,
            "company_name": company["name"],
            "primary_contact": contact["name"] if contact else None,
            "interview_contacts_count": created_contacts_count,
            "fee": req.fee,
        },
    )

    # 10. Send onboarding confirmation email (matching auto-conversion path)
    try:
        from services.email_service import get_email_service
        from services.supabase_client import get_engagement_by_id
        full_engagement = get_engagement_by_id(new_engagement_id)
        if full_engagement:
            email_svc = get_email_service()
            email_svc.send_engagement_confirmation_email(
                engagement=full_engagement,
                client=full_engagement.get("clients", {}),
                onboarding_token=onboarding_token,
            )
            log_activity(new_engagement_id, "system", "onboarding_email_sent", {
                "trigger": "manual_conversion",
                "to": (contact or {}).get("email"),
            })
            logger.info(f"Manual convert: onboarding email sent for engagement {new_engagement_id}")
    except Exception as e:
        logger.error(f"Manual convert: onboarding email failed: {e}")

    # 11. Google Drive archiving (non-blocking) — if agreement was sent via DocuSign
    envelope_id = opp.get("agreement_envelope_id")
    if envelope_id:
        try:
            from services.docusign_service import list_envelope_documents, fetch_envelope_document
            from services.google_drive_service import upload_signed_document

            _client_name = company["name"]
            doc_list = list_envelope_documents(envelope_id)

            label_map = {}
            for doc in doc_list:
                name_lower = doc.get("name", "").lower()
                if "nda" in name_lower or "non-disclosure" in name_lower or "mutual" in name_lower:
                    label_map[doc["documentId"]] = "NDA"
                elif "engagement" in name_lower or "agreement" in name_lower:
                    label_map[doc["documentId"]] = "Engagement Agreement"

            if len(label_map) < 2 and len(doc_list) >= 2:
                label_map[doc_list[0]["documentId"]] = "NDA"
                label_map[doc_list[1]["documentId"]] = "Engagement Agreement"

            for doc in doc_list:
                doc_id = doc["documentId"]
                label = label_map.get(doc_id)
                if not label:
                    continue
                pdf_bytes = fetch_envelope_document(envelope_id, doc_id)
                drive_file_id = upload_signed_document(pdf_bytes, label, _client_name)
                logger.info(f"Archived {label} for {_client_name} to Google Drive: {drive_file_id}")

        except Exception as e:
            logger.error(f"Google Drive archiving failed — conversion unaffected: {e}", exc_info=True)

    logger.info(f"Converted opportunity {opp_id} → client {new_client_id}, engagement {new_engagement_id}")

    return {
        "client_id": new_client_id,
        "engagement_id": new_engagement_id,
        "interview_contacts_created": created_contacts_count,
        "status": eng_status,
        "message": f"Opportunity converted successfully. Engagement created for {company['name']}.",
    }


@router.delete("/opportunities/{opp_id}")
async def delete_opportunity(opp_id: str, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    result = (
        sb.table("pipeline_opportunities")
        .update({"is_deleted": True, "deleted_at": datetime.utcnow().isoformat()})
        .eq("id", opp_id)
        .eq("is_deleted", False)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return {"success": True}


# ==========================================================================
# Website Intake (public — no auth)
# ==========================================================================

@router.post("/website-intake", response_model=WebsiteIntakeResponse)
async def website_intake(req: WebsiteIntakeRequest):
    """Public endpoint — website Get Started form creates pipeline records."""
    sb = get_supabase()

    # 1. Insert pipeline_companies
    company_result = sb.table("pipeline_companies").insert({
        "name": req.company_name,
        "website": req.website_url,
        "industry": req.industry,
        "revenue_range": req.revenue_range,
        "employee_count": req.employee_count,
        "source": "Website — Inbound",
    }).execute()
    company_id = company_result.data[0]["id"]

    # 2. Insert pipeline_contacts (primary contact)
    contact_result = sb.table("pipeline_contacts").insert({
        "company_id": company_id,
        "name": req.primary_contact_name,
        "email": req.primary_contact_email,
        "phone": req.primary_contact_phone,
        "title": "Decision Maker",
        "is_decision_maker": True,
        "source": "Website — Inbound",
    }).execute()
    contact_id = contact_result.data[0]["id"]

    # 3. Build interview_contacts_json
    contacts_json = None
    if req.interview_contacts:
        contacts_json = [
            {
                "name": c.name,
                "title": c.title,
                "email": c.email,
                "phone": c.phone,
                "linkedin_url": c.linkedin_url,
            }
            for c in req.interview_contacts
        ]

    # 4. Insert pipeline_opportunities
    opp_result = sb.table("pipeline_opportunities").insert({
        "company_id": company_id,
        "primary_contact_id": contact_id,
        "title": f"{req.company_name} — Diagnostic",
        "stage": "discovery_scheduled",
        "source": "Website — Inbound",
        "notes": req.pain_points,
        "interview_contacts_json": json.dumps(contacts_json) if contacts_json else None,
        "assigned_to": "George DeVries",
    }).execute()
    opp = opp_result.data[0]
    opp_id = opp["id"]

    # 5. Log pipeline activity
    sb.table("pipeline_activities").insert({
        "opportunity_id": opp_id,
        "company_id": company_id,
        "contact_id": contact_id,
        "type": "note",
        "subject": "Website intake form submitted",
        "body": f"Source: Website — Inbound. Industry: {req.industry or '—'}. Revenue: {req.revenue_range or '—'}.",
    }).execute()

    # 6. Send partner notification (non-blocking)
    try:
        from services.email_service import get_email_service
        email_svc = get_email_service()
        email_svc.send_website_intake_notification(
            company_name=req.company_name,
            contact_name=req.primary_contact_name,
            contact_email=req.primary_contact_email,
            industry=req.industry,
            revenue_range=req.revenue_range,
            pain_points=req.pain_points,
            source="Website — Inbound",
        )
    except Exception as e:
        logger.error(f"Website intake notification failed (non-blocking): {e}")

    logger.info(f"Website intake: company={company_id} contact={contact_id} opp={opp_id}")

    return WebsiteIntakeResponse(
        success=True,
        company_id=company_id,
        contact_id=contact_id,
        opportunity_id=opp_id,
    )


# ==========================================================================
# Discovery Scheduling & NDA Confirmation
# ==========================================================================

@router.post("/opportunities/{opp_id}/schedule-discovery")
async def schedule_discovery(opp_id: str, user: dict = Depends(verify_partner_auth)):
    """Send Calendly scheduling link to primary contact, move to discovery_scheduled."""
    sb = get_supabase()
    opp = sb.table("pipeline_opportunities").select("*").eq("id", opp_id).eq("is_deleted", False).execute()
    if not opp.data:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp = opp.data[0]

    if opp["stage"] != "contacted":
        raise HTTPException(status_code=400, detail=f"Stage must be 'contacted' (current: '{opp['stage']}')")

    if not opp.get("primary_contact_id"):
        raise HTTPException(status_code=400, detail="Opportunity must have a primary contact")

    contact = sb.table("pipeline_contacts").select("*").eq("id", opp["primary_contact_id"]).execute()
    if not contact.data or not contact.data[0].get("email"):
        raise HTTPException(status_code=400, detail="Primary contact must have an email address")
    contact = contact.data[0]

    company = sb.table("pipeline_companies").select("name").eq("id", opp["company_id"]).execute()
    company_name = company.data[0]["name"] if company.data else "Unknown"

    from services.email_service import get_email_service

    # Get the opportunity's schedule_token for the schedule page URL
    token = opp.get("schedule_token")
    if not token:
        raise HTTPException(status_code=500, detail="Opportunity missing confirmation token")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    schedule_url = f"{frontend_url}/schedule/{token}"

    email_svc = get_email_service()
    email_result = email_svc.send_discovery_scheduling_link(
        to_email=contact["email"],
        contact_name=contact["name"],
        company_name=company_name,
        scheduling_link=schedule_url,
        partner_lead=opp.get("assigned_to") or "George DeVries",
    )

    sb.table("pipeline_opportunities").update({
        "stage": "discovery_scheduled",
    }).eq("id", opp_id).execute()

    logger.info(f"Discovery schedule link sent for opp {opp_id} to {contact['email']}")
    return {"success": True, "email_result": email_result}


@router.get("/schedule/{token}")
async def get_schedule_page(token: str):
    """Public endpoint — return schedule page data for the prospect."""
    sb = get_supabase()
    opp = (
        sb.table("pipeline_opportunities")
        .select("id, title, stage, calendly_booking_time, company_id, primary_contact_id, assigned_to")
        .eq("schedule_token", token)
        .eq("is_deleted", False)
        .execute()
    )
    if not opp.data:
        raise HTTPException(status_code=404, detail="Schedule link not found")
    opp = opp.data[0]

    company = sb.table("pipeline_companies").select("name").eq("id", opp["company_id"]).execute()
    company_name = company.data[0]["name"] if company.data else "Unknown"

    contact_name = None
    contact_email = None
    if opp.get("primary_contact_id"):
        contact = sb.table("pipeline_contacts").select("name, email").eq("id", opp["primary_contact_id"]).execute()
        if contact.data:
            contact_name = contact.data[0].get("name")
            contact_email = contact.data[0].get("email")

    # Return Calendly URL for embed
    calendly_url = os.getenv("CALENDLY_SCHEDULING_URL", "https://calendly.com/george-baxterlabs")

    return {
        "company_name": company_name,
        "contact_name": contact_name,
        "contact_email": contact_email,
        "assigned_to": opp.get("assigned_to"),
        "booking_time": opp.get("calendly_booking_time"),
        "stage": opp.get("stage"),
        "calendly_url": calendly_url,
    }


# ==========================================================================
# Agreement Sending (from Pipeline)
# ==========================================================================

@router.post("/opportunities/{opp_id}/send-agreement")
async def send_pipeline_agreement(
    opp_id: str,
    body: Optional[dict] = None,
    user: dict = Depends(verify_partner_auth),
):
    """Send engagement agreement from pipeline (before conversion)."""
    sb = get_supabase()
    opp = sb.table("pipeline_opportunities").select("*").eq("id", opp_id).eq("is_deleted", False).execute()
    if not opp.data:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp = opp.data[0]

    allowed = {"discovery_complete", "negotiation"}
    if opp["stage"] not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Stage must be discovery_complete or negotiation (current: '{opp['stage']}')",
        )

    if not opp.get("primary_contact_id"):
        raise HTTPException(status_code=400, detail="Opportunity must have a primary contact")

    contact = sb.table("pipeline_contacts").select("*").eq("id", opp["primary_contact_id"]).execute()
    if not contact.data or not contact.data[0].get("email"):
        raise HTTPException(status_code=400, detail="Primary contact must have an email address")
    contact = contact.data[0]

    company = sb.table("pipeline_companies").select("name").eq("id", opp["company_id"]).execute()
    company_name = company.data[0]["name"] if company.data else "Unknown"

    req = body or {}
    fee = req.get("fee") or opp.get("estimated_value") or 12500
    preferred_start_date = req.get("preferred_start_date", "TBD")
    partner_lead = req.get("partner_lead") or opp.get("assigned_to") or "George DeVries"

    # Calculate end date (14 business days from start)
    end_date = "14 business days from start"
    if preferred_start_date and preferred_start_date != "TBD":
        try:
            start_dt = date.fromisoformat(preferred_start_date)
            end_dt = start_dt + timedelta(days=20)  # ~14 business days
            end_date = end_dt.isoformat()
        except (ValueError, TypeError):
            pass

    from services.docusign_service import get_docusign_service
    ds = get_docusign_service()

    if not ds._is_configured():
        raise HTTPException(status_code=503, detail="DocuSign not configured")

    result = ds.send_combined_agreements(
        opportunity_id=opp_id,
        contact_email=contact["email"],
        contact_name=contact["name"],
        company_name=company_name,
        fee=float(fee),
        start_date=preferred_start_date,
        end_date=end_date,
    )

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "DocuSign send failed"))

    sb.table("pipeline_opportunities").update({
        "agreement_envelope_id": result["envelope_id"],
        "stage": "agreement_sent",
    }).eq("id", opp_id).execute()

    logger.info(f"Pipeline agreement sent for opp {opp_id} — envelope={result['envelope_id']}")
    return {"success": True, "envelope_id": result["envelope_id"]}


# ==========================================================================
# Activities
# ==========================================================================

@router.get("/activities")
async def list_activities(
    contact_id: Optional[str] = Query(None),
    opportunity_id: Optional[str] = Query(None),
    company_id: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    outreach_channel: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = (
        sb.table("pipeline_activities")
        .select("*, pipeline_contacts(id, name, email), pipeline_companies(id, name), pipeline_opportunities(id, title)")
        .eq("is_deleted", False)
    )
    if contact_id:
        query = query.eq("contact_id", contact_id)
    if opportunity_id:
        query = query.eq("opportunity_id", opportunity_id)
    if company_id:
        query = query.eq("company_id", company_id)
    if type:
        query = query.eq("type", type)
    if status:
        query = query.eq("status", status)
    if outreach_channel:
        query = query.eq("outreach_channel", outreach_channel)
    if date_from:
        query = query.gte("occurred_at", date_from.isoformat())
    if date_to:
        query = query.lte("occurred_at", date_to.isoformat() + "T23:59:59")
    result = query.order("occurred_at", desc=True).execute()
    return {"activities": result.data, "count": len(result.data)}


@router.post("/activities")
async def create_activity(body: ActivityCreate, user: dict = Depends(verify_partner_auth)):
    if body.type not in VALID_ACTIVITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid activity type: {body.type}")
    if body.status and body.status not in VALID_ACTIVITY_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid activity status: {body.status}")
    if body.outreach_channel and body.outreach_channel not in VALID_OUTREACH_CHANNELS:
        raise HTTPException(status_code=400, detail=f"Invalid outreach channel: {body.outreach_channel}")
    sb = get_supabase()
    row = body.model_dump(exclude_none=True)
    if body.occurred_at:
        row["occurred_at"] = body.occurred_at.isoformat()
    if body.next_action_date:
        row["next_action_date"] = body.next_action_date.isoformat()
    row["created_by"] = user.get("sub")
    result = sb.table("pipeline_activities").insert(row).execute()
    activity = result.data[0]

    # Auto-create task from next_action if provided
    task_created = None
    if body.next_action:
        try:
            task_row = {
                "title": body.next_action,
                "status": "pending",
                "created_by": user.get("sub"),
            }
            if body.next_action_date:
                task_row["due_date"] = body.next_action_date.isoformat()
            if body.contact_id:
                task_row["contact_id"] = body.contact_id
            if body.opportunity_id:
                task_row["opportunity_id"] = body.opportunity_id
            task_result = sb.table("pipeline_tasks").insert(task_row).execute()
            task_created = task_result.data[0] if task_result.data else None
        except Exception as e:
            logger.warning(f"Auto-create task failed (non-blocking): {e}")

    return {"activity": activity, "task_created": task_created}


def _parse_notes(raw_notes: str) -> dict:
    """Basic text parsing for Gemini/call notes. Extracts structured fields.

    For MVP — keyword-based extraction, not Claude API.
    """
    lines = raw_notes.strip().split("\n")
    subject = lines[0].strip() if lines else "Call notes"
    # Truncate subject to something reasonable
    if len(subject) > 120:
        subject = subject[:117] + "..."

    body_parts = []
    next_action = None
    next_action_date = None
    outcome = None

    action_patterns = re.compile(
        r"(follow\s*up|next\s*step|action\s*item|to\s*do|todo|task)[:\-\s]+(.*)",
        re.IGNORECASE,
    )
    outcome_patterns = re.compile(
        r"(outcome|result|decision|conclusion)[:\-\s]+(.*)",
        re.IGNORECASE,
    )

    for line in lines[1:]:
        stripped = line.strip()
        if not stripped:
            continue

        action_match = action_patterns.search(stripped)
        if action_match and not next_action:
            next_action = action_match.group(2).strip()
            continue

        outcome_match = outcome_patterns.search(stripped)
        if outcome_match and not outcome:
            outcome = outcome_match.group(2).strip()
            continue

        body_parts.append(stripped)

    # Try to extract a date from next_action text
    if next_action:
        next_action_date = _extract_date(next_action)

    return {
        "subject": subject,
        "body": "\n".join(body_parts) if body_parts else None,
        "outcome": outcome,
        "next_action": next_action,
        "next_action_date": next_action_date,
    }


def _extract_date(text: str) -> Optional[str]:
    """Best-effort date extraction from natural language phrases."""
    today = date.today()
    text_lower = text.lower()

    # Explicit dates like "March 5", "Feb 14", "2026-03-05"
    iso_match = re.search(r"\d{4}-\d{2}-\d{2}", text)
    if iso_match:
        return iso_match.group(0)

    month_day = re.search(
        r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
        r"jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
        r"\s+(\d{1,2})",
        text_lower,
    )
    if month_day:
        month_names = {
            "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
            "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
            "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "september": 9,
            "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
        }
        month = month_names.get(month_day.group(1))
        day = int(month_day.group(2))
        if month and 1 <= day <= 31:
            year = today.year if month >= today.month else today.year + 1
            try:
                return date(year, month, day).isoformat()
            except ValueError:
                pass

    # Relative day names
    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for i, day_name in enumerate(day_names):
        if day_name in text_lower:
            current_weekday = today.weekday()
            days_ahead = i - current_weekday
            if days_ahead <= 0:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).isoformat()

    # Relative phrases
    if "tomorrow" in text_lower:
        return (today + timedelta(days=1)).isoformat()
    if "next week" in text_lower:
        days_ahead = 7 - today.weekday()
        return (today + timedelta(days=days_ahead)).isoformat()

    return None


@router.post("/activities/from-notes")
async def create_activity_from_notes(body: ActivityFromNotesInput, user: dict = Depends(verify_partner_auth)):
    """Parse raw call/meeting notes into a structured activity record."""
    sb = get_supabase()
    parsed = _parse_notes(body.raw_notes)

    # Resolve company_id from contact if not directly available
    company_id = None
    if body.contact_id:
        contact = sb.table("pipeline_contacts").select("company_id").eq("id", body.contact_id).execute()
        if contact.data and contact.data[0].get("company_id"):
            company_id = contact.data[0]["company_id"]

    row = {
        "type": "video_call",
        "subject": parsed["subject"],
        "body": parsed["body"],
        "outcome": parsed["outcome"],
        "next_action": parsed["next_action"],
        "next_action_date": parsed["next_action_date"],
        "gemini_raw_notes": body.raw_notes,
        "created_by": user.get("sub"),
    }
    if body.contact_id:
        row["contact_id"] = body.contact_id
    if body.opportunity_id:
        row["opportunity_id"] = body.opportunity_id
    if company_id:
        row["company_id"] = company_id
    if body.occurred_at:
        row["occurred_at"] = body.occurred_at.isoformat()

    activity_result = sb.table("pipeline_activities").insert(row).execute()
    activity = activity_result.data[0]

    # Auto-create task if next_action was extracted
    task = None
    if parsed["next_action"]:
        task_row = {
            "title": parsed["next_action"],
            "due_date": parsed["next_action_date"],
            "created_by": user.get("sub"),
        }
        if body.contact_id:
            task_row["contact_id"] = body.contact_id
        if body.opportunity_id:
            task_row["opportunity_id"] = body.opportunity_id
        task_result = sb.table("pipeline_tasks").insert(task_row).execute()
        task = task_result.data[0] if task_result.data else None

    return {
        "activity": activity,
        "task_created": task,
        "parsed_fields": parsed,
    }


@router.get("/activities/drafts")
async def list_draft_activities(
    user: dict = Depends(verify_partner_auth),
):
    """Return activities with status='draft' for the Draft Queue widget."""
    sb = get_supabase()
    result = (
        sb.table("pipeline_activities")
        .select("*, pipeline_contacts(id, name, email), pipeline_companies(id, name), pipeline_opportunities(id, title)")
        .eq("is_deleted", False)
        .eq("status", "draft")
        .order("created_at", desc=True)
        .execute()
    )
    return {"drafts": result.data, "count": len(result.data)}


@router.get("/activities/{activity_id}")
async def get_activity(activity_id: str, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    result = (
        sb.table("pipeline_activities")
        .select("*, pipeline_contacts(id, name, email), pipeline_companies(id, name), pipeline_opportunities(id, title)")
        .eq("id", activity_id)
        .eq("is_deleted", False)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Activity not found")
    return result.data[0]


@router.put("/activities/{activity_id}")
async def update_activity(activity_id: str, body: ActivityUpdate, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "type" in updates and updates["type"] not in VALID_ACTIVITY_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid activity type: {updates['type']}")
    if "status" in updates and updates["status"] not in VALID_ACTIVITY_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid activity status: {updates['status']}")
    if "outreach_channel" in updates and updates["outreach_channel"] not in VALID_OUTREACH_CHANNELS:
        raise HTTPException(status_code=400, detail=f"Invalid outreach channel: {updates['outreach_channel']}")
    if "occurred_at" in updates and isinstance(updates["occurred_at"], datetime):
        updates["occurred_at"] = updates["occurred_at"].isoformat()
    if "next_action_date" in updates and isinstance(updates["next_action_date"], date):
        updates["next_action_date"] = updates["next_action_date"].isoformat()
    result = sb.table("pipeline_activities").update(updates).eq("id", activity_id).eq("is_deleted", False).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Activity not found")
    return result.data[0]


# ==========================================================================
# Tasks
# ==========================================================================

@router.get("/tasks")
async def list_tasks(
    status: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    due_before: Optional[date] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = (
        sb.table("pipeline_tasks")
        .select("*, pipeline_companies(id, name), pipeline_contacts(id, name, email), pipeline_opportunities(id, title, stage)")
    )
    if status:
        query = query.eq("status", status)
    if assigned_to:
        query = query.eq("assigned_to", assigned_to)
    if due_before:
        query = query.lte("due_date", due_before.isoformat())
    result = query.order("due_date").execute()
    return {"tasks": result.data, "count": len(result.data)}


@router.post("/tasks")
async def create_task(body: TaskCreate, user: dict = Depends(verify_partner_auth)):
    if body.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"Invalid priority: {body.priority}")
    if body.task_type not in VALID_TASK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid task_type: {body.task_type}")
    sb = get_supabase()
    row = body.model_dump(exclude_none=True)
    if body.due_date:
        row["due_date"] = body.due_date.isoformat()
    row["created_by"] = user.get("sub")
    result = sb.table("pipeline_tasks").insert(row).execute()
    return result.data[0]


@router.put("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "priority" in updates and updates["priority"] not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"Invalid priority: {updates['priority']}")
    if "status" in updates and updates["status"] not in VALID_TASK_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {updates['status']}")
    if "task_type" in updates and updates["task_type"] not in VALID_TASK_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid task_type: {updates['task_type']}")
    if "due_date" in updates and isinstance(updates["due_date"], date):
        updates["due_date"] = updates["due_date"].isoformat()
    # Set completed_at when marking complete
    if updates.get("status") == "complete":
        updates["completed_at"] = datetime.utcnow().isoformat()
    result = sb.table("pipeline_tasks").update(updates).eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return result.data[0]


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    result = sb.table("pipeline_tasks").delete().eq("id", task_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}


@router.get("/tasks/cockpit")
async def get_task_cockpit(user: dict = Depends(verify_partner_auth)):
    """Tasks organized for the Overview page morning cockpit."""
    sb = get_supabase()
    today = date.today()
    tomorrow = today + timedelta(days=1)
    week_end = today + timedelta(days=7)

    result = (
        sb.table("pipeline_tasks")
        .select("*, pipeline_companies(id, name), pipeline_contacts(id, name, email), pipeline_opportunities(id, title, stage)")
        .eq("status", "pending")
        .order("due_date")
        .execute()
    )
    tasks = result.data or []

    cockpit: Dict[str, Any] = {
        "overdue": [],
        "due_today": [],
        "due_tomorrow": [],
        "due_this_week": [],
        "no_date": [],
        "summary": {
            "overdue_count": 0,
            "today_count": 0,
            "tomorrow_count": 0,
            "week_count": 0,
            "by_type": {},
        },
    }

    for task in tasks:
        due_str = task.get("due_date")
        if not due_str:
            cockpit["no_date"].append(task)
        else:
            due = date.fromisoformat(due_str)
            if due < today:
                cockpit["overdue"].append(task)
            elif due == today:
                cockpit["due_today"].append(task)
            elif due == tomorrow:
                cockpit["due_tomorrow"].append(task)
            elif due <= week_end:
                cockpit["due_this_week"].append(task)

    cockpit["summary"]["overdue_count"] = len(cockpit["overdue"])
    cockpit["summary"]["today_count"] = len(cockpit["due_today"])
    cockpit["summary"]["tomorrow_count"] = len(cockpit["due_tomorrow"])
    cockpit["summary"]["week_count"] = len(cockpit["due_this_week"])

    # Count by type for actionable items (overdue + today)
    actionable = cockpit["overdue"] + cockpit["due_today"]
    by_type: Dict[str, int] = {}
    for task in actionable:
        t = task.get("task_type", "other")
        by_type[t] = by_type.get(t, 0) + 1
    cockpit["summary"]["by_type"] = by_type

    return cockpit


# ==========================================================================
# Stats
# ==========================================================================

@router.get("/stats")
async def pipeline_stats(user: dict = Depends(verify_partner_auth)):
    """Pipeline summary: opportunity counts by stage, total value, task counts."""
    sb = get_supabase()

    # Opportunities by stage (include company_id for type breakdown)
    opps = sb.table("pipeline_opportunities").select("stage, estimated_value, company_id").eq("is_deleted", False).execute()
    stage_counts = {}
    total_value = 0.0
    for opp in opps.data:
        stage = opp["stage"]
        stage_counts[stage] = stage_counts.get(stage, 0) + 1
        if opp.get("estimated_value") and stage not in ("lost", "dormant"):
            total_value += float(opp["estimated_value"])

    # Build company_type map for by_type breakdown
    opp_company_ids = list({opp["company_id"] for opp in opps.data if opp.get("company_id")})
    company_type_map = {}
    if opp_company_ids:
        companies_result = (
            sb.table("pipeline_companies")
            .select("id, company_type")
            .eq("is_deleted", False)
            .in_("id", opp_company_ids)
            .execute()
        )
        for c in companies_result.data:
            company_type_map[c["id"]] = c.get("company_type") or "prospect"

    # Build by_type breakdown
    by_type = {}
    for ctype in VALID_COMPANY_TYPES:
        by_type[ctype] = {"stage_counts": {}, "total_value": 0.0, "count": 0}

    for opp in opps.data:
        ctype = company_type_map.get(opp.get("company_id", ""), "prospect")
        if ctype not in by_type:
            ctype = "prospect"
        by_type[ctype]["count"] += 1
        stage = opp["stage"]
        by_type[ctype]["stage_counts"][stage] = by_type[ctype]["stage_counts"].get(stage, 0) + 1
        if opp.get("estimated_value") and stage not in ("lost", "dormant", "partner_dormant"):
            by_type[ctype]["total_value"] += float(opp["estimated_value"])

    # Tasks due today
    today_str = date.today().isoformat()
    tasks_today = (
        sb.table("pipeline_tasks")
        .select("id", count="exact")
        .eq("status", "pending")
        .eq("due_date", today_str)
        .execute()
    )

    # Overdue tasks
    tasks_overdue = (
        sb.table("pipeline_tasks")
        .select("id", count="exact")
        .eq("status", "pending")
        .lt("due_date", today_str)
        .execute()
    )

    # Recent activities
    recent = (
        sb.table("pipeline_activities")
        .select("id, type, subject, occurred_at, pipeline_contacts(id, name), pipeline_companies(id, name)")
        .eq("is_deleted", False)
        .order("occurred_at", desc=True)
        .limit(5)
        .execute()
    )

    # Referral stats
    referral_opps = (
        sb.table("pipeline_opportunities")
        .select("stage, estimated_value")
        .eq("is_deleted", False)
        .not_.is_("referred_by_engagement_id", "null")
        .execute()
    )
    referral_total = len(referral_opps.data)
    referral_value = sum(float(r.get("estimated_value") or 0) for r in referral_opps.data)
    referral_won = sum(1 for r in referral_opps.data if r["stage"] == "won")
    referral_rate = (referral_won / referral_total * 100) if referral_total > 0 else 0

    # Tier distribution (contacts)
    tier_contacts = (
        sb.table("pipeline_contacts")
        .select("lead_tier")
        .eq("is_deleted", False)
        .not_.is_("lead_tier", "null")
        .execute()
    )
    tier_distribution = {"tier_1": 0, "tier_2": 0, "tier_3": 0}
    for c in tier_contacts.data:
        tier = c.get("lead_tier")
        if tier in tier_distribution:
            tier_distribution[tier] += 1

    return {
        "stage_counts": stage_counts,
        "total_pipeline_value": total_value,
        "total_opportunities": len(opps.data),
        "tasks_due_today": tasks_today.count or 0,
        "tasks_overdue": tasks_overdue.count or 0,
        "recent_activities": recent.data,
        "referrals": {
            "total_opportunities": referral_total,
            "total_value": referral_value,
            "won": referral_won,
            "conversion_rate": round(referral_rate, 1),
        },
        "by_type": by_type,
        "tier_distribution": tier_distribution,
    }


@router.get("/analytics")
async def pipeline_analytics(
    user: dict = Depends(verify_partner_auth),
):
    """Return pipeline analytics: weekly scorecard, stage funnel, activity trends."""
    sb = get_supabase()
    today = date.today()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # Weekly scorecard — activities this week
    week_acts = (
        sb.table("pipeline_activities")
        .select("type, outreach_channel")
        .eq("is_deleted", False)
        .gte("occurred_at", week_ago.isoformat())
        .execute()
    )
    weekly_activity_count = len(week_acts.data)
    weekly_by_type: Dict[str, int] = {}
    weekly_by_channel: Dict[str, int] = {}
    for a in week_acts.data:
        t = a.get("type", "other")
        weekly_by_type[t] = weekly_by_type.get(t, 0) + 1
        ch = a.get("outreach_channel")
        if ch:
            weekly_by_channel[ch] = weekly_by_channel.get(ch, 0) + 1

    # New companies & contacts this week
    week_companies = (
        sb.table("pipeline_companies")
        .select("id", count="exact")
        .eq("is_deleted", False)
        .gte("created_at", week_ago.isoformat())
        .execute()
    )
    week_contacts = (
        sb.table("pipeline_contacts")
        .select("id", count="exact")
        .eq("is_deleted", False)
        .gte("created_at", week_ago.isoformat())
        .execute()
    )

    # Stage funnel — current opportunity counts by stage
    all_opps = (
        sb.table("pipeline_opportunities")
        .select("stage, estimated_value")
        .eq("is_deleted", False)
        .execute()
    )
    funnel: Dict[str, dict] = {}
    for opp in all_opps.data:
        stage = opp["stage"]
        if stage not in funnel:
            funnel[stage] = {"count": 0, "value": 0.0}
        funnel[stage]["count"] += 1
        funnel[stage]["value"] += float(opp.get("estimated_value") or 0)

    # Stage transitions this week (from pipeline_stage_transitions)
    transitions_this_week = (
        sb.table("pipeline_stage_transitions")
        .select("from_stage, to_stage")
        .gte("transitioned_at", week_ago.isoformat())
        .execute()
    )
    transition_summary: Dict[str, int] = {}
    for t in transitions_this_week.data:
        key = f"{t.get('from_stage', '?')} -> {t['to_stage']}"
        transition_summary[key] = transition_summary.get(key, 0) + 1

    # Activity trends — daily counts for last 30 days
    month_acts = (
        sb.table("pipeline_activities")
        .select("occurred_at, type")
        .eq("is_deleted", False)
        .gte("occurred_at", month_ago.isoformat())
        .order("occurred_at")
        .execute()
    )
    daily_counts: Dict[str, int] = {}
    for a in month_acts.data:
        day = a["occurred_at"][:10]  # YYYY-MM-DD
        daily_counts[day] = daily_counts.get(day, 0) + 1

    return {
        "weekly_scorecard": {
            "total_activities": weekly_activity_count,
            "by_type": weekly_by_type,
            "by_channel": weekly_by_channel,
            "new_companies": week_companies.count or 0,
            "new_contacts": week_contacts.count or 0,
            "stage_transitions": len(transitions_this_week.data),
        },
        "stage_funnel": funnel,
        "transition_summary": transition_summary,
        "activity_trends": daily_counts,
    }


# ==========================================================================
# Pre-Engagement Follow-Up Queue
# ==========================================================================

PRE_ENGAGEMENT_STAGES = {
    "identified", "contacted", "discovery_scheduled",
    "discovery_complete", "negotiation", "agreement_sent",
    "partner_identified", "partner_researched", "partner_outreach",
    "relationship_building",
}


@router.get("/follow-up-queue")
async def pipeline_follow_up_queue(
    user: dict = Depends(verify_partner_auth),
):
    """Return pipeline follow-ups: pending tasks and activities with next_action_date."""
    sb = get_supabase()
    today = date.today().isoformat()
    horizon = (date.today() + timedelta(days=14)).isoformat()

    # Pending tasks due within 14 days or overdue
    tasks_result = (
        sb.table("pipeline_tasks")
        .select("*, pipeline_contacts(id, name), pipeline_opportunities(id, title, stage, pipeline_companies!pipeline_opportunities_company_id_fkey(id, name))")
        .eq("status", "pending")
        .lte("due_date", horizon)
        .order("due_date")
        .execute()
    )

    # Activities with next_action_date due within 14 days or overdue
    acts_result = (
        sb.table("pipeline_activities")
        .select("id, subject, next_action, next_action_date, type, pipeline_contacts(id, name), pipeline_companies(id, name), pipeline_opportunities(id, title, stage)")
        .eq("is_deleted", False)
        .not_.is_("next_action_date", "null")
        .not_.is_("next_action", "null")
        .lte("next_action_date", horizon)
        .order("next_action_date")
        .execute()
    )

    items: List[Dict[str, Any]] = []

    for t in tasks_result.data:
        due = t.get("due_date")
        is_overdue = due and due < today
        opp = t.get("pipeline_opportunities")
        items.append({
            "id": t["id"],
            "source": "task",
            "title": t["title"],
            "due_date": due,
            "is_overdue": is_overdue,
            "priority": t.get("priority", "normal"),
            "contact": t.get("pipeline_contacts"),
            "company": opp.get("pipeline_companies") if opp else None,
            "opportunity": {"id": opp["id"], "title": opp["title"], "stage": opp["stage"]} if opp else None,
        })

    for a in acts_result.data:
        due = a.get("next_action_date")
        is_overdue = due and due < today
        items.append({
            "id": a["id"],
            "source": "activity",
            "title": a.get("next_action") or a["subject"],
            "due_date": due,
            "is_overdue": is_overdue,
            "priority": "normal",
            "contact": a.get("pipeline_contacts"),
            "company": a.get("pipeline_companies"),
            "opportunity": a.get("pipeline_opportunities"),
        })

    # Sort by due_date, overdue first
    items.sort(key=lambda x: (not x["is_overdue"], x["due_date"] or "9999-12-31"))

    overdue_count = sum(1 for i in items if i["is_overdue"])
    return {
        "items": items,
        "count": len(items),
        "overdue_count": overdue_count,
    }


# ==========================================================================
# Bulk Prospect Import
# ==========================================================================

_COMPANY_SUFFIX_RE = re.compile(
    r",?\s*\b(inc\.?|llc\.?|corp\.?|ltd\.?|co\.?|l\.?p\.?|plc\.?|gmbh)\s*$",
    re.IGNORECASE,
)


def _normalize_company(name: str) -> str:
    """Lower-case, strip whitespace, remove common legal suffixes."""
    return _COMPANY_SUFFIX_RE.sub("", name.strip()).strip().lower()


def _extract_domain(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    url = url.strip().lower()
    # Strip protocol
    for prefix in ("https://", "http://", "www."):
        if url.startswith(prefix):
            url = url[len(prefix):]
    return url.split("/")[0] or None


CSV_COLUMNS = [
    "company_name", "website", "industry", "revenue_range",
    "employee_count", "location",
    "contact_name", "contact_title", "contact_email",
    "contact_phone", "contact_linkedin_url",
    "lead_tier", "is_decision_maker",
]


@router.post("/bulk-import/parse-csv")
async def parse_csv_for_import(
    file: UploadFile = File(...),
    user: dict = Depends(verify_partner_auth),
) -> Dict[str, Any]:
    """Parse a CSV file and return grouped preview data for confirmation."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "File must be a .csv")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")  # handles BOM
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(400, "CSV has no header row")

    # Normalise header names (lowercase, strip spaces)
    clean_fields = [f.strip().lower().replace(" ", "_") for f in reader.fieldnames]

    if "company_name" not in clean_fields:
        raise HTTPException(400, "CSV must have a 'company_name' column")

    # Fetch existing companies for dedup
    sb = get_supabase()
    existing_companies = (
        sb.table("pipeline_companies")
        .select("id, name, website")
        .eq("is_deleted", False)
        .execute()
    )
    # Build lookup: normalised_name -> company, domain -> company
    name_lookup: Dict[str, dict] = {}
    domain_lookup: Dict[str, dict] = {}
    for c in existing_companies.data:
        name_lookup[_normalize_company(c["name"])] = c
        d = _extract_domain(c.get("website"))
        if d:
            domain_lookup[d] = c

    # Group rows by company
    groups: Dict[str, dict] = {}  # group_key -> { company_data, contacts[], existing_id? }
    warnings: List[str] = []
    row_count = 0

    for raw_row in reader:
        row_count += 1
        # Remap to clean field names
        row: Dict[str, str] = {}
        for orig_key, clean_key in zip(reader.fieldnames, clean_fields):
            row[clean_key] = (raw_row.get(orig_key) or "").strip()

        company_name = row.get("company_name", "").strip()
        if not company_name:
            warnings.append(f"Row {row_count}: missing company_name, skipped")
            continue

        norm_name = _normalize_company(company_name)
        domain = _extract_domain(row.get("website"))

        # Dedup: check existing DB first, then within-file grouping
        existing = name_lookup.get(norm_name)
        if not existing and domain:
            existing = domain_lookup.get(domain)

        group_key = norm_name
        if existing:
            group_key = _normalize_company(existing["name"])

        if group_key not in groups:
            groups[group_key] = {
                "company": {
                    "name": company_name,
                    "website": row.get("website") or None,
                    "industry": row.get("industry") or None,
                    "revenue_range": row.get("revenue_range") or None,
                    "employee_count": row.get("employee_count") or None,
                    "location": row.get("location") or None,
                },
                "contacts": [],
                "existing_company_id": existing["id"] if existing else None,
                "is_duplicate": bool(existing),
            }

        # Contact (optional — company-only rows have no contact_name)
        contact_name = row.get("contact_name", "").strip()
        if contact_name:
            tier = row.get("lead_tier", "").strip().lower()
            if tier and tier not in VALID_LEAD_TIERS:
                warnings.append(f"Row {row_count}: invalid lead_tier '{tier}', cleared")
                tier = ""
            dm_raw = row.get("is_decision_maker", "").strip().lower()
            is_dm = dm_raw in ("true", "yes", "1", "y")
            groups[group_key]["contacts"].append({
                "name": contact_name,
                "title": row.get("contact_title") or None,
                "email": row.get("contact_email") or None,
                "phone": row.get("contact_phone") or None,
                "linkedin_url": row.get("contact_linkedin_url") or None,
                "lead_tier": tier or None,
                "is_decision_maker": is_dm,
            })

    preview = list(groups.values())
    new_count = sum(1 for g in preview if not g["is_duplicate"])
    dup_count = sum(1 for g in preview if g["is_duplicate"])
    contact_count = sum(len(g["contacts"]) for g in preview)

    return {
        "rows_parsed": row_count,
        "companies": len(preview),
        "new_companies": new_count,
        "duplicate_companies": dup_count,
        "contacts": contact_count,
        "warnings": warnings,
        "preview": preview,
    }


@router.post("/bulk-import")
async def bulk_import(
    payload: Dict[str, Any],
    user: dict = Depends(verify_partner_auth),
) -> Dict[str, Any]:
    """Create companies, contacts, and opportunities from validated preview data."""
    groups: List[dict] = payload.get("groups", [])
    if not groups:
        raise HTTPException(400, "No groups to import")

    sb = get_supabase()
    created_companies = 0
    created_contacts = 0
    created_opportunities = 0
    skipped_duplicates = 0
    errors: List[str] = []

    for idx, group in enumerate(groups):
        try:
            company_data = group.get("company", {})
            contacts = group.get("contacts", [])
            existing_id = group.get("existing_company_id")

            # Company
            if existing_id:
                company_id = existing_id
                skipped_duplicates += 1
            else:
                company_row = {
                    "name": company_data["name"],
                    "website": company_data.get("website"),
                    "industry": company_data.get("industry"),
                    "revenue_range": company_data.get("revenue_range"),
                    "employee_count": company_data.get("employee_count"),
                    "location": company_data.get("location"),
                    "company_type": "prospect",
                    "source": "csv_import",
                }
                result = sb.table("pipeline_companies").insert(company_row).execute()
                company_id = result.data[0]["id"]
                created_companies += 1

            # Contacts
            first_contact_id = None
            for contact in contacts:
                contact_row = {
                    "company_id": company_id,
                    "name": contact["name"],
                    "title": contact.get("title"),
                    "email": contact.get("email"),
                    "phone": contact.get("phone"),
                    "linkedin_url": contact.get("linkedin_url"),
                    "lead_tier": contact.get("lead_tier"),
                    "is_decision_maker": contact.get("is_decision_maker", False),
                    "source": "csv_import",
                }
                c_result = sb.table("pipeline_contacts").insert(contact_row).execute()
                if first_contact_id is None:
                    first_contact_id = c_result.data[0]["id"]
                created_contacts += 1

            # Opportunity (one per company group, only for new companies)
            if not existing_id:
                opp_row = {
                    "company_id": company_id,
                    "primary_contact_id": first_contact_id,
                    "title": f"{company_data['name']} — Prospect",
                    "stage": "identified",
                }
                sb.table("pipeline_opportunities").insert(opp_row).execute()
                created_opportunities += 1

        except Exception as e:
            company_label = group.get("company", {}).get("name", f"Group {idx + 1}")
            errors.append(f"{company_label}: {str(e)}")
            logger.warning(f"Bulk import error for {company_label}: {e}")

    return {
        "created_companies": created_companies,
        "created_contacts": created_contacts,
        "created_opportunities": created_opportunities,
        "skipped_duplicates": skipped_duplicates,
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# Discovery Transcript Upload / Download
# ---------------------------------------------------------------------------

TRANSCRIPT_EXTENSIONS = {".docx", ".doc", ".pdf", ".txt", ".md", ".rtf"}
TRANSCRIPT_MAX_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/companies/{company_id}/transcript")
async def upload_discovery_transcript(
    company_id: str,
    file: UploadFile = File(...),
    google_doc_url: Optional[str] = Form(None),
    user: dict = Depends(verify_partner_auth),
):
    """Upload a discovery call transcript for a pipeline company."""
    sb = get_supabase()

    # Verify company exists
    company = (
        sb.table("pipeline_companies")
        .select("id, name, enrichment_data")
        .eq("id", company_id)
        .eq("is_deleted", False)
        .execute()
    )
    if not company.data:
        raise HTTPException(status_code=404, detail="Company not found")

    comp = company.data[0]

    # Validate file
    filename = file.filename or "transcript"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in TRANSCRIPT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Accepted: {', '.join(sorted(TRANSCRIPT_EXTENSIONS))}",
        )

    content = await file.read()
    if len(content) > TRANSCRIPT_MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50 MB limit.")

    # Build storage path
    timestamp = int(datetime.utcnow().timestamp())
    storage_path = f"pipeline/{company_id}/transcripts/discovery_{timestamp}{ext}"

    # Delete old transcript file if replacing
    existing_ed = comp.get("enrichment_data") or {}
    old_transcript = existing_ed.get("discovery_transcript")
    if old_transcript and old_transcript.get("storage_path"):
        try:
            sb.storage.from_("engagements").remove([old_transcript["storage_path"]])
        except Exception as e:
            logger.warning(f"Failed to delete old transcript: {e}")

    # Upload to storage
    sb.storage.from_("engagements").upload(
        storage_path, content, {"content-type": file.content_type or "application/octet-stream"}
    )

    # Build discovery_transcript metadata
    transcript_meta: Dict[str, Any] = {
        "storage_path": storage_path,
        "original_filename": filename,
        "uploaded_at": datetime.utcnow().isoformat(),
        "file_size": len(content),
        "summary": None,
    }
    if google_doc_url:
        transcript_meta["google_doc_url"] = google_doc_url

    # Merge into enrichment_data
    updated_ed = {**existing_ed, "discovery_transcript": transcript_meta}

    result = (
        sb.table("pipeline_companies")
        .update({"enrichment_data": updated_ed})
        .eq("id", company_id)
        .execute()
    )

    # Log pipeline activity
    sb.table("pipeline_activities").insert({
        "company_id": company_id,
        "type": "note",
        "subject": "Discovery transcript uploaded",
        "body": f"File: {filename} ({len(content)} bytes)",
        "created_by": user.get("sub"),
    }).execute()

    return result.data[0]


@router.get("/companies/{company_id}/transcript/download")
async def download_discovery_transcript(
    company_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Generate a signed download URL for a company's discovery transcript."""
    sb = get_supabase()

    company = (
        sb.table("pipeline_companies")
        .select("enrichment_data")
        .eq("id", company_id)
        .eq("is_deleted", False)
        .execute()
    )
    if not company.data:
        raise HTTPException(status_code=404, detail="Company not found")

    ed = company.data[0].get("enrichment_data") or {}
    transcript = ed.get("discovery_transcript")
    if not transcript or not transcript.get("storage_path"):
        raise HTTPException(status_code=404, detail="No discovery transcript found")

    try:
        signed = sb.storage.from_("engagements").create_signed_url(
            transcript["storage_path"], 3600
        )
        return {
            "success": True,
            "url": signed.get("signedURL") or signed.get("signedUrl", ""),
            "filename": transcript.get("original_filename", "transcript"),
        }
    except Exception as e:
        logger.error(f"Failed to create signed URL for transcript: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate download link")


# ---------------------------------------------------------------------------
# Partners
# ---------------------------------------------------------------------------

@router.get("/partners")
async def list_partners(
    active_only: bool = True,
    user: dict = Depends(verify_partner_auth),
):
    """List all partners. Used by outreach plugin for sender info."""
    sb = get_supabase()
    query = sb.table("pipeline_partners").select(
        "id, name, email, phone, title, calendly_url, linkedin_url, signature_block, is_active"
    )
    if active_only:
        query = query.eq("is_active", True)
    result = query.order("name").execute()
    return result.data


@router.get("/partners/by-name/{name}")
async def get_partner_by_name(
    name: str,
    user: dict = Depends(verify_partner_auth),
):
    """Look up a single partner by name. Used for outreach signature assembly."""
    sb = get_supabase()
    result = (
        sb.table("pipeline_partners")
        .select("id, name, email, phone, title, calendly_url, linkedin_url, signature_block")
        .eq("name", name)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail=f"Partner '{name}' not found")
    return result.data[0]
