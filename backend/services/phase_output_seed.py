from __future__ import annotations

from typing import List

# Complete seed data for all 23 phase outputs across 8 phases
PHASE_OUTPUTS_SEED: List[dict] = [
    # Phase 0 — Proposal & Engagement Setup
    {"phase": 0, "output_number": 1, "name": "Engagement Proposal", "file_type": "docx", "destination_folder": "00_Engagement_Info", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 0, "output_number": 2, "name": "Engagement Agreement", "file_type": "docx", "destination_folder": "00_Engagement_Info", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 0, "output_number": 3, "name": "Data Request List", "file_type": "docx", "destination_folder": "00_Engagement_Info", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    # Phase 1 — Data Intake & Financial Baseline [REVIEW GATE]
    {"phase": 1, "output_number": 1, "name": "Source Document Registry", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 1, "output_number": 2, "name": "Preliminary Findings Memo", "file_type": "docx", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 1, "output_number": 3, "name": "Data Gap Flag List", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    # Phase 2 — Leadership Interviews
    {"phase": 2, "output_number": 1, "name": "Interview Synthesis Matrix", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 2, "output_number": 2, "name": "Workflow Inefficiency Map", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 2, "output_number": 3, "name": "Updated Data Gap Resolution", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    # Phase 3 — Profit Leak Quantification [REVIEW GATE]
    {"phase": 3, "output_number": 1, "name": "Profit Leak Quantification Workbook", "file_type": "xlsx", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 3, "output_number": 2, "name": "Assumptions & Methodology Memo", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 3, "output_number": 3, "name": "Progress Update for Partners", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    # Phase 4 — Optimization Analysis
    {"phase": 4, "output_number": 1, "name": "Operational Bottleneck Analysis", "file_type": "docx", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 4, "output_number": 2, "name": "Automation & Optimization Recommendations", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 4, "output_number": 3, "name": "Implementation Prerequisites", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    # Phase 5 — Report Assembly + Retainer
    {"phase": 5, "output_number": 1, "name": "Executive Summary", "file_type": "docx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 1},
    {"phase": 5, "output_number": 2, "name": "Full Diagnostic Report", "file_type": "docx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 1},
    {"phase": 5, "output_number": 3, "name": "Presentation Deck", "file_type": "pptx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 2},
    {"phase": 5, "output_number": 4, "name": "90-Day Implementation Roadmap", "file_type": "docx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 1},
    {"phase": 5, "output_number": 5, "name": "Phase 2 Retainer Proposal", "file_type": "docx", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": 2},
    # Phase 6 — Quality Control [REVIEW GATE]
    {"phase": 6, "output_number": 1, "name": "Citation Audit Report", "file_type": "docx", "destination_folder": "05_QC", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    # Phase 7 — Engagement Close & Archive [REVIEW GATE]
    {"phase": 7, "output_number": 1, "name": "Engagement Completion Manifest", "file_type": "md", "destination_folder": "05_QC", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 7, "output_number": 2, "name": "Lessons Learned Memo", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
]

PHASE_NAMES = {
    0: "Proposal & Engagement Setup",
    1: "Data Intake & Financial Baseline",
    2: "Leadership Interviews",
    3: "Profit Leak Quantification",
    4: "Optimization Analysis",
    5: "Report Assembly + Retainer",
    6: "Quality Control",
    7: "Engagement Close & Archive",
}


def seed_phase_outputs(sb, engagement_id: str) -> int:
    """Seed all 23 phase output records for an engagement. Idempotent.

    Returns the number of records created.
    """
    existing = (
        sb.table("phase_outputs")
        .select("id")
        .eq("engagement_id", engagement_id)
        .execute()
    )
    if existing.data:
        return 0  # Already seeded

    rows = []
    for output in PHASE_OUTPUTS_SEED:
        rows.append({
            "engagement_id": engagement_id,
            "phase": output["phase"],
            "output_number": output["output_number"],
            "name": output["name"],
            "file_type": output["file_type"],
            "destination_folder": output["destination_folder"],
            "is_review_gate": output["is_review_gate"],
            "is_client_deliverable": output["is_client_deliverable"],
            "wave": output["wave"],
            "status": "pending",
        })

    result = sb.table("phase_outputs").insert(rows).execute()
    return len(result.data)
