"""25-item document upload checklist for BaxterLabs engagements."""
from __future__ import annotations

from typing import Dict, List

UPLOAD_CHECKLIST: List[dict] = [
    # A. Financial Statements
    {"key": "income_stmt_ytd", "category": "financial", "name": "Income Statement (YTD + prior 2 years)", "notes": "P&L by month preferred", "priority": "required"},
    {"key": "balance_sheet", "category": "financial", "name": "Balance Sheet (current + prior 2 years)", "notes": "", "priority": "required"},
    {"key": "cash_flow_stmt", "category": "financial", "name": "Cash Flow Statement (prior 2 years)", "notes": "", "priority": "required"},
    {"key": "trial_balance", "category": "financial", "name": "Trial Balance (current period)", "notes": "", "priority": "required"},
    {"key": "chart_of_accounts", "category": "financial", "name": "Chart of Accounts", "notes": "", "priority": "required"},

    # B. Payroll & Compensation
    {"key": "payroll_register", "category": "payroll", "name": "Payroll Register (last 12 months)", "notes": "Summary by employee", "priority": "required"},
    {"key": "benefits_summary", "category": "payroll", "name": "Benefits Summary / Enrollment", "notes": "Health, dental, 401k, etc.", "priority": "required"},
    {"key": "contractor_list", "category": "payroll", "name": "1099 Contractor List + Payments", "notes": "", "priority": "if_available"},
    {"key": "org_chart", "category": "payroll", "name": "Organizational Chart", "notes": "", "priority": "if_available"},

    # C. Vendor & Expense
    {"key": "ap_aging", "category": "vendor", "name": "Accounts Payable Aging Report", "notes": "", "priority": "required"},
    {"key": "vendor_list", "category": "vendor", "name": "Vendor List with Annual Spend", "notes": "Top 20 vendors minimum", "priority": "required"},
    {"key": "credit_card_stmts", "category": "vendor", "name": "Credit Card Statements (last 6 months)", "notes": "", "priority": "if_available"},
    {"key": "recurring_contracts", "category": "vendor", "name": "Recurring Service Contracts / Subscriptions", "notes": "SaaS, leases, retainers", "priority": "if_available"},

    # D. Revenue & Collections
    {"key": "ar_aging", "category": "revenue", "name": "Accounts Receivable Aging Report", "notes": "", "priority": "required"},
    {"key": "revenue_by_customer", "category": "revenue", "name": "Revenue by Customer / Segment (last 12 months)", "notes": "", "priority": "required"},
    {"key": "pricing_schedule", "category": "revenue", "name": "Pricing Schedule / Rate Card", "notes": "", "priority": "if_available"},
    {"key": "sales_pipeline", "category": "revenue", "name": "Sales Pipeline / Backlog Report", "notes": "", "priority": "optional"},

    # E. Operations
    {"key": "tech_stack", "category": "operations", "name": "Technology / Software Stack List", "notes": "With monthly costs", "priority": "if_available"},
    {"key": "insurance_summary", "category": "operations", "name": "Insurance Policies Summary", "notes": "GL, E&O, D&O, cyber", "priority": "optional"},
    {"key": "lease_agreements", "category": "operations", "name": "Lease Agreements (office, equipment)", "notes": "", "priority": "optional"},
    {"key": "fleet_schedule", "category": "operations", "name": "Vehicle / Fleet Schedule", "notes": "", "priority": "optional"},

    # F. Legal & Tax
    {"key": "tax_returns", "category": "legal", "name": "Tax Returns (prior 2 years)", "notes": "Federal + state", "priority": "required"},
    {"key": "entity_docs", "category": "legal", "name": "Entity Formation Documents", "notes": "Articles, operating agreement", "priority": "if_available"},
    {"key": "loan_agreements", "category": "legal", "name": "Loan / Line-of-Credit Agreements", "notes": "", "priority": "if_available"},
    {"key": "pending_litigation", "category": "legal", "name": "Pending Litigation / Legal Matters", "notes": "", "priority": "optional"},
]

# Derived lookups
CHECKLIST_BY_KEY: Dict[str, dict] = {item["key"]: item for item in UPLOAD_CHECKLIST}

REQUIRED_ITEMS: List[dict] = [item for item in UPLOAD_CHECKLIST if item["priority"] == "required"]
TOTAL_REQUIRED: int = len(REQUIRED_ITEMS)  # 12

CATEGORY_ORDER = ["financial", "payroll", "vendor", "revenue", "operations", "legal"]

CATEGORY_LABELS: Dict[str, str] = {
    "financial": "A. Financial Statements",
    "payroll": "B. Payroll & Compensation",
    "vendor": "C. Vendor & Expense",
    "revenue": "D. Revenue & Collections",
    "operations": "E. Operations",
    "legal": "F. Legal & Tax",
}
