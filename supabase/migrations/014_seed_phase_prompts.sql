-- 014_seed_phase_prompts.sql
-- Seed all 8 phase prompts (Phases 0-7) into the phase_prompts table.
-- Idempotent: deletes existing rows first, then inserts fresh data.

DELETE FROM phase_prompts;

-- Phase 0: Proposal & Engagement Setup
INSERT INTO phase_prompts (phase, name, description, timing, template_text, variables, version, is_active)
VALUES (
  0,
  'Proposal & Engagement Setup',
  'Convert a prospect into a signed client with a fully prepared engagement folder.',
  'Pre-Engagement',
  $prompt$Read the BaxterLabs-Advisory skill file. Read Standards/BaxterLabs_Brand_Style_Guide_v1.pdf
and Standards/BaxterLabs_Citation_Provenance_Guide_v1.pdf before producing any output.

You are setting up a new client engagement for {company_name}. Read {storage_base}/engagement_info/ for any intake notes,
prospect details, or initial correspondence the partners have placed there.

OUTPUT 1 — Engagement Proposal (docx → {storage_base}/engagement_info/)
Template: Template_Library/00_Sales_and_Marketing/Engagement_Proposal_Template.docx
Client deliverable — Deep Crimson header rule, wordmark, Gold footer, CONFIDENTIAL marking.
Required sections:
- Cover page with client name ({company_name}), BaxterLabs branding, date
- About BaxterLabs Advisory (firm overview, differentiators)
- Engagement scope: 14-Day Profit Leak Diagnostic — what it covers, what it does not
- Methodology overview: 6 phases (Data Intake, Interviews, Quantification,
  Optimization, Report Assembly, Executive Debrief) with timeline
- Deliverables list: Executive Summary, Full Diagnostic Report, Presentation Deck,
  90-Day Implementation Roadmap, Profit Leak Workbook
- Investment: engagement fee ({fee} range per engagement_info/ notes)
- Terms: payment schedule, confidentiality, data handling
- Team: {partner_lead} (narrative, interviews), Alfonso Cordon (financial analysis)
- Next steps and signature block

OUTPUT 2 — Engagement Agreement (docx → {storage_base}/engagement_info/)
Template: Template_Library/00_Sales_and_Marketing/Engagement_Agreement_Template.docx
Formal agreement with scope, fees, confidentiality, data retention, and signature blocks.

OUTPUT 3 — Data Request List (docx → {storage_base}/engagement_info/)
Template: Template_Library/01_Engagement_Setup/Data_Request_List_Template.docx
Itemized list of documents BaxterLabs needs before Day 1. For each item:
- Document name (e.g., "Trailing 12-month P&L, monthly detail")
- Why we need it (one sentence linking to analysis methodology)
- Ideal format (Excel preferred for financials, PDF acceptable for contracts)
- Priority: Required vs. Nice-to-Have
Standard request categories: financial statements (P&L, balance sheet, cash flow),
payroll/headcount data, vendor/contractor spend, technology/software inventory,
org chart, key SOPs, billing/invoicing records, client revenue breakdown.

OUTPUT 4 — Engagement Folder Setup (action)
Create the full engagement folder structure if it does not already exist:
  {storage_base}/
    engagement_info/
    inbox/
    interviews/
    working_papers/
    deliverables/
    qc/

Place all Phase 0 outputs into {storage_base}/engagement_info/.
This folder structure is the foundation — every subsequent phase depends on it.

FAIL LOUDLY: If intake notes are missing or ambiguous (no client name, no industry,
no revenue range), stop and flag what's needed. Do not generate a proposal with
placeholder data — every proposal must be client-specific.$prompt$,
  '["company_name", "client_name", "fee", "partner_lead", "storage_base", "engagement_id", "pain_points", "start_date"]'::jsonb,
  1,
  true
);

