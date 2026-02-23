from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional


class InterviewContactInput(BaseModel):
    name: str
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None


class IntakeFormInput(BaseModel):
    company_name: str
    primary_contact_name: str
    primary_contact_email: str
    primary_contact_phone: Optional[str] = None
    industry: Optional[str] = None
    revenue_range: Optional[str] = None
    employee_count: Optional[str] = None
    website_url: Optional[str] = None
    pain_points: Optional[str] = None
    referral_source: Optional[str] = None
    preferred_start_date: Optional[date] = None
    interview_contacts: list[InterviewContactInput] = []


class IntakeResponse(BaseModel):
    success: bool
    engagement_id: str
    client_id: str
    message: str


class EngagementResponse(BaseModel):
    id: str
    client_id: str
    status: str
    phase: int
    fee: Optional[float] = None
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    partner_lead: Optional[str] = None
    pain_points: Optional[str] = None
    debrief_complete: bool
    upload_token: str
    deliverable_token: str
    created_at: str
    updated_at: str
    clients: Optional[dict] = None


class EngagementListResponse(BaseModel):
    engagements: list[EngagementResponse]
    count: int


class HealthResponse(BaseModel):
    status: str
    supabase: bool
