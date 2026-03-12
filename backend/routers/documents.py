from __future__ import annotations

from fastapi import APIRouter, HTTPException

from services.template_service import get_template_text

router = APIRouter(prefix="/api", tags=["templates"])

# Map template_name -> (bucket, path)
TEMPLATE_LOOKUP = {
    # 00 — Sales & Marketing
    "01_Offer_Definition": ("templates", "00_Sales_and_Marketing/01_Offer_Definition.docx"),
    "02_Sales_Call_Framework": ("templates", "00_Sales_and_Marketing/02_Sales_Call_Framework.docx"),
    "03_Interview_Guide": ("templates", "00_Sales_and_Marketing/03_Interview_Guide.docx"),
    "05_LinkedIn_Profile_Copy": ("templates", "00_Sales_and_Marketing/05_LinkedIn_Profile_Copy.docx"),
    "06_Outreach_Scripts": ("templates", "00_Sales_and_Marketing/06_Outreach_Scripts.docx"),
    # 01 — Engagement Setup
    "12_Data_Request_Checklist": ("templates", "01_Engagement_Setup/12_Data_Request_Checklist.docx"),
    "13_Client_Folder_Template": ("templates", "01_Engagement_Setup/13_Client_Folder_Template.docx"),
    "14_Engagement_Agreement": ("templates", "01_Engagement_Setup/14_Engagement_Agreement.docx"),
    "18_Operating_Agreement": ("templates", "01_Engagement_Setup/18_Operating_Agreement.docx"),
    "21_Mutual_NDA": ("templates", "01_Engagement_Setup/21_Mutual_NDA.docx"),
    # 02 — Analysis Tools
    "21_Preliminary_Findings_Memo": ("templates", "02_Analysis_Tools/21_Preliminary_Findings_Memo.docx"),
    "27_Quality_Control_Checklist": ("templates", "02_Analysis_Tools/27_Quality_Control_Checklist.docx"),
    # 03 — Client Deliverables
    "09_Report_Template": ("templates", "03_Client_Deliverables/09_Report_Template.docx"),
    "10_Executive_Summary": ("templates", "03_Client_Deliverables/10_Executive_Summary.docx"),
    "24_Operational_Bottleneck_Analysis": ("templates", "03_Client_Deliverables/24_Operational_Bottleneck_Analysis.docx"),
    "25_Automation_Recommendations": ("templates", "03_Client_Deliverables/25_Automation_Recommendations.docx"),
    "26_90_Day_Implementation_Roadmap": ("templates", "03_Client_Deliverables/26_90_Day_Implementation_Roadmap.docx"),
    "28_Day_7_Progress_Update": ("templates", "03_Client_Deliverables/28_Day_7_Progress_Update.docx"),
    # 04 — Post-Engagement
    "15_Post_Engagement_Survey": ("templates", "04_Post_Engagement/15_Post_Engagement_Survey.docx"),
    "16_Case_Study_Template": ("templates", "04_Post_Engagement/16_Case_Study_Template.docx"),
    "17_Phase2_Retainer_Proposal": ("templates", "04_Post_Engagement/17_Phase2_Retainer_Proposal.docx"),
    # 05 — Business Operations
    "20_Quarterly_Review": ("templates", "05_Business_Operations/20_Quarterly_Review.docx"),
}


@router.get("/templates/{template_name}")
async def get_template(template_name: str):
    entry = TEMPLATE_LOOKUP.get(template_name)
    if not entry:
        available = sorted(TEMPLATE_LOOKUP.keys())
        raise HTTPException(status_code=404, detail=f"Unknown template '{template_name}'. Available: {available}")
    bucket, path = entry
    content = get_template_text(bucket, path)
    return {"template_name": template_name, "content": content, "path": path}