-- Phase 1: Data Intake & Financial Baseline
INSERT INTO phase_prompts (phase, name, description, timing, template_text, variables, version, is_active)
VALUES (
  1,
  'Data Intake & Financial Baseline',
  'Analyze source data and produce Preliminary Findings Memo identifying top investigation areas.',
  'Days 1–3',
  $prompt$Read the BaxterLabs-Advisory skill file. Read Standards/BaxterLabs_Brand_Style_Guide_v1.pdf
and Standards/BaxterLabs_Citation_Provenance_Guide_v1.pdf before producing any output.

Analyze every file in {storage_base}/inbox/. For each document:
1. Identify what it is (P&L, balance sheet, payroll, vendor list, SOP, org chart, etc.)
2. Note the date range it covers
3. Extract key financial figures with exact cell/row/page references

Perform financial baseline analysis for {company_name}:
- Gross margin trends (month-over-month if data allows)
- Expense volatility and concentration
- Payroll ratios (revenue per employee, payroll as % of revenue)
- Cost concentration risks (vendor dependency, overhead scaling)
- Revenue per employee benchmarking against industry norms

Then produce these outputs:

OUTPUT 1 — Source Document Registry (markdown → {storage_base}/working_papers/)
For every file in {storage_base}/inbox/: filename, document type, date range, key figures extracted
with exact locations, and data quality issues. This registry is the citation chain
foundation — every downstream figure traces back here.

OUTPUT 2 — Preliminary Findings Memo (docx → {storage_base}/working_papers/)
Use template: Template_Library/02_Analysis_Tools/Preliminary_Findings_Memo_Template.docx
Internal document — Dark Teal header, no CONFIDENTIAL marking.
Required sections:
- Memo header (To: Partners, From: BaxterLabs Advisory, Date, Re: {company_name}
  Preliminary Financial Review, Engagement ID: {engagement_id})
- Purpose: one paragraph stating what this memo establishes
- Data reviewed: every source document from {storage_base}/inbox/ with file dates
- 3–5 most promising investigation areas with supporting financial evidence
- Key financial patterns: findings with full citations
  [Confidence Level: Source Document, Location]
- Operational risks with magnitude estimates where data allows
- Data gaps: explicit list of what's missing and what it would change
- Recommended interview focus areas for Phase 2 leadership interviews

OUTPUT 3 — Data Gap Flag List (markdown → {storage_base}/working_papers/)
For each gap: what's missing, why it matters, what to ask in interviews,
and what we'll assume if we can't get it (labeled [Assumed] with rationale).

CITATION RULES — non-negotiable:
- Every financial figure carries a citation
- Calculated figures show full derivation (inputs, sources, formula)
- If two source documents contradict, flag explicitly as [DISCREPANCY] —
  do not silently choose one
- If a figure cannot be verified, label it explicitly as unverified$prompt$,
  '["company_name", "client_name", "storage_base", "engagement_id", "interview_contacts", "pain_points"]'::jsonb,
  1,
  true
);

