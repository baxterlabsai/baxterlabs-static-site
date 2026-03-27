"""Router for phase_output_content — Cowork-synced phase outputs with versioning."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import anthropic
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from middleware.auth import verify_partner_auth
from services.supabase_client import get_supabase, get_engagement_by_id, log_activity
from services.pdf_converter import convert_phase_output_to_pdf

logger = logging.getLogger("baxterlabs.phase_output_content")

router = APIRouter(prefix="/api", tags=["phase_output_content"])

ALLOWED_BINARY = {".docx", ".xlsx", ".pptx"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class UpsertMdBody(BaseModel):
    phase_number: int
    output_name: str
    content_md: str


class PatchOutputBody(BaseModel):
    pdf_approved: Optional[bool] = None
    status: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/engagements/{engagement_id}/phase-output-content")
async def upsert_output(
    engagement_id: str,
    body: UpsertMdBody,
    user: dict = Depends(verify_partner_auth),
):
    """Upsert a markdown phase output. Auto-increments version if output_name exists."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    sb = get_supabase()

    # Find latest version for this output_name
    existing = (
        sb.table("phase_output_content")
        .select("id, version, content_md")
        .eq("engagement_id", engagement_id)
        .eq("phase_number", body.phase_number)
        .eq("output_name", body.output_name)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )

    if existing.data:
        prev = existing.data[0]
        # If content is identical, just return existing
        if prev.get("content_md") == body.content_md:
            return {"success": True, "action": "unchanged", "id": prev["id"], "version": prev["version"]}

        new_version = prev["version"] + 1
    else:
        new_version = 1

    row = {
        "engagement_id": engagement_id,
        "phase_number": body.phase_number,
        "output_name": body.output_name,
        "output_type": "md",
        "content_md": body.content_md,
        "version": new_version,
        "status": "draft",
    }
    result = sb.table("phase_output_content").insert(row).execute()
    created = result.data[0] if result.data else row

    log_activity(engagement_id, "system", "phase_output_synced", {
        "output_name": body.output_name,
        "phase_number": body.phase_number,
        "version": new_version,
        "type": "md",
    })

    return {"success": True, "action": "created", "id": created.get("id"), "version": new_version}


