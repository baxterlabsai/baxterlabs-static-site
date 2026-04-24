export type LeakSection = {
  id: string
  rn: string
  category: string
  title: string
  prose: string[]
  engagementFirmLabel: string
  engagementParagraphs: string[]
  rangeLabel: string
  rangeSub: string
  rangeValue: string
  askYourself: string
  showEndCta?: boolean
}

export const LEAK_SECTIONS: LeakSection[] = [
  {
    id: 'payroll',
    rn: 'I',
    category: 'Leak One',
    title: 'Payroll Drift.',
    prose: [
      "Here's what this tends to look like. The firm is growing, so leadership hires ahead of demand. New people come on. Revenue keeps climbing. But nobody goes back to check whether each new hire is producing revenue that justifies their fully loaded cost.",
    ],
    engagementFirmLabel: '40-person, $8M firm',
    engagementParagraphs: [
      'Over 18 months they&rsquo;d added nine people. Revenue had grown 22% in the same period, which felt great. But when we traced revenue production back to each role, four of those nine hires had no direct revenue attribution and no documented justification tying them to a specific capacity need. The fully loaded cost of those four roles was <span class="big">$340K per year</span>.',
      'Not all of that was recoverable, but roughly <span class="big">$180K to $260K</span> was margin that had quietly walked out the door through reactive hiring.',
    ],
    rangeLabel: 'Typical range &middot; $5M&ndash;$50M firms',
    rangeSub: 'Recoverable profit per year',
    rangeValue: '$80K&ndash;$300K',
    askYourself:
      'If we asked you right now to show us the revenue produced by each person hired in the last 12 months, could you pull that report in under 60 seconds?',
    showEndCta: true,
  },
  {
    id: 'vendor',
    rn: 'II',
    category: 'Leak Two',
    title: 'Vendor Sprawl.',
    prose: [
      'What we keep seeing looks like this. Every department buys what it needs when it needs it. Nobody owns the vendor list. Renewals happen automatically. And over time, the firm ends up paying three different vendors for things that overlap significantly, because each purchase made sense in isolation.',
    ],
    engagementFirmLabel: '$12M consulting firm',
    engagementParagraphs: [
      'We looked at the vendor ledger and found 47 active vendor relationships. Fourteen of those vendors had been added in the prior two years with no competitive bid and no renewal review. When we consolidated overlapping services and renegotiated three contracts that had auto-renewed at list price, the recoverable amount was <span class="big">$145K annually</span>.',
      'The managing partner had no idea the firm was spending $38K a year on two separate document management platforms purchased by two different practice groups.',
    ],
    rangeLabel: 'Typical range &middot; $5M&ndash;$50M firms',
    rangeSub: 'Recoverable profit per year',
    rangeValue: '$60K&ndash;$200K',
    askYourself:
      'Do you feel confident that you could name every vendor your firm paid last quarter and what each one does?',
    showEndCta: true,
  },
  {
    id: 'billing',
    rn: 'III',
    category: 'Leak Three',
    title: 'Billing Lag.',
    prose: [
      "Here&rsquo;s the pattern. The work gets done. The invoice goes out sometime later. The client pays sometime after that. And in the gap between work-complete and cash-received, the firm&rsquo;s working capital is tied up funding operations out of pocket. Worse, write-downs accumulate quietly because nobody is tracking the delta between billable hours worked and hours that actually make it onto an invoice.",
    ],
    engagementFirmLabel: '$22M staffing firm',
    engagementParagraphs: [
      'The firm had an average of 34 days between project completion and invoice delivery. Their DSO (days sales outstanding) was another 52 days on top of that. So the firm was financing <span class="big">86 days</span> of operations on every engagement before seeing cash.',
      'When we measured the write-downs that were happening between timesheets and invoices, the firm was losing $12K to $18K per month in billable time that never got billed. That&rsquo;s <span class="big">$144K to $216K per year</span> that showed up nowhere on the P&amp;L because it was never recorded as revenue in the first place.',
    ],
    rangeLabel: 'Typical range &middot; billing lag + write-downs',
    rangeSub: 'Recoverable profit per year',
    rangeValue: '$50K&ndash;$250K',
    askYourself:
      "Does it feel like your cash position should be stronger than it is, given the revenue you're producing?",
    showEndCta: true,
  },
  {
    id: 'software',
    rn: 'IV',
    category: 'Leak Four',
    title: 'Software Redundancy.',
    prose: [
      'The shape of this one is familiar. The firm adopts a new platform. The old one stays active because a few people still use it, or because nobody remembers to cancel it. Seats get purchased for employees who left six months ago. And renewal notices go to a distribution list that nobody monitors closely.',
    ],
    engagementFirmLabel: '$9M architecture firm',
    engagementParagraphs: [
      'The firm was paying for 74 licensed seats across four project management and collaboration tools. <span class="big">23 of those seats</span> hadn&rsquo;t been logged into in over 90 days. Two of the four tools did essentially the same thing, purchased 18 months apart by different office locations.',
      'The annual spend on redundant and unused software was <span class="big">$67K</span>. Not a staggering number on its own, but it had been compounding for three years because every renewal was automatic and nobody had done a seat-count review before any of them.',
    ],
    rangeLabel: 'Typical range &middot; $5M&ndash;$50M firms',
    rangeSub: 'Recoverable profit per year',
    rangeValue: '$30K&ndash;$120K',
    askYourself:
      'If your software contracts all renewed tomorrow, could you tell us how many active users you have on each platform?',
    showEndCta: true,
  },
  {
    id: 'approval',
    rn: 'V',
    category: 'Leak Five',
    title: 'Approval Bottlenecks.',
    prose: [
      'We keep seeing this one in firms that have grown past the size where one-person oversight made sense. One partner or owner approves everything: pricing decisions, hiring decisions, vendor selections, client proposals. The intent is quality control. The effect is a queue. And every day something sits in that queue, the firm is deferring revenue it could already be earning.',
    ],
    engagementFirmLabel: '$15M professional service firm',
    engagementParagraphs: [
      'A single managing partner approved all new engagement proposals. The average time from proposal-ready to signed engagement was <span class="big">11 days</span>. When we looked at the bottleneck, 7 of those 11 days were the proposal sitting in the partner&rsquo;s inbox.',
      "Across the firm&rsquo;s pipeline, the delayed revenue from that 7-day queue was worth roughly <span class=\"big\">$190K per year</span> in deferred billings. The partner wasn&rsquo;t being negligent. There was simply too much running through one person, and nobody had built a delegation framework with clear authority limits because the firm had grown past the size where one-person approval made sense.",
    ],
    rangeLabel: 'Typical range &middot; deferred revenue',
    rangeSub: 'Per year',
    rangeValue: '$40K&ndash;$200K',
    askYourself:
      "Does it feel like decisions in your firm are waiting on one person more often than they should be?",
    showEndCta: false,
  },
]
