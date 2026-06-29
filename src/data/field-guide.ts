// BaxterLabs locked leak categories (Phase Zero, 2026-06-28):
// Price / Billing / Labor (headline), Vendor / Software (quick-win),
// Collection Drag (secondary).
// RETIRED — do not reintroduce: performance management, price realization,
// discount leakage, vendor sprawl, subscription/SaaS waste, hasty pricing,
// approval bottlenecks.
// No dollar or percent magnitudes here — mechanism and recoverability only.

export type LeakTier = 'headline' | 'quick-win' | 'secondary'

export type LeakSection = {
  id: string
  rn: string
  tier: LeakTier
  tierLabel: string
  category: string
  title: string
  prose: string[]
  fieldNote: string[]
  recoverability: string
  askYourself: string
  showEndCta?: boolean
}

export const LEAK_SECTIONS: LeakSection[] = [
  {
    id: 'price',
    rn: 'I',
    tier: 'headline',
    tierLabel: 'Headline leak',
    category: 'Leak One',
    title: 'Price Leakage.',
    prose: [
      "The price you set and the price you actually collect aren't the same number. Discounts that quietly became defaults, rates that never got reset at renewal, escalators nobody applied, margin handed back one approval at a time.",
      "None of it looks like a problem in the moment. Each concession made sense for the deal in front of you. But they don't reverse on their own, and a few years in, the gap between your rate card and your realized rate is the single biggest leak we find.",
    ],
    fieldNote: [
      "Here's how it tends to show up. A rate gets set during a competitive pitch and then never moves, even as the cost to deliver climbs. A renewal comes up and nobody reopens the price. A division lead prices under the floor to close, and there's no escalation to catch it. The revenue line still looks healthy, so the erosion stays invisible.",
    ],
    recoverability: 'Often the largest recoverable category, and most of it is a governance fix rather than a market one.',
    askYourself:
      'If we asked you to show the realized margin on your three longest-running engagements against what your rate card says they should earn, could you pull that in under 60 seconds?',
    showEndCta: true,
  },
  {
    id: 'billing',
    rn: 'II',
    tier: 'headline',
    tierLabel: 'Headline leak',
    category: 'Leak Two',
    title: 'Billing Leakage.',
    prose: [
      "Work you've already earned that never turns into an invoice. Time that doesn't get captured, scope that creeps in unbilled, jobs that close before the billing catches up to them.",
      "This one hurts twice. The revenue never lands, and because it was never recorded, it doesn't even show up as a loss. It's simply absent from the P&L, which is exactly why it runs for years without anyone naming it.",
    ],
    fieldNote: [
      "The pattern is a gap between work-complete and invoice-sent that nobody owns. Hours worked don't all make it onto a bill. Extra scope gets absorbed because reopening the conversation feels awkward. An approval sits in someone's inbox and the invoice waits behind it. None of it is dramatic. It just quietly leaves money on the table.",
    ],
    recoverability: 'Recoverable once the gap between earned and billed is actually measured.',
    askYourself:
      "Does it feel like your cash position should be stronger than it is, given the work you're actually delivering?",
    showEndCta: true,
  },
  {
    id: 'labor',
    rn: 'III',
    tier: 'headline',
    tierLabel: 'Headline leak',
    category: 'Leak Three',
    title: 'Labor Leakage.',
    prose: [
      "Labor cost drifting out of step with the revenue it produces. People you're paying for who aren't billing, utilization sliding without anyone clocking it, senior people doing work that should sit lower.",
      "Firms hire ahead of demand, which is often the right call. The leak isn't the hire. It's that nobody goes back to check whether the revenue the hire was supposed to produce actually showed up.",
    ],
    fieldNote: [
      "It's the leak managing partners feel before they can name it. The team grew. Payroll grew faster. Revenue per person quietly slid, and because every individual hire was justified at the time, the aggregate drift never gets a second look. The projection that justified the headcount rarely gets revisited twelve months on.",
    ],
    recoverability: 'Recoverable by tying headcount back to the revenue it was meant to produce.',
    askYourself:
      'If we asked you to show the revenue produced by each person hired in the last twelve months, could you pull that report this week?',
    showEndCta: true,
  },
  {
    id: 'vendor',
    rn: 'IV',
    tier: 'quick-win',
    tierLabel: 'Quick win',
    category: 'Leak Four',
    title: 'Vendor Leakage.',
    prose: [
      "Indirect and recurring spend nobody owns. A vendor list growing faster than the business, the same thing bought at five different prices, the occasional payment that slips out twice.",
      "This is one of the fast ones. The fix doesn't need a strategy; it needs someone to actually look. That's why it usually lands in the first wave of recovery rather than the long haul.",
    ],
    fieldNote: [
      "As a firm grows, departments and offices start contracting on their own. Procurement is informal, approvals happen over email, and a few years in you're paying two or three vendors for overlapping things, sometimes the same vendor under two account numbers billed to two cost centers. Each purchase made sense alone. Together they're a leak nobody decided on.",
    ],
    recoverability: 'A quick win — low effort, found and acted on fast.',
    askYourself:
      'Could you name every vendor your firm paid last quarter and say what each one does?',
    showEndCta: true,
  },
  {
    id: 'software',
    rn: 'V',
    tier: 'quick-win',
    tierLabel: 'Quick win',
    category: 'Leak Five',
    title: 'Software Leakage.',
    prose: [
      "Subscriptions that auto-renew long after anyone's using them. Seats nobody logs into, overlapping tools three teams bought separately, renewals nobody stops to question.",
      "The other fast one. Each line is small enough to ignore, which is exactly how the stack quietly doubles. The cancellation list is usually shorter to build than anyone expects.",
    ],
    fieldNote: [
      "A tool gets adopted for a project. The project ends. The subscription renews itself. Seats stay live for people who left. Renewal notices route to a list nobody reads. Two tools end up doing the same job because different offices bought them eighteen months apart. None of it is a decision; it's the absence of one.",
    ],
    recoverability: 'A quick win — cancel-and-consolidate, usually inside a single renewal cycle.',
    askYourself:
      'If your software contracts all renewed tomorrow, could you say how many active users sit on each platform?',
    showEndCta: true,
  },
  {
    id: 'collection',
    rn: 'VI',
    tier: 'secondary',
    tierLabel: 'Secondary',
    category: 'Leak Six',
    title: 'Collection Drag.',
    prose: [
      "Cash you've earned sitting in receivables too long. It mostly pays, eventually, but in the meantime it's financing the client's business instead of yours.",
      "This isn't lost money the way the others are. It's money arriving late enough that it costs you to wait for it, drawn on the revolver and paid for in interest while it ages.",
    ],
    fieldNote: [
      "Invoices go out, then sit. Nobody's negligent; collections just isn't anyone's full-time job, so the oldest receivables quietly stretch. The longer cash takes to land, the more of your own operations you're funding out of pocket while the client holds onto yours.",
    ],
    recoverability: 'Recoverable as working capital — it tightens the gap between earned and collected.',
    askYourself:
      'Do you know how long your cash takes to land after the work is done, and are you actively managing that number?',
    showEndCta: false,
  },
]