-- Phase 2: Leadership Interviews
INSERT INTO phase_prompts (phase, name, description, timing, template_text, variables, version, is_active)
VALUES (
  2,
  'Leadership Interviews',
  'Synthesize interview transcripts and cross-reference against financial data.',
  'Days 4–6',
  $prompt$Read the BaxterLabs-Advisory skill file. Read
Standards/BaxterLabs_Citation_Provenance_Guide_v1.pdf.

Read all interview transcripts in {storage_base}/interviews/. Read the Preliminary Findings Memo,
Source Document Registry, and Data Gap Flag List in {storage_base}/working_papers/.

For each interview, extract:
- Direct quotes with page/timestamp references that quantify operational reality
- Time estimates for specific activities (hours/week on manual tasks, etc.)
- Stakeholder-reported pain points with dollar or time magnitudes
- Figures that confirm, contradict, or extend the financial data in {storage_base}/inbox/

Cross-reference: where do leadership perceptions diverge from the financial data?

Interview contacts for {company_name}:
{interview_contacts}

Then produce these outputs:

OUTPUT 1 — Interview Synthesis Matrix (markdown → {storage_base}/working_papers/)
Structured cross-reference:
- Each major finding from the Preliminary Findings Memo
- What each stakeholder said about it (with transcript citations)
- Where testimony confirms the financial data
- Where testimony contradicts the financial data (flag as [DISCREPANCY])
- New findings that emerged from interviews not visible in financial data

OUTPUT 2 — Workflow Inefficiency Map (markdown → {storage_base}/working_papers/)
Map the 3 critical workflows identified in interviews. For each:
- Process name and description
- Who it affects (which stakeholders mentioned it)
- Current state vs. described ideal state
- Time cost calculation: hours/week x $/hour x 52 weeks = annual cost
- All figures cited: [Stated: Interview_[Name].docx, page X] or
  [Estimated: hours from interview x rate from Payroll_Report.xlsx]

OUTPUT 3 — Updated Data Gap Resolution (markdown → {storage_base}/working_papers/)
Update the Phase 1 Data Gap Flag List:
- Gaps resolved by interview data (cite the transcript)
- Gaps still open
- Assumptions now in play (labeled [Assumed] with rationale)

Flag every contradiction between interview testimony and financial documents.
Do not resolve contradictions silently — document for partner review.$prompt$,
  '["company_name", "client_name", "storage_base", "engagement_id", "interview_contacts"]'::jsonb,
  1,
  true
);

-- Phase 3: Profit Leak Quantification
INSERT INTO phase_prompts (phase, name, description, timing, template_text, variables, version, is_active)
VALUES (
  3,
  'Profit Leak Quantification',
  'Build master financial workbook and quantify every profit leak with scenario modeling.',
  'Days 7–9',
  $prompt$Read the BaxterLabs-Advisory skill file. Read both the Brand Style Guide and
Citation Provenance Guide.

Read all working papers in {storage_base}/working_papers/ from Phases 1 and 2: Source Document
Registry, Preliminary Findings Memo, Interview Synthesis Matrix, Workflow Inefficiency
Map, and Data Gap Resolution.

Model every identified inefficiency for {company_name} with a dollar amount. Categories per Pivot Plan:
overstaffing, vendor overspend, billing lag, software redundancy, process friction.
For each: conservative, moderate, and aggressive scenarios.

OUTPUT 1 — Profit Leak Quantification Workbook (xlsx → {storage_base}/working_papers/)
Use template: Template_Library/02_Analysis_Tools/Profit_Leak_Workbook_Template.xlsx

THIS WORKBOOK BECOMES THE SINGLE SOURCE OF TRUTH. Every number in every
downstream deliverable must match this workbook exactly.

Required sheets:
1. Summary — executive view of all profit leak categories with totals
2. Revenue Leaks — pricing gaps, billing lag, under-utilization
3. Cost Leaks — overstaffing, vendor overspend, overhead scaling
4. Process Leaks — workflow friction, rework, admin burden, software redundancy
5. Scenario Analysis — conservative/moderate/aggressive for each category
6. Data Sources — citation trail mapping every figure to {storage_base}/inbox/ or {storage_base}/interviews/

Each scenario formula structure:
- Labor: hours/week x $/hour x 52 weeks
- Vendor: current spend vs. benchmark or negotiated rate
- Process: time cost x frequency x error/rework rate
- Revenue: billing lag x avg daily revenue, or utilization gap x billable rate

Excel formatting per Brand Style Guide:
- Header rows: Dark Teal #005454 background, white text, bold
- Data rows: alternate White #FFFFFF and Warm Cream #FAF8F5
- Currency: proper format, negatives in parentheses + Soft Red #C0392B
- Formula cells: locked, visible formula bar
- Tab colors: Crimson = primary, Teal = supporting, Gray = reference
- Wordmark top-left cell of first sheet; print areas set

Every cell with a financial figure must have a comment or adjacent column
with its citation: [Confidence Level: Source, Location].

OUTPUT 2 — Assumptions & Methodology Memo (markdown → {storage_base}/working_papers/)
Document every assumption: what, why, what data would verify it,
and sensitivity (how much does the total change if off by 20%?).

OUTPUT 3 — Progress Update for Partners (markdown → {storage_base}/working_papers/)
Total opportunity (headline number), confidence level, breakdown by category,
top 3 findings by magnitude, open items, unresolved discrepancies.$prompt$,
  '["company_name", "client_name", "storage_base", "engagement_id"]'::jsonb,
  1,
  true
);

