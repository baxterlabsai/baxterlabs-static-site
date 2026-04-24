/* 14-Day Timeline data for /services.
   Consumed by src/components/services/ServicesTimeline.tsx.
   Day 0 is the pre-engagement phase (clock not running); Days 1-14 run
   from the last-interview moment. The `bar` object drives per-track
   opacity on the Gantt segments and is only used for Days 1-14. */

export interface DayBar {
  bl: number // BaxterLabs track fill, 0..1
  cl: number // Client track fill, 0..1
  dl: number // Deliverable track fill, 0..1
}

export interface Day {
  n: number      // 0 for Phase 0, 1-14 for the engagement
  phase: string  // e.g. "Phase 1 · Days 1–14"
  clock: string  // e.g. "Day 7 of 14 · Clock running"
  bl: string     // BaxterLabs work copy
  cl: string     // Client involvement copy
  dl: string     // Deliverable-taking-shape copy
  bar?: DayBar   // Gantt opacity; undefined for Day 0
}

export const DAYS: Day[] = [
  {
    n: 0,
    phase: 'Phase 0 · Pre-engagement',
    clock: 'Clock not running',
    bl: 'Onboarding intake fires. Interview slots open. Data uploads begin analysis in parallel. Transcripts analyzed as they complete.',
    cl: 'Primary contact returns the intake form (~10 min). Interviewees schedule and complete interviews (~60 min each, at their convenience). Data-upload contact gathers documents (~1–2 hrs).',
    dl: 'Initial financial pattern analysis. Interview transcripts and qualitative synthesis. Foundation for the 14-day phase.',
  },
  { n: 1,  phase: 'Phase 1 · Days 1–14', clock: 'Day 1 of 14 · Clock running',  bl: 'Deep analysis of pre-engagement data and transcripts. Pattern identification across the five canonical leak categories begins.', cl: 'None. Quiet phase.', dl: 'Initial leak inventory takes shape. Preliminary quantification ranges forming.', bar: { bl: 1, cl: 0, dl: 0.3 } },
  { n: 2,  phase: 'Phase 1 · Days 1–14', clock: 'Day 2 of 14 · Clock running',  bl: 'Continued pattern analysis. GL anomaly detection across vendor-category spend.', cl: 'None. Quiet phase.', dl: 'Initial leak inventory, preliminary quantification.', bar: { bl: 1, cl: 0, dl: 0.4 } },
  { n: 3,  phase: 'Phase 1 · Days 1–14', clock: 'Day 3 of 14 · Clock running',  bl: 'Cross-reference leaks against the fragility-loop structure. First-pass dollar quantification.', cl: 'None.', dl: 'Full leak map with category tagging, preliminary dollar ranges.', bar: { bl: 1, cl: 0, dl: 0.5 } },
  { n: 4,  phase: 'Phase 1 · Days 1–14', clock: 'Day 4 of 14 · Clock running',  bl: 'Refinement of the leak map. Root-cause hypotheses tested against interview transcripts.', cl: 'None.', dl: 'Leak inventory moves from catalogued to quantified with confidence ranges.', bar: { bl: 1, cl: 0, dl: 0.55 } },
  { n: 5,  phase: 'Phase 1 · Days 1–14', clock: 'Day 5 of 14 · Clock running',  bl: 'Refinement of quantification. Sensitivity analysis per leak. Confidence interval calibration.', cl: 'None.', dl: 'Moderate-scenario and conservative-scenario findings emerge.', bar: { bl: 1, cl: 0, dl: 0.7 } },
  { n: 6,  phase: 'Phase 1 · Days 1–14', clock: 'Day 6 of 14 · Clock running',  bl: 'Sensitivity stress-testing. Outlier review. Partner mid-engagement checkpoint.', cl: 'None.', dl: 'Quantification workbook structure finalized.', bar: { bl: 1, cl: 0, dl: 0.75 } },
  { n: 7,  phase: 'Phase 1 · Days 1–14', clock: 'Day 7 of 14 · Clock running',  bl: 'Drafting of Executive Summary begins. Drafting of Full Diagnostic Report sections.', cl: 'None.', dl: 'Executive Summary (draft) and Full Diagnostic Report (draft) underway.', bar: { bl: 1, cl: 0, dl: 0.8 } },
  { n: 8,  phase: 'Phase 1 · Days 1–14', clock: 'Day 8 of 14 · Clock running',  bl: 'Internal partner review of draft findings. Revisions, citation additions.', cl: 'None.', dl: 'Executive Summary v2. Full Diagnostic Report nearing first complete draft.', bar: { bl: 1, cl: 0, dl: 0.85 } },
  { n: 9,  phase: 'Phase 1 · Days 1–14', clock: 'Day 9 of 14 · Clock running',  bl: 'Implementation Roadmap construction. 90-day action sequencing tied to findings.', cl: 'None.', dl: 'Implementation Roadmap v1. Quantification Workbook populated.', bar: { bl: 1, cl: 0, dl: 0.9 } },
  { n: 10, phase: 'Phase 1 · Days 1–14', clock: 'Day 10 of 14 · Clock running', bl: 'Partner review of roadmap sequencing. Dependency mapping between remediation actions.', cl: 'None.', dl: 'Roadmap finalized. Workbook finalized.', bar: { bl: 1, cl: 0, dl: 0.92 } },
  { n: 11, phase: 'Phase 1 · Days 1–14', clock: 'Day 11 of 14 · Clock running', bl: 'Executive Presentation Deck assembly. Visual structure mirrors the Executive Summary narrative.', cl: 'None.', dl: 'Executive Presentation Deck drafted. Deliverables package 90% complete.', bar: { bl: 1, cl: 0, dl: 0.94 } },
  { n: 12, phase: 'Phase 1 · Days 1–14', clock: 'Day 12 of 14 · Clock running', bl: 'Internal rehearsal of the debrief. Final citation audit: every finding traced to source data.', cl: 'None.', dl: 'Every deliverable cross-checked against source citations.', bar: { bl: 1, cl: 0, dl: 0.97 } },
  { n: 13, phase: 'Phase 1 · Days 1–14', clock: 'Day 13 of 14 · Clock running', bl: 'Final QA. Partner review. Citation verification. Debrief scheduled with client.', cl: 'None.', dl: 'Full package ready for presentation.', bar: { bl: 1, cl: 0, dl: 1 } },
  { n: 14, phase: 'Phase 1 · Days 1–14', clock: 'Day 14 of 14 · Delivery',      bl: 'Executive Debrief (live, partner-led). Q&A. Full package handed over.', cl: '~90 minutes, the debrief itself.', dl: 'All six deliverables delivered: Executive Summary, Full Diagnostic Report, Implementation Roadmap, Quantification Workbook, Executive Presentation Deck, and an optional Retainer Proposal (accepting it is optional; it ships with the package either way).', bar: { bl: 0.8, cl: 0.6, dl: 1 } },
]
