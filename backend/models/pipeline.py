from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Companies
# ---------------------------------------------------------------------------

class CompanyCreate(BaseModel):
    name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    revenue_range: Optional[str] = None
    employee_count: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    revenue_range: Optional[str] = None
    employee_count: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None


# ---------------------------------------------------------------------------
# Contacts
# ---------------------------------------------------------------------------

class ContactCreate(BaseModel):
    company_id: Optional[str] = None
    name: str
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_decision_maker: bool = False
    notes: Optional[str] = None
    source: Optional[str] = None


class ContactUpdate(BaseModel):
    company_id: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_decision_maker: Optional[bool] = None
    notes: Optional[str] = None
    source: Optional[str] = None


# ---------------------------------------------------------------------------
# Opportunities
# ---------------------------------------------------------------------------

class OpportunityCreate(BaseModel):
    company_id: str
    primary_contact_id: Optional[str] = None
    title: str
    stage: str = "identified"
    estimated_value: Optional[float] = None
    estimated_close_date: Optional[date] = None
    loss_reason: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    referred_by_engagement_id: Optional[str] = None
    referred_by_contact_name: Optional[str] = None
    calendly_event_uri: Optional[str] = None
    calendly_invitee_uri: Optional[str] = None
    calendly_booking_time: Optional[datetime] = None
    nda_envelope_id: Optional[str] = None
    nda_confirmation_token: Optional[str] = None
    nda_requested_at: Optional[datetime] = None
    agreement_envelope_id: Optional[str] = None


class OpportunityUpdate(BaseModel):
    company_id: Optional[str] = None
    primary_contact_id: Optional[str] = None
    title: Optional[str] = None
    stage: Optional[str] = None
    estimated_value: Optional[float] = None
    estimated_close_date: Optional[date] = None
    loss_reason: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    referred_by_engagement_id: Optional[str] = None
    referred_by_contact_name: Optional[str] = None
    calendly_event_uri: Optional[str] = None
    calendly_invitee_uri: Optional[str] = None
    calendly_booking_time: Optional[datetime] = None
    nda_envelope_id: Optional[str] = None
    nda_confirmation_token: Optional[str] = None
    nda_requested_at: Optional[datetime] = None
    agreement_envelope_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Conversion
# ---------------------------------------------------------------------------

class InterviewContactMapping(BaseModel):
    pipeline_contact_id: str
    contact_number: int  # 1, 2, or 3


class ConversionRequest(BaseModel):
    fee: float = 12500.0
    partner_lead: str = "George DeVries"
    preferred_start_date: Optional[str] = None  # ISO date
    discovery_notes_override: Optional[str] = None
    pain_points_override: Optional[str] = None
    interview_contacts: Optional[List[InterviewContactMapping]] = None
    send_nda: bool = True
    referral_source: Optional[str] = None


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------

class ActivityCreate(BaseModel):
    contact_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    company_id: Optional[str] = None
    type: str
    subject: str
    body: Optional[str] = None
    occurred_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    outcome: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[date] = None
    gemini_raw_notes: Optional[str] = None


class ActivityUpdate(BaseModel):
    contact_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    company_id: Optional[str] = None
    type: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    occurred_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    outcome: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[date] = None
    gemini_raw_notes: Optional[str] = None


class ActivityFromNotesInput(BaseModel):
    raw_notes: str
    contact_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    occurred_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

class TaskCreate(BaseModel):
    contact_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    title: str
    due_date: Optional[date] = None
    priority: str = "normal"
    assigned_to: Optional[str] = None


class TaskUpdate(BaseModel):
    contact_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    title: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None


# ---------------------------------------------------------------------------
# Website Intake (public form → pipeline)
# ---------------------------------------------------------------------------

class WebsiteInterviewContact(BaseModel):
    name: str
    title: str
    email: str
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None


class WebsiteIntakeRequest(BaseModel):
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
    preferred_start_date: Optional[str] = None
    interview_contacts: Optional[List[WebsiteInterviewContact]] = None


class WebsiteIntakeResponse(BaseModel):
    success: bool
    nda_confirmation_token: str
    company_id: str
    contact_id: str
    opportunity_id: str