-- Phase 4: Optimization Analysis
INSERT INTO phase_prompts (phase, name, description, timing, template_text, variables, version, is_active)
VALUES (
  4,
  'Optimization Analysis',
  'Analyze optimization paths for every profit leak with prioritized recommendations.',
  'Days 10–11',
  $prompt$Read the BaxterLabs-Advisory skill file. Read the Brand Style Guide and Citation
Provenance Guide.

Read all working papers in {storage_base}/working_papers/, especially the Profit Leak Quantification
Workbook (your single source of financial truth) and the Workflow Inefficiency Map.

For every profit leak identified for {company_name}, analyze the optimization path:
- Can it be automated? (full automation, partial automation, process redesign)
- Implementation complexity? (low/medium/high)
- Time to value? (immediate, 30 days, 90 days, 6 months)
- Estimated ROI? (reference workbook figures for cost of problem)

OUTPUT 1 — Operational Bottleneck Analysis (docx → {storage_base}/working_papers/)
Internal document — Dark Teal header.
For each bottleneck: description, root cause (WHY it exists), financial impact
(exact figure from workbook, cited), current process flow, recommended solution,
dependencies, risk factors.

OUTPUT 2 — Automation & Optimization Recommendations (markdown → {storage_base}/working_papers/)
Prioritized matrix ranked by: impact ($), complexity, time to value, resources, risk.
Group into:
- Quick Wins (high impact, low complexity — do first)
- Strategic Investments (high impact, high complexity — plan carefully)
- Efficiency Gains (moderate impact, low complexity — batch these)
- Defer (low impact, high complexity — not worth it now)

Each recommendation references the specific profit leak and dollar figure from
the workbook. No vague "significant savings" — every recommendation has a number.

OUTPUT 3 — Implementation Prerequisites (markdown → {storage_base}/working_papers/)
What the client needs before executing each recommendation: technology, staffing,
process documentation, vendor evaluations, timeline dependencies.$prompt$,
  '["company_name", "client_name", "storage_base", "engagement_id"]'::jsonb,
  1,
  true
);

