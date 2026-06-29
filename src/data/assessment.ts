// BaxterLabs locked leak categories (Phase Zero, 2026-06-28):
// Price / Billing / Labor (headline), Vendor / Software (quick-win),
// Collection Drag (secondary).
// RETIRED — do not reintroduce: performance management, price realization,
// discount leakage, vendor sprawl, subscription/SaaS waste, hasty pricing,
// approval bottlenecks.
//
// Public output is QUALITATIVE only — no dollar exposure is shown to the
// visitor. computeResult() returns a band; the per-category signal read is
// derived in the UI. A dollar estimate is still computed internally for the
// captured lead record (computeExposureRange), never for display.

export type ScaleOption = { v: 1 | 2 | 3 | 4 | 5; lbl: string }

export const SCALE: ScaleOption[] = [
  { v: 1, lbl: 'Solid, we track and act' },
  { v: 2, lbl: "Mostly good, don't always act" },
  { v: 3, lbl: 'Unclear, not consistent' },
  { v: 4, lbl: "Weak, we know it's a gap" },
  { v: 5, lbl: "Blind spot, we don't measure" },
]

export type Question = { qid: number; text: string }

export type LeakTier = 'headline' | 'quick-win' | 'secondary'

export type Category = {
  id: string
  rn: string
  tier: LeakTier
  tierLabel: string
  title: string
  lead: string
  questions: Question[]
}

export const CATS: Category[] = [
  {
    id: 'price',
    rn: 'I',
    tier: 'headline',
    tierLabel: 'Headline',
    title: 'Price Leakage',
    lead: 'Whether the rate you set is the rate you collect.',
    questions: [
      {
        qid: 1,
        text: 'We review the realized margin on our largest engagements against our rate card at least once a year, and we act on the gaps.',
      },
      {
        qid: 2,
        text: 'When a price is set below our standard rate, it triggers an approval or escalation rather than just going through.',
      },
    ],
  },
  {
    id: 'billing',
    rn: 'II',
    tier: 'headline',
    tierLabel: 'Headline',
    title: 'Billing Leakage',
    lead: 'Whether earned work reliably turns into an invoice.',
    questions: [
      {
        qid: 3,
        text: 'We know the average number of days between when work is completed and when the invoice goes out, and we actively manage that number.',
      },
      {
        qid: 4,
        text: 'We track the dollar amount of billable work that gets written down, written off, or never invoiced each quarter, and we know the trend.',
      },
    ],
  },
  {
    id: 'labor',
    rn: 'III',
    tier: 'headline',
    tierLabel: 'Headline',
    title: 'Labor Leakage',
    lead: 'Whether each hire is paying for itself.',
    questions: [
      {
        qid: 5,
        text: "We track revenue produced per employee at least quarterly and compare it against each role's fully loaded cost.",
      },
      {
        qid: 6,
        text: 'When we hire someone new, we tie that hire to a specific revenue expectation and review their actual production within the first 12 months.',
      },
    ],
  },
  {
    id: 'vendor',
    rn: 'IV',
    tier: 'quick-win',
    tierLabel: 'Quick win',
    title: 'Vendor Leakage',
    lead: 'Whether anyone owns the vendor list.',
    questions: [
      {
        qid: 7,
        text: 'One person or team owns a current, complete list of every vendor the firm pays, and that list gets reviewed at least once a year.',
      },
      {
        qid: 8,
        text: 'Before any vendor contract renews, someone reviews the terms, compares pricing to market, and confirms we still need the service.',
      },
    ],
  },
  {
    id: 'software',
    rn: 'V',
    tier: 'quick-win',
    tierLabel: 'Quick win',
    title: 'Software Leakage',
    lead: 'Whether seats match people who still use them.',
    questions: [
      {
        qid: 9,
        text: "Before renewing any software contract, someone reviews how many licensed seats are actually being used and cancels the ones that aren't.",
      },
      {
        qid: 10,
        text: "We've audited our software stack in the past year to identify tools that overlap or do essentially the same thing, bought by different teams at different times.",
      },
    ],
  },
  {
    id: 'collection',
    rn: 'VI',
    tier: 'secondary',
    tierLabel: 'Secondary',
    title: 'Collection Drag',
    lead: 'Whether earned cash lands before it ages.',
    questions: [
      {
        qid: 11,
        text: 'We know our current DSO (days sales outstanding) and have a specific target we manage against.',
      },
      {
        qid: 12,
        text: 'Aged receivables get escalated on a defined schedule rather than quietly stretching out and becoming write-offs.',
      },
    ],
  },
]

