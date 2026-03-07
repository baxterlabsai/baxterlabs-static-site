"""29-item document upload checklist for BaxterLabs engagements.

Matches the official BaxterLabs Data Request Checklist (12_Data_Request_Checklist.pdf).
"""
from __future__ import annotations

from typing import Dict, List

UPLOAD_CHECKLIST: List[dict] = [
    # SECTION A — Financial Statements
    {"key": "pnl_statement", "category": "financial", "name": "Profit & Loss Statement", "notes": "Last 2\u20133 fiscal years + YTD current year. Monthly detail preferred.", "priority": "required"},
    {"key": "balance_sheet", "category": "financial", "name": "Balance Sheet", "notes": "Most recent year-end + current YTD.", "priority": "required"},
    {"key": "cash_flow_stmt", "category": "financial", "name": "Cash Flow Statement", "notes": "Last 2 fiscal years if available.", "priority": "if_available"},
    {"key": "general_ledger", "category": "financial", "name": "General Ledger Export", "notes": "Full GL or Chart of Accounts with transactions. Excel preferred.", "priority": "required"},
    {"key": "budget_vs_actual", "category": "financial", "name": "Budget vs. Actual Report", "notes": "Current year budget vs. actuals by month.", "priority": "if_available"},
    {"key": "tax_returns", "category": "financial", "name": "Prior-Year Tax Returns", "notes": "Last 2 years (entity-level). Redact SSNs.", "priority": "if_available"},

    # SECTION B — Payroll & Headcount
    {"key": "payroll_summary", "category": "payroll", "name": "Payroll Summary Report", "notes": "All employees: name, title, department, base salary, bonuses, benefits cost.", "priority": "required"},
    {"key": "org_chart", "category": "payroll", "name": "Org Chart", "notes": "Current organizational chart showing reporting lines.", "priority": "required"},
    {"key": "headcount_history", "category": "payroll", "name": "Headcount History", "notes": "Employee count by month for past 12\u201324 months.", "priority": "if_available"},
    {"key": "contractor_spend", "category": "payroll", "name": "Contractor / Freelancer Spend", "notes": "Any 1099 or contract labor \u2014 name, role, monthly cost.", "priority": "if_available"},
    {"key": "pto_liability", "category": "payroll", "name": "PTO / Sick Leave Liability", "notes": "Accrued PTO balance (if carried), total liability estimate.", "priority": "optional"},

    # SECTION C — Vendor & Software Spend
    {"key": "vendor_list", "category": "vendor", "name": "Vendor List with Spend", "notes": "All vendors: name, category, monthly or annual cost, contract term.", "priority": "required"},
    {"key": "software_subscriptions", "category": "vendor", "name": "Software Subscriptions", "notes": "All SaaS/tech tools: name, seats/licenses, monthly cost, renewal date.", "priority": "required"},
    {"key": "top_10_vendor_contracts", "category": "vendor", "name": "Top 10 Vendor Contracts", "notes": "Copies of current contracts for the 10 highest-spend vendors.", "priority": "if_available"},
    {"key": "insurance_policies", "category": "vendor", "name": "Insurance Policies Summary", "notes": "Coverage types, premiums, renewal dates.", "priority": "if_available"},

    # SECTION D — Revenue & Billing
    {"key": "revenue_by_customer", "category": "revenue", "name": "Revenue by Customer / Account", "notes": "Last 12 months revenue broken out by client or account.", "priority": "required"},
    {"key": "invoicing_billing", "category": "revenue", "name": "Invoicing & Billing Records", "notes": "Summary of invoice aging, average collection period.", "priority": "required"},
    {"key": "ar_aging", "category": "revenue", "name": "Accounts Receivable Aging", "notes": "Current AR aging report \u2014 0\u201330, 31\u201360, 61\u201390, 90+ buckets.", "priority": "required"},
    {"key": "revenue_by_product", "category": "revenue", "name": "Revenue by Product / Service Line", "notes": "If applicable \u2014 breakdown by offering.", "priority": "if_available"},
    {"key": "pricing_schedule", "category": "revenue", "name": "Pricing Schedule / Rate Card", "notes": "Current pricing for all products or services offered.", "priority": "if_available"},
    {"key": "churn_retention", "category": "revenue", "name": "Churn / Retention Data", "notes": "Customer churn rate or retention metrics if tracked.", "priority": "optional"},

    # SECTION E — Operations & Process
    {"key": "process_docs", "category": "operations", "name": "Process Documentation", "notes": "Any existing SOPs, process maps, or workflow documentation.", "priority": "if_available"},
    {"key": "pm_tool_export", "category": "operations", "name": "Project Management Tool Export", "notes": "Data export from Asana, Monday, ClickUp, or equivalent.", "priority": "optional"},
    {"key": "csat_data", "category": "operations", "name": "Customer Satisfaction Data", "notes": "NPS scores, CSAT reports, or survey results.", "priority": "optional"},
    {"key": "crm_export", "category": "operations", "name": "CRM Export", "notes": "Pipeline and deal history from HubSpot, Salesforce, or equivalent.", "priority": "optional"},

    # SECTION F — Legal & Governance
    {"key": "entity_docs", "category": "legal", "name": "Entity Formation Documents", "notes": "Articles of Incorporation or Operating Agreement (if relevant).", "priority": "optional"},
    {"key": "key_customer_contracts", "category": "legal", "name": "Key Customer Contracts", "notes": "Copies of 3\u20135 major customer agreements (scope + payment terms).", "priority": "if_available"},
    {"key": "pending_legal", "category": "legal", "name": "Pending Legal Matters", "notes": "Brief description of any open litigation, disputes, or claims.", "priority": "optional"},
]

# Derived lookups
CHECKLIST_BY_KEY: Dict[str, dict] = {item["key"]: item for item in UPLOAD_CHECKLIST}

REQUIRED_ITEMS: List[dict] = [item for item in UPLOAD_CHECKLIST if item["priority"] == "required"]
TOTAL_REQUIRED: int = len(REQUIRED_ITEMS)  # 10

CATEGORY_ORDER = ["financial", "payroll", "vendor", "revenue", "operations", "legal"]

CATEGORY_LABELS: Dict[str, str] = {
    "financial": "A. Financial Statements",
    "payroll": "B. Payroll & Headcount",
    "vendor": "C. Vendor & Software Spend",
    "revenue": "D. Revenue & Billing",
    "operations": "E. Operations & Process",
    "legal": "F. Legal & Governance",
}