@router.post("/engagements/{engagement_id}/phase-output-content/binary")
async def upsert_binary_output(
    engagement_id: str,
    phase_number: int = Form(...),
    output_name: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(verify_partner_auth),
):
    """Upsert a binary phase output (docx/xlsx/pptx). Auto-increments version."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_BINARY:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_BINARY))}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 50MB limit.")

    sb = get_supabase()

    # Find latest version
    existing = (
        sb.table("phase_output_content")
        .select("id, version")
        .eq("engagement_id", engagement_id)
        .eq("phase_number", phase_number)
        .eq("output_name", output_name)
        .order("version", desc=True)
        .limit(1)
        .execute()
    )
    new_version = (existing.data[0]["version"] + 1) if existing.data else 1

    # Upload to storage
    safe_name = output_name.replace(" ", "_").replace("/", "_")
    output_type = ext.lstrip(".")
    storage_path = f"{engagement_id}/phase-outputs/{safe_name}_v{new_version}{ext}"

    try:
        sb.storage.from_("engagements").upload(
            storage_path, content,
            {"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {e}")

    # Convert to PDF
    pdf_path = await convert_phase_output_to_pdf(
        sb, storage_path, engagement_id, output_name, new_version,
    )

    row = {
        "engagement_id": engagement_id,
        "phase_number": phase_number,
        "output_name": output_name,
        "output_type": output_type,
        "storage_path": storage_path,
        "pdf_storage_path": pdf_path,
        "version": new_version,
        "status": "draft",
    }
    result = sb.table("phase_output_content").insert(row).execute()
    created = result.data[0] if result.data else row

    log_activity(engagement_id, "system", "phase_output_synced", {
        "output_name": output_name,
        "phase_number": phase_number,
        "version": new_version,
        "type": output_type,
    })

    return {"success": True, "action": "created", "id": created.get("id"), "version": new_version}


@router.get("/engagements/{engagement_id}/phase-output-content")
async def list_outputs(
    engagement_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """List all phase output content for an engagement (latest version per output only)."""
    eng = get_engagement_by_id(engagement_id)
    if not eng:
        raise HTTPException(status_code=404, detail="Engagement not found")

    sb = get_supabase()
    result = (
        sb.table("phase_output_content")
        .select("*")
        .eq("engagement_id", engagement_id)
        .order("phase_number")
        .order("output_name")
        .order("version", desc=True)
        .execute()
    )

    # Keep only the latest version per (phase_number, output_name)
    seen = set()
    latest = []
    for row in result.data:
        key = (row["phase_number"], row["output_name"])
        if key not in seen:
            seen.add(key)
            # Supabase storage paths — always sign
            for path_field in ("storage_path", "pdf_storage_path"):
                val = row.get(path_field)
                if val:
                    try:
                        signed = sb.storage.from_("engagements").create_signed_url(val, 3600)
                        row[f"{path_field}_url"] = signed.get("signedURL") or signed.get("signedUrl")
                    except Exception:
                        row[f"{path_field}_url"] = None
                else:
                    row[f"{path_field}_url"] = None

            # Drive paths — pass through URLs, construct from file IDs, fallback to signing
            for path_field in ("docx_pdf_preview_path", "pdf_preview_path", "pptx_path"):
                val = row.get(path_field)
                if val:
                    if val.startswith("http://") or val.startswith("https://"):
                        row[f"{path_field}_url"] = val
                    elif "/" not in val and "." not in val:
                        # Bare Drive file ID
                        row[f"{path_field}_url"] = f"https://drive.google.com/file/d/{val}/preview"
                    else:
                        # Looks like a Supabase storage path — sign it
                        try:
                            signed = sb.storage.from_("engagements").create_signed_url(val, 3600)
                            row[f"{path_field}_url"] = signed.get("signedURL") or signed.get("signedUrl")
                        except Exception:
                            row[f"{path_field}_url"] = None
                else:
                    row[f"{path_field}_url"] = None
            latest.append(row)

    return {"outputs": latest, "count": len(latest)}


@router.get("/phase-output-content/{output_id}/versions")
async def list_versions(
    output_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """List all versions of a specific phase output (by looking up engagement_id + output_name)."""
    sb = get_supabase()

    current = sb.table("phase_output_content").select("engagement_id, phase_number, output_name").eq("id", output_id).execute()
    if not current.data:
        raise HTTPException(status_code=404, detail="Output not found")

    rec = current.data[0]
    result = (
        sb.table("phase_output_content")
        .select("id, version, status, content_md, storage_path, pdf_storage_path, created_at, updated_at")
        .eq("engagement_id", rec["engagement_id"])
        .eq("phase_number", rec["phase_number"])
        .eq("output_name", rec["output_name"])
        .order("version", desc=True)
        .execute()
    )

    # Generate signed URLs for each version
    for row in result.data:
        for path_field in ("storage_path", "pdf_storage_path"):
            if row.get(path_field):
                try:
                    signed = sb.storage.from_("engagements").create_signed_url(row[path_field], 3600)
                    row[f"{path_field}_url"] = signed.get("signedURL") or signed.get("signedUrl")
                except Exception:
                    row[f"{path_field}_url"] = None
            else:
                row[f"{path_field}_url"] = None

    return {"versions": result.data, "output_name": rec["output_name"], "phase_number": rec["phase_number"]}


@router.get("/phase-output-content/{output_id}/download")
async def download_output(
    output_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Generate a signed download URL for a phase output binary file."""
    sb = get_supabase()
    existing = sb.table("phase_output_content").select("storage_path, pdf_storage_path, output_name").eq("id", output_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Output not found")

    rec = existing.data[0]
    urls = {}
    for path_field in ("storage_path", "pdf_storage_path"):
        path = rec.get(path_field)
        if path:
            try:
                signed = sb.storage.from_("engagements").create_signed_url(path, 3600)
                urls[path_field] = signed.get("signedURL") or signed.get("signedUrl")
            except Exception:
                urls[path_field] = None

    return {"output_name": rec["output_name"], **urls}


@router.post("/phase-output-content/{output_id}/convert-pdf")
async def trigger_pdf_conversion(
    output_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Trigger server-side PDF conversion for a binary phase output."""
    sb = get_supabase()
    existing = sb.table("phase_output_content").select("*").eq("id", output_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Output not found")

    rec = existing.data[0]
    if rec["output_type"] == "md":
        raise HTTPException(status_code=400, detail="Markdown outputs do not need PDF conversion")
    if not rec.get("storage_path"):
        raise HTTPException(status_code=400, detail="No binary file uploaded yet")

    pdf_path = await convert_phase_output_to_pdf(
        sb, rec["storage_path"], rec["engagement_id"], rec["output_name"], rec["version"],
    )

    if not pdf_path:
        raise HTTPException(status_code=500, detail="PDF conversion failed")

    sb.table("phase_output_content").update({
        "pdf_storage_path": pdf_path,
    }).eq("id", output_id).execute()

    return {"success": True, "pdf_storage_path": pdf_path}


@router.put("/phase-output-content/{output_id}/approve")
async def approve_output(
    output_id: str,
    user: dict = Depends(verify_partner_auth),
):
    """Approve a phase output. For Phase 5, runs financial QC against Phase 3 workbook first."""
    sb = get_supabase()
    existing = sb.table("phase_output_content").select("*").eq("id", output_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Output not found")

    rec = existing.data[0]
    if rec["status"] != "draft":
        raise HTTPException(status_code=400, detail=f"Cannot approve output with status '{rec['status']}'. Must be 'draft'.")

    # For binary outputs, ensure PDF exists
    pdf_path = rec.get("pdf_storage_path")
    if rec["output_type"] != "md" and not pdf_path and rec.get("storage_path"):
        pdf_path = await convert_phase_output_to_pdf(
            sb, rec["storage_path"], rec["engagement_id"], rec["output_name"], rec["version"],
        )

    # --- QC check: only for Phase 5 outputs with markdown content ---
    qc_result = None
    if rec["phase_number"] == 5 and rec.get("content_md"):
        qc_result = _run_financial_qc(sb, rec)

    now_iso = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": "approved",
        "updated_at": now_iso,
    }
    if pdf_path:
        update_data["pdf_storage_path"] = pdf_path

    # If QC made corrections, write the corrected content and bump version
    if qc_result and qc_result.get("status") == "corrected" and qc_result.get("corrected_md"):
        update_data["content_md"] = qc_result["corrected_md"]
        update_data["version"] = rec["version"] + 1

    sb.table("phase_output_content").update(update_data).eq("id", output_id).execute()

    log_activity(rec["engagement_id"], "partner", "deliverable_approved", {
        "output_id": output_id,
        "output_name": rec["output_name"],
        "phase_number": rec["phase_number"],
        "version": update_data.get("version", rec["version"]),
        "qc_status": qc_result["status"] if qc_result else "skipped",
        "qc_figures_checked": qc_result.get("figures_checked", 0) if qc_result else 0,
        "qc_corrections_made": len(qc_result.get("corrections", [])) if qc_result else 0,
    })

    response = {"success": True, "status": "approved", "pdf_storage_path": pdf_path}
    if qc_result:
        response["qc_result"] = {
            "status": qc_result["status"],
            "figures_checked": qc_result.get("figures_checked", 0),
            "corrections_made": len(qc_result.get("corrections", [])),
            "corrections": qc_result.get("corrections", []),
        }
    return response


def _run_financial_qc(sb, rec: dict) -> Optional[dict]:
    """Run financial QC against Phase 3 workbook. Returns None if QC cannot run."""
    engagement_id = rec["engagement_id"]
    output_content_md = rec["content_md"]

    # Load Phase 3 approved workbook
    try:
        phase3_rows = (
            sb.table("phase_output_content")
            .select("content_md")
            .eq("engagement_id", engagement_id)
            .eq("phase_number", 3)
            .eq("status", "approved")
            .order("version", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        logger.warning("QC: failed to load Phase 3 for engagement %s: %s", engagement_id, exc)
        return None

    if not phase3_rows.data or not phase3_rows.data[0].get("content_md"):
        logger.info("QC: no approved Phase 3 workbook for engagement %s — skipping", engagement_id)
        return None

    phase3_content_md = phase3_rows.data[0]["content_md"]

    # Step 1: Compare figures
    try:
        client = anthropic.Anthropic()
        compare_response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": (
                "You are a financial QC auditor. Compare every financial figure in the OUTPUT "
                "against the SOURCE OF TRUTH.\n\n"
                f"SOURCE OF TRUTH (Phase 3 Profit Leak Workbook):\n{phase3_content_md}\n\n"
                f"OUTPUT TO CHECK:\n{output_content_md}\n\n"
                "Instructions:\n"
                "1. Extract every dollar amount, percentage, headcount, and calculated figure from both documents\n"
                "2. For each figure in the OUTPUT, find the corresponding figure in the SOURCE OF TRUTH\n"
                "3. Flag any mismatches — wrong amounts, rounding differences, missing figures that should be present\n"
                "4. For each mismatch, provide the correction\n\n"
                "Respond in JSON only, no other text:\n"
                '{\n'
                '  "status": "clean" or "corrections_needed",\n'
                '  "figures_checked": <number>,\n'
                '  "mismatches": [\n'
                '    {\n'
                '      "location": "description of where in the output",\n'
                '      "output_value": "what the output says",\n'
                '      "correct_value": "what it should say per Phase 3",\n'
                '      "type": "wrong_amount | rounding | missing | extra"\n'
                '    }\n'
                '  ]\n'
                '}'
            )}],
        )
        compare_text = compare_response.content[0].text.strip()
        # Strip markdown fences if present
        if compare_text.startswith("```"):
            compare_text = compare_text.split("\n", 1)[1] if "\n" in compare_text else compare_text[3:]
            if compare_text.endswith("```"):
                compare_text = compare_text[:-3].strip()
        comparison = json.loads(compare_text)
    except (json.JSONDecodeError, KeyError, IndexError) as exc:
        logger.warning("QC: failed to parse comparison response: %s", exc)
        return {"status": "error", "figures_checked": 0, "corrections": []}
    except Exception as exc:
        logger.warning("QC: Anthropic API error during comparison: %s", exc)
        return {"status": "error", "figures_checked": 0, "corrections": []}

    figures_checked = comparison.get("figures_checked", 0)

    if comparison.get("status") == "clean" or not comparison.get("mismatches"):
        return {"status": "clean", "figures_checked": figures_checked, "corrections": []}

    # Step 2: Auto-correct
    mismatches = comparison["mismatches"]
    try:
        correction_response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=16000,
            messages=[{"role": "user", "content": (
                "You are a financial editor. Apply these corrections to the document.\n"
                "For each correction, find the exact text containing the wrong value and "
                "replace it with the correct value.\n"
                "Do not change anything else. Preserve all formatting, citations, and structure.\n\n"
                f"CORRECTIONS TO APPLY:\n{json.dumps(mismatches)}\n\n"
                f"DOCUMENT TO CORRECT:\n{output_content_md}\n\n"
                "Return the complete corrected document. Nothing else — no preamble, "
                "no explanation, just the full corrected document."
            )}],
        )
        corrected_md = correction_response.content[0].text
    except Exception as exc:
        logger.warning("QC: Anthropic API error during correction: %s", exc)
        # Comparison found issues but correction failed — report mismatches without correcting
        return {
            "status": "error",
            "figures_checked": figures_checked,
            "corrections": [
                {"location": m["location"], "was": m["output_value"], "now": m["correct_value"]}
                for m in mismatches
            ],
        }

    return {
        "status": "corrected",
        "figures_checked": figures_checked,
        "corrections": [
            {"location": m["location"], "was": m["output_value"], "now": m["correct_value"]}
            for m in mismatches
        ],
        "corrected_md": corrected_md,
    }


@router.patch("/phase-output-content/{output_id}")
async def patch_output(
    output_id: str,
    body: PatchOutputBody,
    user: dict = Depends(verify_partner_auth),
):
    """Partial update of a phase output — supports pdf_approved and status."""
    sb = get_supabase()
    existing = sb.table("phase_output_content").select("id, engagement_id, output_name, phase_number, version").eq("id", output_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Output not found")

    rec = existing.data[0]
    update_data: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if body.pdf_approved is not None:
        update_data["pdf_approved"] = body.pdf_approved
    if body.status is not None:
        if body.status not in ("draft", "in_review", "approved", "delivered"):
            raise HTTPException(status_code=400, detail=f"Invalid status: {body.status}")
        update_data["status"] = body.status

    if len(update_data) == 1:
        raise HTTPException(status_code=400, detail="No fields to update")

    sb.table("phase_output_content").update(update_data).eq("id", output_id).execute()

    action = "phase_output_format_approved" if body.pdf_approved else "phase_output_updated"
    log_activity(rec["engagement_id"], "partner", action, {
        "output_id": output_id,
        "output_name": rec["output_name"],
        "phase_number": rec["phase_number"],
        "updates": {k: v for k, v in update_data.items() if k != "updated_at"},
    })

    return {"success": True, "id": output_id, "updated": update_data}
