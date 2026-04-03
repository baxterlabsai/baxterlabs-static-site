import os
import sys
import logging

from dotenv import load_dotenv

# Load environment from shared master.env
load_dotenv(os.path.expanduser("~/Projects/master.env"))

# Add backend dir to path so imports work when running from backend/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from routers import intake, engagements, docusign, upload, deliverables, research, prompts, clients, archive, users, reminders, phase_outputs, phase_output_content, pipeline, invoices, webhooks, follow_ups, onboarding, content, documents, drive_outputs, renderer, pdf_conversion
from services.supabase_client import get_supabase
from models.schemas import HealthResponse

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="BaxterLabs API",
    version="1.0.0",
    description="Backend API for BaxterLabs Advisory engagement platform",
)

# CORS — parse comma-separated ALLOWED_ORIGINS env var (set on Render)
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
if "http://localhost:5173" not in allowed_origins:
    allowed_origins.append("http://localhost:5173")
logger.info("CORS allowed_origins=%s", allowed_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
# NOTE: clients router must come before engagements so that the fixed path
# /api/engagements/calendar is matched before /api/engagements/{engagement_id}
app.include_router(intake.router)
app.include_router(clients.router)
app.include_router(engagements.router)
app.include_router(docusign.router)
app.include_router(upload.router)
app.include_router(deliverables.router)
app.include_router(research.router)
app.include_router(prompts.router)
app.include_router(archive.router)
app.include_router(users.router)
app.include_router(reminders.router)
app.include_router(phase_outputs.router)
app.include_router(phase_output_content.router)
app.include_router(pipeline.router)
app.include_router(invoices.router)
app.include_router(webhooks.router)
app.include_router(follow_ups.router)
app.include_router(onboarding.router)
app.include_router(content.router)
app.include_router(documents.router)
app.include_router(drive_outputs.router)
app.include_router(renderer.router)
app.include_router(pdf_conversion.router)

# Startup confirmation — helps verify correct code is deployed
logger.info("DocuSign webhook handler ready — XML+JSON support active")


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check — verifies API is running and Supabase is reachable."""
    supabase_ok = False
    try:
        sb = get_supabase()
        result = sb.table("clients").select("id").limit(1).execute()
        supabase_ok = True
    except Exception:
        pass
    return HealthResponse(status="ok", supabase=supabase_ok)


@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap():
    """Dynamic XML sitemap with static pages and published blog posts."""
    BASE = "https://baxterlabs.ai"

    entries = [
        (f"{BASE}/", "monthly", "0.8", ""),
        (f"{BASE}/about", "monthly", "0.8", ""),
        (f"{BASE}/blog", "weekly", "0.8", ""),
    ]

    try:
        sb = get_supabase()
        result = (
            sb.table("content_posts")
            .select("blog_slug, published_date")
            .eq("type", "blog")
            .eq("published", True)
            .order("published_date", desc=True)
            .execute()
        )
        for row in result.data:
            slug = row.get("blog_slug")
            if not slug:
                continue
            pub_date = row.get("published_date") or ""
            lastmod = pub_date[:10] if pub_date else ""
            entries.append((f"{BASE}/blog/{slug}", "never", "0.6", lastmod))
    except Exception:
        logger.warning("Sitemap: Supabase query failed, returning static pages only")

    urls = []
    for loc, freq, priority, lastmod in entries:
        parts = [f"    <loc>{loc}</loc>"]
        if lastmod:
            parts.append(f"    <lastmod>{lastmod}</lastmod>")
        parts.append(f"    <changefreq>{freq}</changefreq>")
        parts.append(f"    <priority>{priority}</priority>")
        urls.append("  <url>\n" + "\n".join(parts) + "\n  </url>")

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls) + "\n"
    xml += "</urlset>\n"

    return Response(content=xml, media_type="application/xml")