-- Phase 5: Report Assembly + Retainer Proposal
INSERT INTO phase_prompts (phase, name, description, timing, template_text, variables, version, is_active)
VALUES (
  5,
  'Report Assembly + Retainer Proposal',
  'Assemble all client deliverables and prepare Phase 2 retainer proposal.',
  'Days 12–13',
  $prompt$Read the BaxterLabs-Advisory skill file. Read the Brand Style Guide and Citation
Provenance Guide.

Read the Profit Leak Quantification Workbook in {storage_base}/working_papers/ and all Phase 4
outputs. Every number must match the workbook exactly. No rounding differences.

Produce four client deliverables plus one internal document for {company_name}. Client deliverables use
client branding: Deep Crimson header rule, wordmark right-aligned, Gold footer rule,
CONFIDENTIAL marking.

OUTPUT 1 — Executive Summary (docx → {storage_base}/deliverables/)
Template: Template_Library/03_Client_Deliverables/Executive_Summary_Template.docx
Target: 5–7 pages, board-ready.
Sections: Branded cover, Profit Leak Headline (total $ prominently displayed),
What We Found (3–5 findings with $ each), What It Means (impact if nothing changes),
What We Recommend (top 3 with ROI), Citation key.

OUTPUT 2 — Full Diagnostic Report (docx → {storage_base}/deliverables/)
Template: Template_Library/03_Client_Deliverables/Full_Diagnostic_Report_Template.docx
Target: 25–35 pages.
Sections: Cover, TOC, Executive summary (condensed), Methodology, Financial analysis
by leak category (Revenue/Cost/Process with $ + citations), Interview synthesis,
Root cause analysis (WHY leaks exist), Recommendations, Financial impact summary,
Appendices (source index, calculations, interview excerpts), Citation index.

OUTPUT 3 — Presentation Deck (pptx → {storage_base}/deliverables/)
Template: Template_Library/03_Client_Deliverables/Presentation_Deck_Template.pptx
Target: 12–18 slides for 90-minute debrief.
Sequence: Title → Agenda → Headline number → Where money is going (waterfall/bar) →
Key Finding slides (one per finding) → Root causes → Recommendations (max 3/slide) →
Roadmap timeline → Expected ROI → Next steps → Close.
Charts: Teal → Crimson → Gold → Forest Green → Warm Brown → Warm Gray.

OUTPUT 4 — 90-Day Implementation Roadmap (docx → {storage_base}/deliverables/)
Template: Template_Library/03_Client_Deliverables/Implementation_Roadmap_Template.docx
Sections: Cover, Priority matrix (effort vs. impact), 90-day plan (Weeks 1–4, 5–8,
9–12 with owners/milestones), Resource requirements, Expected outcomes by quarter,
Risk factors, Success metrics.

OUTPUT 5 — Phase 2 Retainer Proposal (docx → {storage_base}/working_papers/)
Template: Template_Library/00_Sales_and_Marketing/Retainer_Proposal_Template.docx
INTERNAL DOCUMENT — saved to Working Papers, NOT Deliverables. Partners decide
whether and when to present this to the client.

This proposal is prepared BEFORE the Executive Debrief so it is ready if the
client asks "what's next?" when findings land well. Momentum matters.

Required sections:
- Cover page: "Implementation Engagement Proposal" with client name ({company_name}) and date
- Diagnostic recap: 2–3 paragraph summary of what the diagnostic found
  (reference total profit leak $ from workbook, top 3 findings with magnitudes)
- The gap: what the diagnostic identified vs. what remains to implement
- Implementation scope: which Quick Wins and Strategic Investments from Phase 4
  BaxterLabs would execute, with specific deliverables per workstream
- Projected ROI: implementation cost vs. recoverable profit leaks
  (use conservative scenario figures from the workbook, fully cited)
- Engagement structure: monthly retainer, duration (typically 3–6 months),
  partner hours per month, Cowork automation hours, milestone checkpoints
- Investment: retainer fee range grounded in scope complexity
- Why now: cost of delay — calculate monthly profit leak ongoing if
  implementation is deferred (total annual leak / 12, cited from workbook)

Tone: confident but not pushy. The diagnostic data speaks for itself.
Every number must trace to the Profit Leak Workbook with full citations.

ALL FIVE OUTPUTS must reference identical numbers from the Profit Leak Workbook.
Typography: H1/H2 Deep Crimson, H3 Dark Teal, body Charcoal (never pure black).
Negatives in parentheses + Soft Red. No AI language artifacts. No filler phrases.
Standard: board-room ready, every page suitable for executive presentation.$prompt$,
  '["company_name", "client_name", "storage_base", "engagement_id", "fee", "start_date", "end_date", "partner_lead"]'::jsonb,
  1,
  true
);