export type AssessRevenueRange = '5-10' | '10-25' | '25-50'

export const REV_MIDS: Record<AssessRevenueRange, number> = {
  '5-10': 7_500_000,
  '10-25': 17_500_000,
  '25-50': 37_500_000,
}

export const REV_LABELS: Record<AssessRevenueRange, string> = {
  '5-10': '$5M–$10M',
  '10-25': '$10M–$25M',
  '25-50': '$25M–$50M',
}

export type Band = 'low' | 'moderate' | 'high'

export const BAND_LABELS: Record<Band, string> = {
  low: 'Low Risk',
  moderate: 'Moderate Risk',
  high: 'High Risk',
}

export const BAND_COPY: Record<Band, { headline: string; body: string }> = {
  low: {
    headline: "You're in good shape, and you probably already know that.",
    body: "If your score falls here, your firm is tracking most of these areas and acting on what you find. That's less common than you'd think in the $5M to $50M range, and it means the financial visibility most firms are still building, you've already got. We'd still encourage you to look at any question where you scored a 3 or higher, because even well-run firms tend to have a corner or two where things accumulate quietly. But the read below should feel consistent with what you already sense. Your instincts on this are right.",
  },
  moderate: {
    headline: 'Something feels off, and this is probably why.',
    body: "If you're in this range, you're in good company. This is where most firms land, and it usually matches a feeling that's been sitting in the background for a while: revenue is growing, the team is growing, but profit isn't quite keeping pace and you can't put your finger on exactly why. The reason is usually that you're tracking some of these areas but not all of them, and the ones you're not tracking are where margin quietly leaks. The signals below point to where to look first. They're directional, not a measurement. If the pattern matches a feeling you already had, that's worth paying attention to. Your gut brought you to this assessment for a reason.",
  },
  high: {
    headline: "You've got real blind spots, and they're costing you real money.",
    body: "A score in this range tells us your firm has grown past the point where informal controls can keep up, but the financial infrastructure hasn't caught up yet. That's not a criticism of how you've run the business. It's a pattern we see in almost every firm that grows quickly through the $5M to $50M range. Revenue growth creates complexity, and the finance function that worked at $5M doesn't surface the same things at $15M or $25M. The signals below show where the gaps are widest. The good news is that most of what's leaking is recoverable once you can see it. The hard part isn't fixing the leaks. It's making them visible in the first place.",
  },
}

export const INDUSTRIES = ['Staffing', 'Accounting', 'Law', 'Architecture', 'Consulting', 'Other'] as const

// Public result: band only. No dollar figure is returned for display.
export function computeResult(total: number): { band: Band } {
  if (total <= 25) return { band: 'low' }
  if (total <= 40) return { band: 'moderate' }
  return { band: 'high' }
}

// Per-category qualitative read for the results screen. A higher answer means
// weaker control, so a higher category sum means a stronger leak signal.
export type SignalLevel = 'low' | 'elevated' | 'high'

export type CategorySignal = {
  id: string
  title: string
  tier: LeakTier
  tierLabel: string
  level: SignalLevel
}

export function computeSignals(answers: Record<number, number>): CategorySignal[] {
  return CATS.map((c) => {
    const sum = c.questions.reduce((s, q) => s + (answers[q.qid] ?? 0), 0)
    const max = c.questions.length * 5
    const ratio = max === 0 ? 0 : sum / max
    const level: SignalLevel = ratio >= 0.8 ? 'high' : ratio >= 0.6 ? 'elevated' : 'low'
    return { id: c.id, title: c.title, tier: c.tier, tierLabel: c.tierLabel, level }
  })
}

// Internal only — a directional dollar estimate retained on the captured lead
// record for follow-up. NEVER rendered to the visitor (Phase Zero: no figures
// in public copy). Display uses computeResult()/computeSignals() instead.
export function computeExposureRange(
  total: number,
  revenue: AssessRevenueRange
): { low: number; high: number } {
  const mid = REV_MIDS[revenue]
  if (total <= 25) return { low: mid * 0.01, high: mid * 0.02 }
  if (total <= 40) return { low: mid * 0.03, high: mid * 0.05 }
  return { low: mid * 0.06, high: mid * 0.1 }
}

export function formatCurrency(n: number): string {
  const rounded = Math.round(n / 1000) * 1000
  return '$' + rounded.toLocaleString('en-US')
}
