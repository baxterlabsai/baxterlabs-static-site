from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from middleware.auth import verify_upload_token
from services.supabase_client import get_supabase, log_activity, update_engagement_status
from services.email_service import get_email_service

router = APIRouter(prefix="/api", tags=["upload"])

VALID_CATEGORIES = ("financial", "payroll", "vendor", "revenue", "operations", "legal")


@router.post("/upload/{token}")
async def upload_file(
    token: str,
    file: UploadFile = File(...),
    category: str = Form(...),
):
    """Upload a document to an engagement via token-based access."""
    engagement = await verify_upload_token(token)

    if category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(VALID_CATEGORIES)}")

    sb = get_supabase()
    email_svc = get_email_service()
    engagement_id = engagement["id"]

    # Read file
    content = await file.read()
    storage_path = f"{engagement_id}/inbox/{category}/{file.filename}"

    # Upload to Supabase Storage
    sb.storage.from_("engagements").upload(storage_path, content, {
        "content-type": file.content_type or "application/octet-stream",
    })

    # Create document record
    sb.table("documents").insert({
        "engagement_id": engagement_id,
        "category": category,
        "filename": file.filename,
        "storage_path": storage_path,
        "file_size": len(content),
    }).execute()

    log_activity(engagement_id, "client", "document_uploaded", {
        "filename": file.filename,
        "category": category,
        "size": len(content),
    })

    return {"success": True, "filename": file.filename, "category": category, "storage_path": storage_path}


@router.get("/upload/{token}/status")
async def upload_status(token: str):
    """Get upload progress for an engagement via token-based access."""
    engagement = await verify_upload_token(token)
    sb = get_supabase()
    engagement_id = engagement["id"]

    docs = sb.table("documents").select("category, filename").eq("engagement_id", engagement_id).execute()

    uploaded_by_category = {}
    for doc in docs.data:
        cat = doc["category"]
        if cat not in uploaded_by_category:
            uploaded_by_category[cat] = []
        uploaded_by_category[cat].append(doc["filename"])

    return {
        "engagement_id": engagement_id,
        "company_name": engagement.get("clients", {}).get("company_name", ""),
        "documents": uploaded_by_category,
        "total_uploaded": len(docs.data),
    }


@router.post("/upload/{token}/complete")
async def mark_upload_complete(token: str):
    """Mark document submission as complete."""
    engagement = await verify_upload_token(token)
    email_svc = get_email_service()
    engagement_id = engagement["id"]

    update_engagement_status(engagement_id, "documents_received")
    log_activity(engagement_id, "client", "upload_complete", {})

    email_svc.send_upload_complete_notification(engagement)

    return {"success": True, "message": "Document submission marked complete."}
