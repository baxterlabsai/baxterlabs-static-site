export type ScaleOption = { v: 1 | 2 | 3 | 4 | 5; lbl: string }

export const SCALE: ScaleOption[] = [
  { v: 1, lbl: 'Solid, we track and act' },
  { v: 2, lbl: "Mostly good, don't always act" },
  { v: 3, lbl: 'Unclear, not consistent' },
  { v: 4, lbl: "Weak, we know it's a gap" },
  { v: 5, lbl: "Blind spot, we don't measure" },
]

export type Question = { qid: number; text: string }

export type Category = {
  id: string
  rn: string
  title: string
  lead: string
  questions: Question[]
}

export const CATS: Category[] = [
  {
    id: 'payroll',
    rn: 'I',
    title: 'Payroll Drift',
    lead: 'Whether each hire is paying for itself.',
    questions: [
      {
        qid: 1,
        text: "We track revenue produced per employee at least quarterly and compare it against each role's fully loaded cost.",
      },
      {
        qid: 2,
        text: 'When we hire someone new, we can tie that hire to a specific revenue expectation and review their actual production within the first 12 months.',
      },
    ],
  },
  {
    id: 'vendor',
    rn: 'II',
    title: 'Vendor Sprawl',
    lead: 'Whether anyone owns the vendor list.',
    questions: [
      {
        qid: 3,
        text: 'One person or team owns a current, complete list of every vendor the firm pays, and that list gets reviewed at least once a year.',
      },
      {
        qid: 4,
        text: 'Before any vendor contract renews, someone reviews the terms, compares pricing to market, and confirms we still need the service.',
      },
      {
        qid: 5,
        text: "We've checked whether different departments or offices are paying separate vendors for services that overlap or do essentially the same thing.",
      },
    ],
  },
  {
    id: 'billing',
    rn: 'III',
    title: 'Billing Lag',
    lead: 'Whether the gap between work and cash is measured.',
    questions: [
      {
        qid: 6,
        text: 'We know the average number of days between when work is completed and when the invoice goes out, and we actively manage that number.',
      },
      {
        qid: 7,
        text: 'We know our current DSO (days sales outstanding) and have a specific target we manage against.',
      },
      {
        qid: 8,
        text: 'We track the dollar amount of billable time that gets written down or written off each quarter, and we know the trend.',
      },
    ],
  },
  {
    id: 'software',
    rn: 'IV',
    title: 'Software Redundancy',
    lead: 'Whether seats match people who still use them.',
    questions: [
      {
        qid: 9,
        text: "Before renewing any software contract, someone reviews how many licensed seats are actually being used and cancels the ones that aren't.",
      },
      {
        qid: 10,
        text: "We've audited our software stack in the past year to identify tools that do essentially the same thing, purchased by different teams at different times.",
      },
    ],
  },
  {
    id: 'approval',
    rn: 'V',
    title: 'Approval Bottlenecks',
    lead: "Whether decisions move when leadership doesn't.",
    questions: [
      {
        qid: 11,
        text: 'If the primary decision-maker in our firm is out for a week, pricing decisions, vendor approvals, and client proposals continue moving at a normal pace.',
      },
      {
        qid: 12,
        text: "We know the average number of days it takes for a decision that requires leadership approval to get made, and we're comfortable with that number.",
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
    body: "If your score falls here, your firm is tracking most of these areas and acting on what you find. That's less common than you'd think in the $5M to $50M range, and it means the financial visibility most firms are still building, you've already got. We'd still encourage you to look at any question where you scored a 3 or higher, because even well-run firms tend to have a corner or two where things accumulate quietly. But the exposure estimate below should feel consistent with what you already sense. Your instincts on this are right.",
  },
  moderate: {
    headline: 'Something feels off, and this is probably why.',
    body: "If you're in this range, you're in good company. This is where most firms land, and it usually matches a feeling that's been sitting in the background for a while: revenue is growing, the team is growing, but profit isn't quite keeping pace and you can't put your finger on exactly why. The reason is usually that you're tracking some of these areas but not all of them, and the ones you're not tracking are where margin quietly leaks. The exposure estimate below will give you a sense of scale. It's not a precise number, but it's a reasonable range based on what these patterns typically produce in firms your size. If the number feels bigger than you expected, that's worth paying attention to. Your gut brought you to this assessment for a reason.",
  },
  high: {
    headline: "You've got real blind spots, and they're costing you real money.",
    body: "A score in this range tells us your firm has grown past the point where informal controls can keep up, but the financial infrastructure hasn't caught up yet. That's not a criticism of how you've run the business. It's a pattern we see in almost every firm that grows quickly through the $5M to $50M range. Revenue growth creates complexity, and the finance function that worked at $5M doesn't surface the same things at $15M or $25M. The exposure estimate below is going to be a meaningful number. The good news is that most of what's leaking is recoverable once you can see it. The hard part isn't fixing the leaks. It's making them visible in the first place.",
  },
}

export const INDUSTRIES = ['Staffing', 'Accounting', 'Law', 'Architecture', 'Consulting', 'Other'] as const

export function computeResult(
  total: number,
  revenue: AssessRevenueRange
): { band: Band; low: number; high: number } {
  const mid = REV_MIDS[revenue]
  if (total <= 25) return { band: 'low', low: mid * 0.01, high: mid * 0.02 }
  if (total <= 40) return { band: 'moderate', low: mid * 0.03, high: mid * 0.05 }
  return { band: 'high', low: mid * 0.06, high: mid * 0.1 }
}

export function formatCurrency(n: number): string {
  const rounded = Math.round(n / 1000) * 1000
  return '$' + rounded.toLocaleString('en-US')
}