-- Phase 6: Quality Control
INSERT INTO phase_prompts (phase, name, description, timing, template_text, variables, version, is_active)
VALUES (
  6,
  'Quality Control',
  'Cross-document audit, citation verification, and brand compliance gate before Executive Debrief.',
  'Pre-Delivery',
  $prompt$Read the BaxterLabs-Advisory skill file. Read the Citation Provenance Guide and
references/consistency-protocol.md.

You are the pre-delivery quality gate for {company_name}. Nothing reaches the client until this passes.

STEP 1 — Build Canonical Reference Table
Open {storage_base}/working_papers/Profit_Leak_Workbook.xlsx. Record every key figure:
total opportunity, by category (Revenue/Cost/Process), sub-totals, headcount,
utilization rates, margins, scenario figures (conservative/moderate/aggressive).

STEP 2 — Audit Every File in {storage_base}/deliverables/
For each deliverable, check every financial figure against canonical table:
- Number matches workbook (exact rounding, units) → Flag if mismatch
- Citation present [Confidence: Source, Location] → Flag if missing
- Confidence level assigned (Verified/Stated/Estimated/Assumed) → Flag if absent
- Calculated figures show derivation (formula + cited inputs) → Flag if missing
- Negative values: parentheses + Soft Red → Flag formatting errors
- Range formatting: en dash, no spaces ($X–$Y) → Flag if wrong
- Scenarios present where applicable → Flag if missing

STEP 3 — Cross-Document Consistency
Verify identical figures across: Executive Summary, Full Report, Deck, Roadmap.
Flag any instance where the same metric appears differently in two documents.

STEP 4 — Brand Compliance
For each: correct headers/footers, Charcoal body text (not black), Crimson H1/H2,
Teal H3, correct fonts, CONFIDENTIAL marking, wordmark, chart palette, no AI artifacts.

STEP 5 — Pivot Plan Quality Standards (p. 17)
Every finding has methodology + assumptions + confidence level.
Conservative/moderate/aggressive scenarios for projections.
Narrative: clear, direct, jargon-free. Visual quality: board/investor-ready.
90-day roadmap has owners, timelines, success metrics.

STEP 6 — Audit Phase 2 Retainer Proposal (if generated in Phase 5)
Verify all financial figures in the retainer proposal match the workbook.
Confirm projected ROI uses conservative scenario. Confirm cost-of-delay
calculation is accurate (annual leak / 12). This document stays in
{storage_base}/working_papers/ — do NOT move to {storage_base}/deliverables/.

STEP 7 — Produce QC Report
OUTPUT — Citation Audit Report (docx → {storage_base}/qc/)
Filename: Citation_Audit_{company_name}_{start_date}.docx
Sections: Audit scope, Summary (figures audited/issues found/resolved),
Discrepancy log (document, location, written vs. canonical, error type, status),
Cross-document consistency results, Brand compliance results,
Pivot Plan quality standards results, Retainer proposal audit results,
Unresolved items for partner review,
Sign-off block (prepared by, reviewed by, date).

FAIL LOUDLY: If ANY unresolved discrepancy exists, no document moves to client.
Flag blockers explicitly. Do not soft-pedal quality failures.$prompt$,
  '["company_name", "client_name", "storage_base", "engagement_id"]'::jsonb,
  1,
  true
);

