import os
import sys
import logging

from dotenv import load_dotenv

# Load environment from shared master.env
load_dotenv(os.path.expanduser("~/Projects/master.env"))

# Add backend dir to path so imports work when running from backend/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import intake, engagements, docusign, upload, deliverables, research, prompts, clients
from services.supabase_client import get_supabase
from models.schemas import HealthResponse

# Logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

app = FastAPI(
    title="BaxterLabs API",
    version="1.0.0",
    description="Backend API for BaxterLabs Advisory engagement platform",
)

# CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173"],
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
