from __future__ import annotations

import os
import re
import logging
from datetime import date, datetime, timedelta
from typing import Optional

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
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
    "identified", "contacted", "discovery_scheduled", "nda_sent",
    "nda_signed", "discovery_complete", "negotiation", "agreement_sent",
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
}
VALID_PRIORITIES = {"high", "normal", "low"}
VALID_TASK_STATUSES = {"pending", "complete", "skipped"}
VALID_COMPANY_TYPES = {"prospect", "partner", "connector"}


# ==========================================================================
# Companies
# ==========================================================================

@router.get("/companies")
async def list_companies(
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    company_type: Optional[str] = Query(None),
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
    activities = sb.table("pipeline_activities").select("*").eq("company_id", company_id).eq("is_deleted", False).order("occurred_at", desc=True).limit(50).execute()

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
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = sb.table("pipeline_contacts").select("*, pipeline_companies(id, name)").eq("is_deleted", False)
    if search:
        query = query.ilike("name", f"%{search}%")
    if company_id:
        query = query.eq("company_id", company_id)
    result = query.order("created_at", desc=True).execute()
    return {"contacts": result.data, "count": len(result.data)}


@router.post("/contacts")
async def create_contact(body: ContactCreate, user: dict = Depends(verify_partner_auth)):
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
        .select("*, pipeline_companies(id, name), pipeline_contacts(id, name)")
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
        .select("*, pipeline_companies(id, name), pipeline_contacts(id, name)")
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
    result = sb.table("pipeline_opportunities").update(updates).eq("id", opp_id).eq("is_deleted", False).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Opportunity not found")
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

    # 5. Create engagement record — status is nda_pending (skips intake)
    engagement_row = {
        "client_id": new_client_id,
        "status": "nda_pending",
        "phase": 0,
        "fee": req.fee,
        "partner_lead": req.partner_lead,
        "discovery_notes": discovery_notes,
        "pain_points": pain_points,
        "upload_token": str(uuid.uuid4()),
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

    # 9. Trigger NDA (non-blocking)
    nda_sent = False
    logger.info(
        f"NDA trigger check — send_nda={req.send_nda} "
        f"contact={contact.get('name') if contact else None} "
        f"email={contact.get('email') if contact else None} "
        f"engagement={new_engagement_id}"
    )
    if req.send_nda and contact and contact.get("email"):
        try:
            from services.docusign_service import get_docusign_service
            ds = get_docusign_service()
            logger.info(f"DocuSign configured={ds._is_configured()} dev_mode={ds._dev_mode}")
            if ds._is_configured():
                nda_result = ds.send_nda(
                    engagement_id=new_engagement_id,
                    contact_email=contact["email"],
                    contact_name=contact["name"],
                    company_name=company["name"],
                )
                logger.info(f"NDA send result: {nda_result}")
                if nda_result.get("success"):
                    sb.table("legal_documents").insert({
                        "engagement_id": new_engagement_id,
                        "type": "nda",
                        "docusign_envelope_id": nda_result["envelope_id"],
                        "status": "sent",
                    }).execute()
                    nda_sent = True
                    logger.info(f"NDA sent for converted engagement {new_engagement_id}")
                else:
                    logger.warning(f"DocuSign NDA send failed: {nda_result.get('error')}")
            else:
                logger.info("DocuSign not configured — skipping NDA send")
        except Exception as e:
            logger.warning(f"DocuSign NDA trigger failed (non-blocking): {e}", exc_info=True)

    # 10. Log activity
    log_activity(
        engagement_id=new_engagement_id,
        actor="system",
        action="engagement_created_from_pipeline",
        details={
            "opportunity_id": opp_id,
            "company_name": company["name"],
            "primary_contact": contact["name"] if contact else None,
            "interview_contacts_count": created_contacts_count,
            "nda_sent": nda_sent,
            "fee": req.fee,
        },
    )

    logger.info(f"Converted opportunity {opp_id} → client {new_client_id}, engagement {new_engagement_id}")

    return {
        "client_id": new_client_id,
        "engagement_id": new_engagement_id,
        "nda_sent": nda_sent,
        "interview_contacts_created": created_contacts_count,
        "status": "nda_pending",
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
    nda_token = opp["nda_confirmation_token"]

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
        nda_confirmation_token=nda_token,
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

    # Get the opportunity's nda_confirmation_token for the schedule page URL
    token = opp.get("nda_confirmation_token")
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
    """Public endpoint — return schedule/NDA page data for the prospect."""
    sb = get_supabase()
    opp = (
        sb.table("pipeline_opportunities")
        .select("id, title, stage, calendly_booking_time, nda_requested_at, nda_envelope_id, company_id, primary_contact_id, assigned_to")
        .eq("nda_confirmation_token", token)
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
        "nda_already_requested": opp.get("nda_requested_at") is not None,
        "nda_already_signed": opp.get("stage") == "nda_signed",
        "stage": opp.get("stage"),
        "calendly_url": calendly_url,
    }


@router.post("/schedule/{token}/request-nda")
async def request_nda_from_schedule(token: str):
    """Public endpoint — prospect requests NDA via DocuSign from schedule page."""
    sb = get_supabase()
    opp = (
        sb.table("pipeline_opportunities")
        .select("*")
        .eq("nda_confirmation_token", token)
        .eq("is_deleted", False)
        .execute()
    )
    if not opp.data:
        raise HTTPException(status_code=404, detail="Schedule link not found")
    opp = opp.data[0]

    if opp.get("nda_requested_at"):
        raise HTTPException(status_code=400, detail="NDA has already been requested")

    if not opp.get("primary_contact_id"):
        raise HTTPException(status_code=400, detail="No primary contact on this opportunity")

    contact = sb.table("pipeline_contacts").select("*").eq("id", opp["primary_contact_id"]).execute()
    if not contact.data or not contact.data[0].get("email"):
        raise HTTPException(status_code=400, detail="Contact email missing")
    contact = contact.data[0]

    company = sb.table("pipeline_companies").select("name").eq("id", opp["company_id"]).execute()
    company_name = company.data[0]["name"] if company.data else "Unknown"

    from services.docusign_service import get_docusign_service
    ds = get_docusign_service()

    if not ds._is_configured():
        raise HTTPException(status_code=503, detail="DocuSign not configured")

    nda_result = ds.send_nda(
        engagement_id=opp["id"],  # Using opp_id — safe, only used for logging
        contact_email=contact["email"],
        contact_name=contact["name"],
        company_name=company_name,
    )

    if not nda_result.get("success"):
        raise HTTPException(status_code=502, detail=nda_result.get("error", "DocuSign send failed"))

    sb.table("pipeline_opportunities").update({
        "nda_envelope_id": nda_result["envelope_id"],
        "nda_requested_at": datetime.utcnow().isoformat(),
        "stage": "nda_sent",
    }).eq("id", opp["id"]).execute()

    logger.info(f"Pipeline NDA sent for opp {opp['id']} — envelope={nda_result['envelope_id']}")
    return {"success": True, "envelope_id": nda_result["envelope_id"]}


@router.post("/cron/check-nda-timeouts")
async def check_nda_timeouts():
    """Cron endpoint — cancel Calendly bookings where NDA wasn't requested within 24h."""
    sb = get_supabase()
    cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()

    # Find opportunities: discovery_scheduled, has booking, no NDA requested, booking > 24h ago
    stale = (
        sb.table("pipeline_opportunities")
        .select("id, calendly_event_uri")
        .eq("stage", "discovery_scheduled")
        .not_.is_("calendly_booking_time", "null")
        .is_("nda_requested_at", "null")
        .lt("calendly_booking_time", cutoff)
        .eq("is_deleted", False)
        .execute()
    )

    cancelled = 0
    for opp in stale.data:
        event_uri = opp.get("calendly_event_uri")
        if event_uri:
            from services.calendly_service import get_calendly_service
            calendly = get_calendly_service()
            # Extract event UUID from URI
            event_uuid = event_uri.rstrip("/").split("/")[-1]
            calendly.cancel_event(event_uuid, "NDA not signed within 24 hours")

        sb.table("pipeline_opportunities").update({
            "stage": "contacted",
            "calendly_event_uri": None,
            "calendly_invitee_uri": None,
            "calendly_booking_time": None,
        }).eq("id", opp["id"]).execute()
        cancelled += 1

    logger.info(f"NDA timeout check: {cancelled} bookings cancelled")
    return {"cancelled": cancelled}


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

    result = ds.send_agreement(
        engagement_id=opp_id,  # Using opp_id — safe, only used for logging
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
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    user: dict = Depends(verify_partner_auth),
):
    sb = get_supabase()
    query = (
        sb.table("pipeline_activities")
        .select("*, pipeline_contacts(id, name), pipeline_companies(id, name), pipeline_opportunities(id, title)")
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


@router.get("/activities/{activity_id}")
async def get_activity(activity_id: str, user: dict = Depends(verify_partner_auth)):
    sb = get_supabase()
    result = (
        sb.table("pipeline_activities")
        .select("*, pipeline_contacts(id, name), pipeline_companies(id, name), pipeline_opportunities(id, title)")
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
        .select("*, pipeline_contacts(id, name), pipeline_opportunities(id, title)")
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
    }