-- Phase 7: Engagement Close & Archive
INSERT INTO phase_prompts (phase, name, description, timing, template_text, variables, version, is_active)
VALUES (
  7,
  'Engagement Close & Archive',
  'Verify delivery, capture lessons learned, archive engagement files, and close out.',
  'Post-Debrief',
  $prompt$Read the BaxterLabs-Advisory skill file.

The Executive Debrief (Day 14) for {company_name} is complete. This phase closes the engagement
cleanly, archives all work product, and prepares BaxterLabs for the next client.

STEP 1 — Delivery Verification
Confirm every file in {storage_base}/deliverables/ was delivered to the client.
Cross-reference against the deliverables list in the original Engagement Proposal
({storage_base}/engagement_info/). For each deliverable: filename, delivery date, delivery method.
Flag any promised deliverable that is missing from {storage_base}/deliverables/.

STEP 2 — Phase 2 Retainer Status
Record the current status of the Phase 2 retainer proposal:
- Presented to client? (yes/no, date if yes)
- Client response? (accepted/declined/pending/not presented)
- If accepted: engagement start date, retainer amount, scope reference
- If pending: follow-up date and responsible partner
- If not presented: reason (partner decision, client not ready, etc.)

STEP 3 — Draft Cleanup
Scan {storage_base}/working_papers/ for superseded versions and intermediate drafts.
Produce a list of files recommended for removal, grouped by:
- Superseded drafts (earlier versions of files that have final versions)
- Scratch files (temporary analysis, test outputs)
- Files safely archived (referenced in final deliverables, retain for provenance)
DO NOT delete any files yet — this list feeds into the Completion Manifest
for partner review. Actual removal happens in Step 7 after approval.

STEP 4 — Citation Provenance Chain Verification
Verify the complete citation chain is intact and reconstructable:
- Source Document Registry (Phase 1) accounts for every file in {storage_base}/inbox/
- Profit Leak Workbook Data Sources sheet traces every figure
- Citation Audit Report (Phase 6) documents the QC outcome
- No orphaned citations (references to files that don't exist in the engagement folder)
This chain is the legal protection — if a client ever challenges a number,
BaxterLabs must be able to trace it from deliverable to source in minutes.

STEP 5 — Lessons Learned & Reusable Patterns
Produce a brief internal memo capturing:
- What worked well in this engagement (methodology, tools, client interaction)
- What to improve next time (data gaps encountered, timeline pressure points)
- Reusable patterns: any analysis frameworks, interview questions, or workflow
  structures worth incorporating into the Template Library for future engagements
- Industry-specific insights worth capturing for future clients in this vertical

STEP 6 — Template Library Readiness Check
Verify the master Template Library is clean and ready for the next engagement:
- No client-specific data left in any template from this engagement
- All template paths referenced in Phase Prompts 0–6 still resolve correctly
- Flag any templates that need updating based on lessons learned

STEP 7 — Create Archive & Move Engagement Files
This is the physical archival operation. Execute in this order:

7a. Create the archive folder structure mirroring the active engagement.

7b. Copy ALL files from the active engagement into the archive, preserving
    the folder structure exactly. Every file in every subfolder.

7c. Remove superseded drafts and scratch files from the ARCHIVE copy only
    (the files identified in Step 3 that partners approved for removal).
    The archive should contain final versions and provenance-critical files only.
    DO NOT remove files from the active folder — archive copy only.

7d. Place the Completion Manifest (OUTPUT 1) into the archive's qc/ folder.
    Place the Lessons Learned Memo (OUTPUT 2) into the archive's working_papers/.

7e. Verify the archive is complete:
    - File count matches expected (total active files minus approved removals)
    - Citation chain files all present (Registry, Workbook, Audit Report)
    - Deliverables folder matches delivery verification from Step 1
    - Completion Manifest is in qc/

7f. Once archive is verified, mark the engagement as closed.
    FAIL LOUDLY if archive verification in 7e did not pass — do NOT close
    the engagement if the archive is incomplete.

OUTPUT 1 — Engagement Completion Manifest (markdown → archive qc/)
Filename: Completion_Manifest_{company_name}_{start_date}.md
A single document that records:
- Client name ({company_name}), engagement ID ({engagement_id}), engagement dates
- All deliverables produced with filenames and delivery confirmation
- Phase 2 retainer proposal status
- QC outcome (pass/fail, Citation Audit Report reference)
- Files archived (complete list with paths)
- Files removed during cleanup (list with justification for each)
- Citation chain integrity status (intact/issues flagged)
- Lessons learned summary
- Template Library status (ready/updates needed)
- Archive location
- Sign-off: engagement formally closed by {partner_lead}, date

OUTPUT 2 — Lessons Learned Memo (markdown → archive working_papers/)
Internal memo with the Step 5 content above.

FAIL LOUDLY: If any deliverable was promised but not delivered, if the citation
chain has gaps, if client-specific data is found in the Template Library, or if
the archive verification fails — flag as a blocker. The engagement is not closed
until all blockers are resolved.$prompt$,
  '["company_name", "client_name", "storage_base", "engagement_id", "partner_lead"]'::jsonb,
  1,
  true
);
