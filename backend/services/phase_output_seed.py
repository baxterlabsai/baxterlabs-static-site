from __future__ import annotations

from typing import List

# Complete seed data for phase outputs across 9 phases (0-8)
#
# ``file_prefix`` is the exact filename prefix Cowork uses when writing files to
# Google Drive.  Cowork names files as ``{file_prefix}_{ClientName}.{ext}``.
# The Drive outputs router matches filenames by checking ``startswith(file_prefix)``.
PHASE_OUTPUTS_SEED: List[dict] = [
    # Phase 0 — Proposal & Engagement Setup
    {"phase": 0, "output_number": 1, "name": "Engagement Proposal", "file_prefix": "Engagement_Proposal", "file_type": "docx", "destination_folder": "00_Engagement_Info", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 0, "output_number": 2, "name": "Engagement Agreement", "file_prefix": "Engagement_Agreement", "file_type": "docx", "destination_folder": "00_Engagement_Info", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 0, "output_number": 3, "name": "Data Request List", "file_prefix": "Data_Request_List", "file_type": "docx", "destination_folder": "00_Engagement_Info", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    # Phase 1 — Data Intake & Financial Baseline [REVIEW GATE]
    {"phase": 1, "output_number": 1, "name": "Source Document Registry", "file_prefix": "Source_Document_Registry", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 1, "output_number": 2, "name": "Preliminary Findings Memo", "file_prefix": "Preliminary_Findings_Memo", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 1, "output_number": 3, "name": "Data Gap Flag List", "file_prefix": "Data_Gap_Flag_List", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    # Phase 2 — Leadership Interviews
    {"phase": 2, "output_number": 1, "name": "Interview Synthesis Matrix", "file_prefix": "Interview_Synthesis_Matrix", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 2, "output_number": 2, "name": "Workflow Inefficiency Map", "file_prefix": "Workflow_Inefficiency_Map", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 2, "output_number": 3, "name": "Updated Data Gap Resolution", "file_prefix": "Updated_Data_Gap_Resolution", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    # Phase 3 — Profit Leak Quantification [REVIEW GATE]
    {"phase": 3, "output_number": 1, "name": "Profit Leak Quantification Workbook", "file_prefix": "Profit_Leak_Quantification_Workbook", "file_type": "xlsx", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 3, "output_number": 2, "name": "Assumptions and Methodology Memo", "file_prefix": "Assumptions_and_Methodology_Memo", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 3, "output_number": 3, "name": "Progress Update for Partners", "file_prefix": "Progress_Update_for_Partners", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    # Phase 4 — Optimization Analysis
    {"phase": 4, "output_number": 1, "name": "Operational Bottleneck Analysis", "file_prefix": "Operational_Bottleneck_Analysis", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 4, "output_number": 2, "name": "Automation and Optimization Recommendations", "file_prefix": "Automation_and_Optimization_Recommendations", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 4, "output_number": 3, "name": "Implementation Prerequisites", "file_prefix": "Implementation_Prerequisites", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    # Phase 5 — Deliverable Content Assembly (produces markdown files)
    {"phase": 5, "output_number": 1, "name": "Executive Summary", "file_prefix": "Executive_Summary", "file_type": "md", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 5, "output_number": 2, "name": "Full Diagnostic Report", "file_prefix": "Full_Diagnostic_Report", "file_type": "md", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 5, "output_number": 3, "name": "Presentation Deck", "file_prefix": "Presentation_Deck", "file_type": "md", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 5, "output_number": 4, "name": "Implementation Roadmap", "file_prefix": "Implementation_Roadmap", "file_type": "md", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 5, "output_number": 5, "name": "Phase 2 Retainer Proposal", "file_prefix": "Phase_2_Retainer_Proposal", "file_type": "md", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    {"phase": 5, "output_number": 5, "name": "Phase 2 Retainer Proposal", "file_prefix": "Retainer_Proposal", "file_type": "md", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": False, "wave": None},
    # Phase 6 — Quality Control [REVIEW GATE]
    {"phase": 6, "output_number": 1, "name": "Citation Audit Report", "file_prefix": "Citation_Audit_Report", "file_type": "md", "destination_folder": "05_QC", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    # Phase 7 — Document Packaging (Python renderer → docx/pptx from QC-approved markdown)
    {"phase": 7, "output_number": 1, "name": "Executive Summary", "file_prefix": "Executive_Summary", "file_type": "docx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 1},
    {"phase": 7, "output_number": 2, "name": "Full Diagnostic Report", "file_prefix": "Full_Diagnostic_Report", "file_type": "docx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 1},
    {"phase": 7, "output_number": 3, "name": "Presentation Deck", "file_prefix": "Presentation_Deck", "file_type": "pptx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 2},
    {"phase": 7, "output_number": 4, "name": "Implementation Roadmap", "file_prefix": "Implementation_Roadmap", "file_type": "docx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 1},
    {"phase": 7, "output_number": 5, "name": "Phase 2 Retainer Proposal", "file_prefix": "Phase_2_Retainer_Proposal", "file_type": "docx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 2},
    {"phase": 7, "output_number": 5, "name": "Phase 2 Retainer Proposal", "file_prefix": "Retainer_Proposal", "file_type": "docx", "destination_folder": "04_Deliverables", "is_review_gate": False, "is_client_deliverable": True, "wave": 2},
    # Phase 8 — Archive & Close Engagement [REVIEW GATE]
    {"phase": 8, "output_number": 1, "name": "Engagement Completion Manifest", "file_prefix": "Engagement_Completion_Manifest", "file_type": "md", "destination_folder": "05_QC", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
    {"phase": 8, "output_number": 2, "name": "Lessons Learned Memo", "file_prefix": "Lessons_Learned_Memo", "file_type": "md", "destination_folder": "03_Working_Papers", "is_review_gate": True, "is_client_deliverable": False, "wave": None},
]

PHASE_NAMES = {
    0: "Proposal & Engagement Setup",
    1: "Data Intake & Financial Baseline",
    2: "Leadership Interviews",
    3: "Profit Leak Quantification",
    4: "Optimization Analysis",
    5: "Deliverable Content Assembly",
    6: "Quality Control",
    7: "Document Packaging",
    8: "Archive & Close Engagement",
}


def _is_pipeline_engagement(sb, engagement_id: str) -> bool:
    """Check if this engagement was created from a pipeline conversion."""
    result = (
        sb.table("pipeline_opportunities")
        .select("id")
        .eq("converted_engagement_id", engagement_id)
        .limit(1)
        .execute()
    )
    return bool(result.data)


def seed_phase_outputs(sb, engagement_id: str) -> int:
    """Seed all 23 phase output records for an engagement. Idempotent.

    For pipeline-sourced engagements, Phase 0 only includes the Data Request
    List (Proposal and Agreement were handled before conversion).

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

    from_pipeline = _is_pipeline_engagement(sb, engagement_id)
    # For pipeline engagements, skip Proposal and Agreement (output_number 1 & 2 in phase 0)
    skip_phase0 = {"Engagement Proposal", "Engagement Agreement"} if from_pipeline else set()

    rows = []
    for output in PHASE_OUTPUTS_SEED:
        if output["phase"] == 0 and output["name"] in skip_phase0:
            continue
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
