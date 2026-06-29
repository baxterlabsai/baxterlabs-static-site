import { useEffect, useState } from 'react'

const IMG = '/images/sample-deliverables/exec-summary'
export const OPEN_EVENT = 'open-executive-summary'

export default function ExecutiveSummaryLightbox() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener(OPEN_EVENT, handleOpen)
    return () => window.removeEventListener(OPEN_EVENT, handleOpen)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  if (!isOpen) return null

  const onClose = () => setIsOpen(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-8 animate-[fadeIn_200ms_ease-out]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Sample Executive Summary"
    >
      <div className="relative w-full max-w-[900px] my-8 animate-[scaleIn_200ms_ease-out]">
        <button
          onClick={onClose}
          className="sticky top-0 float-right z-10 ml-auto mr-2 mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#2D3436]/80 text-white/90 hover:bg-[#2D3436] hover:text-white transition-colors shadow-lg"
          aria-label="Close preview"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <div className="bg-[#FAF8F2] shadow-2xl rounded-sm overflow-hidden" style={{ clear: 'both' }}>

          <div className="mx-8 sm:mx-14 mt-10 mb-0 border-t border-b border-[#C9A84C]/30 bg-[#F6E7C8]/25 px-6 py-5">
            <p className="text-[12px] sm:text-[13px] leading-relaxed text-[#2D3436]/80">
              <span className="font-bold italic text-[#2D3436]/90 tracking-wide text-[11px] uppercase">Disclaimer:</span>{' '}
              This document is a sanitized and anonymized version of an actual BaxterLabs Advisory engagement deliverable. It does not represent any specific company, individual, or financial data. The analytical structures, methodologies, deliverable format, and depth of findings reflect the rigor of a standard BaxterLabs engagement.
            </p>
          </div>

          <div className="px-10 sm:px-16 pt-10 pb-16 text-center border-b border-[#C9A84C]/30">
            <img
              src="/images/baxterlabs-logo.png"
              alt="BaxterLabs"
              className="h-20 w-auto mx-auto mb-8 opacity-90"
            />

            <p className="font-label text-xs uppercase tracking-[0.35em] text-[#005454] mb-3">BaxterLabs Advisory</p>
            <h1 className="font-headline text-4xl sm:text-5xl text-[#66151C] mb-3 leading-tight">Executive Summary</h1>
            <p className="font-headline italic text-xl sm:text-2xl text-[#005454] mb-10 leading-snug">
              Profit Leak &amp; Operational Efficiency Diagnostic
            </p>

            <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-10" />

            <p className="font-label text-xs uppercase tracking-[0.25em] text-[#2D3436]/50 mb-2">Prepared for</p>
            <p className="font-headline text-lg sm:text-xl text-[#2D3436] mb-8">
              Regional Staffing Firm (Illustrative Example)
            </p>

            <p className="text-sm text-[#2D3436]/70 mb-2">
              George DeVries &amp; Alfonso Cordon&nbsp;&nbsp;|&nbsp;&nbsp;BaxterLabs Advisory
            </p>
            <p className="text-[11px] text-[#2D3436]/40 uppercase tracking-wider">
              Confidential — Prepared for Regional Staffing Firm (Illustrative Example)
            </p>
          </div>

          <div className="px-10 sm:px-16 py-14 space-y-12">

            <section>
              <SectionHeading>Purpose of This Document</SectionHeading>
              <BodyText>
                This Executive Summary distills the findings and recommendations of the Profit Leak &amp; Operational Efficiency Diagnostic conducted by BaxterLabs Advisory for the Firm. It is intended for the Firm&rsquo;s executive leadership team and provides a concise overview of the full analytical work documented in the companion Full Diagnostic Report, supported by the Profit Leak Quantification Workbook, the Implementation Roadmap, and the Presentation Deck. A separate Retainer Proposal outlines the available implementation support structure.<Sup n={1} />
              </BodyText>
            </section>

            <section>
              <SectionHeading>Headline Finding</SectionHeading>
              <div className="border-l-4 border-[#005454] bg-[#005454]/5 px-6 py-5 rounded-r-sm">
                <BodyText>
                  BaxterLabs Advisory has identified <strong className="text-[#66151C]">$2,784,000</strong> (conservative) to <strong className="text-[#66151C]">$4,384,000</strong> (aggressive) in annual profit leak opportunity across the Firm, with a moderate estimate of <strong className="text-[#66151C]">$3,585,000</strong>, representing 15.2% of the Firm&rsquo;s $23,650,000 in FY2024 gross profit.<Sup n={2} /> The leaks span 19 discrete findings across revenue erosion, cost fragmentation, and process inefficiency, and they share a common structural origin: the absence of centralized pricing governance, vendor management, and financial reporting infrastructure in a firm that has outgrown its founder-led operating model.<Sup n={3} />
                </BodyText>
              </div>
            </section>

            <div className="space-y-8">
              <figure>
                <img
                  src={`${IMG}/chart-profit-leak-by-category.png`}
                  alt="Annual Profit Leak by Category — Moderate Scenario: Revenue Leaks $1.8M, Cost Leaks $1.4M, Process Leaks $368K, Total $3.6M"
                  className="w-full rounded-sm border border-[#005454]/10 shadow-sm"
                />
              </figure>
              <figure>
                <img
                  src={`${IMG}/chart-profit-leak-range.png`}
                  alt="Profit Leak Range — Conservative to Aggressive estimates for each of the five key findings"
                  className="w-full rounded-sm border border-[#005454]/10 shadow-sm"
                />
              </figure>
            </div>

            <Divider />

            <section>
              <SectionHeading>Five Key Findings</SectionHeading>
              <div className="space-y-6">
                <Finding number={1} title="Executive Search Guarantee Erosion" amount="$552,000" confidence="moderate">
                  Ambiguous engagement letter language and guarantee period creep from 60 to 90 days without repricing have reduced executive search realized margin by 18% to 22% versus the headline fee rate. On a $9,049,000 executive search revenue base at approximately 61% headline gross margin, guarantee disputes and replacement obligations consume $993,600 to $1,214,400 annually, of which approximately 50% to 60% is attributable to contractual ambiguity rather than legitimate placement failure.<Sup n={4} /> The remediation path requires a revised engagement letter with precise placement completion definitions, repriced guarantee periods, and a formal dispute resolution SLA, at a one-time legal cost of $5,000 to $10,000.<Sup n={5} /> Category: Revenue Leak (R2).
                </Finding>

                <Finding number={2} title="Legacy Account Rate Drift" amount="$448,000" confidence="moderate">
                  Within-division bill rate compression of 160 to 180 basis points has accumulated over multiple renewal cycles, with 30% to 40% of active temporary staffing accounts priced below the standard rate card markup.<Sup n={6} /> Executive Interviewee A described these legacy accounts as &ldquo;our margin killers,&rdquo; noting that &ldquo;it doesn&rsquo;t show up as a client loss, it just shows up as every account quietly worth a little less than it used to be.&rdquo;<Sup n={7} /> At FY2024 revenue of $52,000,000, the addressable compression represents $333,000 (conservative) to $562,000 (aggressive) in recoverable gross profit through centralized pricing governance with rate card minimums, automated renewal flagging, and mandatory rate review at each renewal touchpoint.<Sup n={8} /> Category: Revenue Leak (R3).
                </Finding>

                <Finding number={3} title="Underperforming Recruiter Optimization" amount="$420,000" confidence="moderate">
                  The bottom 20% of individual recruiters (approximately 12 to 15 people) generate revenue below their fully loaded compensation cost, with the top quartile producing 3.5&times; the revenue of the bottom quartile.<Sup n={9} /> The productivity dispersion is amplified by two compounding factors: a dedicated recruiter trainer with &ldquo;strong individual recruiting skills and limited training or instructional design experience&rdquo; who has failed to accelerate onboarding trajectory, and a Light Industrial Division 1 management gap that Executive Interviewee A characterized as &ldquo;the single biggest structural issue in the business.&rdquo;<Sup n={10} /> The remediation path requires a performance management framework with minimum production thresholds, structured improvement plans, and coaching investment in the top two quartiles.<Sup n={11} /> Category: Cost Leak (C10).
                </Finding>

                <Finding number={4} title="Below-Card Temp Account Pricing" amount="$400,000" confidence="moderate">
                  The Firm&rsquo;s rate card exists as a spreadsheet on a shared drive with no enforcement mechanism, enabling division-level pricing discretion that has eroded margins on accounts priced in 2019 and 2020.<Sup n={12} /> Executive Interviewee A provided a direct estimate of $300,000 (conservative) to $500,000 (aggressive) in incremental gross profit from rate card enforcement, reflecting his line-of-sight to account-level pricing across eight divisions.<Sup n={13} /> The implementation path begins with captive and sole-source accounts (highest leverage, lowest risk) before extending to competitive accounts where client attrition risk exists.<Sup n={14} /> Category: Revenue Leak (R1).
                </Finding>

                <Finding number={5} title="Client Revenue Attrition" amount="$338,000" confidence="moderate">
                  Three declining accounts (Client A, Client B, Client C) represent a $600,000 to $900,000 net revenue gap against a replacement pipeline of $1,200,000 to $1,500,000.<Sup n={15} /> At the FY2024 blended gross margin of 45.5%, the gross profit impact of this gap is $270,000 (conservative) to $405,000 (aggressive).<Sup n={16} /> The compounding risk is the simultaneous reduction in sales headcount from 35 to 27 positions, reducing new client acquisition capacity at the moment it is most needed.<Sup n={17} /> Category: Revenue Leak (R4).
                </Finding>
              </div>
            </section>

            <Divider />

            <section>
              <SectionHeading>Root Cause Analysis</SectionHeading>
              <BodyText>
                The 19 profit leaks are not 19 independent problems. They are symptoms of a single structural condition: the Firm has scaled to $52 million in revenue across eight divisions, two acquisitions, and 236 employees without building the centralized governance infrastructure (pricing policy, vendor management, financial reporting, performance standards) that a firm of this complexity requires.<Sup n={18} /> The division-autonomy operating model that enabled the Firm&rsquo;s growth from a single-office startup has become the mechanism through which margin, cost, and process value escapes the organization undetected. Every major finding in the diagnostic traces back to this gap between the Firm&rsquo;s operational complexity and its management infrastructure.
              </BodyText>
              <BodyText className="mt-4">
                The structural diagnosis traces the 19 findings to four interconnected root causes. First, <strong>absent pricing governance</strong>: three of the five largest findings (R2 at $552,000, R3 at $448,000, R1 at $400,000) trace directly to the absence of centralized rate card enforcement, standardized engagement letters, and proactive renewal management, accounting for $1,400,000 (moderate) in recoverable revenue.<Sup n={19} /> Second, a <strong>post-acquisition integration deficit</strong>: the Acquired Entity A and Acquired Entity B acquisitions brought new vendor relationships, technology platforms, and payroll structures that were never consolidated, leaving $460,000 in addressable waste across SaaS duplication (C1), EIN consolidation (P2), workers&rsquo; comp carrier optimization (C7), and M&amp;A-transition AR (R5).<Sup n={20} /> Third, <strong>financial reporting lag and information asymmetry</strong>: the CEO operates on financial data that is 6 to 8 weeks stale, with no real-time gross margin dashboard, enabling approximately 140 basis points of margin compression to accumulate over three years without triggering a corrective response.<Sup n={21} /> Executive Interviewee C&rsquo;s reaction to the $1,400,000 pricing governance figure was direct: &ldquo;That&rsquo;s real money. I did not have that number.&rdquo;<Sup n={22} /> Fourth, <strong>decision paralysis from bandwidth constraints</strong>: several implementation-ready opportunities ($320,000 in combined moderate-scenario value) are stalled at the executive decision level, including a payroll outsourcing vendor proposal pending approval for six months.<Sup n={23} />
              </BodyText>
              <BodyText className="mt-4">
                These root causes converge in a balance sheet fragility loop. Stockholders&rsquo; equity declined from $420,000 to $84,000 over six quarters. The revolving credit facility grew from $2,080,000 to $3,680,000. In Q3 FY2024, the interest coverage ratio dropped to 1.18&times; against a 1.25&times; covenant floor, requiring a $200,000 equity contribution from the CEO to cure the technical breach within the cure period.<Sup n={24} /> The profit leaks identified in this diagnostic are the input fuel for this deterioration cycle. Addressing them is simultaneously a profitability exercise and a solvency preservation measure.
              </BodyText>
            </section>

            <figure>
              <img
                src={`${IMG}/diagram-fragility-loop.png`}
                alt="Compounding Fragility Loop: Margin Compression (GM 45.5%) leads to Equity Erosion ($84K), which increases Revolver Growth ($3.2M), driving Interest Burden ($340K/yr), which feeds back into Margin Compression"
                className="w-full max-w-[500px] mx-auto rounded-sm border border-[#005454]/10 shadow-sm"
              />
            </figure>

            <Divider />

            <section className="border-2 border-[#C9A84C]/50 bg-gradient-to-br from-[#F6E7C8]/20 to-[#FAF8F2] rounded-sm px-8 sm:px-10 py-10 shadow-sm">
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-[#C9A84C] mb-2 font-bold">Board-Level Highlight</p>
              <SectionHeading>Quick Wins: 90-Day Capture Opportunity</SectionHeading>
              <div className="border-l-4 border-[#C9A84C] bg-[#C9A84C]/5 px-6 py-4 rounded-r-sm mb-6">
                <p className="font-headline text-lg sm:text-xl text-[#66151C] font-bold leading-snug">
                  $1,761,000 in annual profit recovery is available within 90 days through executive decisions alone&mdash;no capital investment, no technology build.<Sup n={25} />
                </p>
                <p className="text-sm text-[#2D3436]/70 mt-2">
                  This represents 49.1% of the total moderate opportunity.
                </p>
              </div>
              <BodyText>
                The seven Quick Wins are: R1, Below-Card Temp Account Pricing ($400,000); R2, Executive Search Guarantee Erosion ($552,000); R3, Legacy Account Rate Drift ($448,000); C4, Payroll Processing Outsourcing ($90,000); C5, IT Managed Services Conversion ($70,000); C6, Light Industrial Division Merge ($160,000); and C8, VMS Fee Renegotiation ($41,000).<Sup n={26} />
              </BodyText>
              <BodyText className="mt-4">
                The mechanism is policy decisions and contract standardization: enforcing the existing rate card, standardizing executive search engagement letters, approving vendor proposals already on management&rsquo;s desk, and consolidating redundant organizational structure.<Sup n={27} /> The pricing governance items (R1, R2, R3) collectively represent $1,400,000 and share a common implementation mechanism: establishing a centralized pricing framework with rate card minimums, standardized engagement letters, and automated renewal tracking.<Sup n={28} /> The operational items (C4, C5, C6, C8) represent $361,000 in decisions that have already been scoped, priced, or proposed by the Firm&rsquo;s own operational leaders and are awaiting executive approval.<Sup n={29} />
              </BodyText>
            </section>

            <Divider />

            <section>
              <SectionHeading>Path Forward</SectionHeading>
              <BodyText>
                The Firm is losing $3,585,000 per year in profit that is structurally recoverable. This is not a market condition or an economic cycle. It is an internal governance gap that compounds every quarter it goes unaddressed, while the balance sheet absorbs the cumulative cost through declining equity and increasing revolver dependence.<Sup n={30} />
              </BodyText>
              <BodyText className="mt-4">
                Every one of the 19 findings is addressable with tools, data, and relationships that already exist inside the Firm. The rate card exists. The vendor proposals are on management&rsquo;s desk. The division leaders have identified the underperformers. The finance team has scoped the consolidation.<Sup n={31} /> Executive Interviewee B characterized the core challenge directly: &ldquo;This isn&rsquo;t one problem. It&rsquo;s three problems that are adding up, and we&rsquo;ve been managing each one separately without seeing the total.&rdquo;<Sup n={32} /> What is missing is not analysis or capability; it is a decision framework and the executive commitment to execute.
              </BodyText>
              <BodyText className="mt-4">
                Three decisions in the first week, requiring no capital and no technology, would begin recovering $1,490,000 in annual profit: enforce the rate card (initiating recovery of $400,000 in below-card margin from R1 and $448,000 in legacy rate drift from R3, for a combined pricing governance impact of $848,000), approve the payroll outsourcing proposal ($90,000 from C4, signing the vendor proposal that has been pending for six months at zero cost), and standardize the executive search engagement letter ($552,000 from R2, engaging outside counsel at a one-time cost of $5,000 to $10,000).<Sup n={33} /> The path from diagnostic to impact is measured in days, not quarters.
              </BodyText>
              <BodyText className="mt-4">
                BaxterLabs Advisory offers ongoing implementation support through a retainer engagement. Details are provided in the companion Retainer Proposal.<Sup n={34} />
              </BodyText>
            </section>

            <Divider />

            <div className="text-center pt-4 pb-2">
              <p className="text-sm text-[#2D3436]/70 mb-6">
                George DeVries&nbsp;&nbsp;|&nbsp;&nbsp;Managing Partner&nbsp;&nbsp;|&nbsp;&nbsp;BaxterLabs Advisory
              </p>
            </div>

            <Divider />

            <section>
              <SectionHeading>Endnotes (Audit Trail &amp; Source Validation)</SectionHeading>
              <div className="space-y-3 text-[12px] sm:text-[13px] leading-relaxed text-[#2D3436]/70">
                <En n={1}>[Verified: Source Document Registry, the Firm. Engagement deliverable package comprises: Executive Summary, Full Diagnostic Report, Profit Leak Quantification Workbook, Presentation Deck, Implementation Roadmap, and Retainer Proposal.]</En>
                <En n={2}>[Verified: Profit Leak Quantification Workbook, Summary, Row 33. Conservative $2,784,000; Moderate $3,585,000; Aggressive $4,384,000.]</En>
                <En n={3}>[Verified: FIN-01, Page 1. FY2024 Gross Profit $23,650,000. Estimated: $3,585,000 / $23,650,000 = 15.2%.]</En>
                <En n={4}>[Verified: REV-01, Revenue by Type. Executive search revenue $9,049,000. Stated: INT-02, Executive Interviewee A-Q1, headline margin approximately 61%. Stated: INT-03, FV-2, erosion rate 18% to 22%. Estimated: $9,049,000 &times; 61% = $5,520,000 gross profit pool; $5,520,000 &times; 18% = $993,600 (low); $5,520,000 &times; 22% = $1,214,400 (high).]</En>
                <En n={5}>[Estimated: Outside counsel engagement letter revision $5,000 to $10,000 one-time. Based on standard legal service rates for contract drafting and review.]</En>
                <En n={6}>[Stated: INT-02, FV-1. Within-division bill rate compression of 160 to 180 basis points over multiple renewal cycles. Stated: INT-02, Executive Interviewee A-Q4. 30% to 40% of active temp accounts priced below standard rate card markup.]</En>
                <En n={7}>[Stated: INT-02, FV-1. Direct quote: &ldquo;it doesn&rsquo;t show up as a client loss, it just shows up as every account quietly worth a little less than it used to be.&rdquo; Stated: INT-02, Executive Interviewee A-Q4. Direct quote: &ldquo;Those are our margin killers.&rdquo;]</En>
                <En n={8}>[Estimated: 160 bps &times; $52,000,000 = $832,000 (low); 180 bps &times; $52,000,000 = $936,000 (high). 40% addressable = $333,000 conservative; 60% addressable = $562,000 aggressive. Moderate $448,000. See Profit Leak Workbook, Row 10.]</En>
                <En n={9}>[Stated: INT-02, Executive Interviewee A-Q2. Bottom 20% of individual recruiters (approximately 12 to 15 people) generating revenue below fully loaded compensation cost. Top quartile generates approximately 3.5&times; the revenue of the bottom quartile.]</En>
                <En n={10}>[Stated: INT-02, Q11. Direct quote on trainer: &ldquo;strong individual recruiting skills and limited training or instructional design experience.&rdquo; Stated: INT-02, Q11. Direct quote on Division 1 manager: &ldquo;the single biggest structural issue in the business.&rdquo;]</En>
                <En n={11}>[Derived: Automation and Optimization Recommendations, the Firm. Recruiter optimization requires performance management framework with minimum production thresholds, structured PIPs, and management development.]</En>
                <En n={12}>[Stated: INT-02, Executive Interviewee A-Q4. Rate card exists as spreadsheet on shared drive. No enforcement mechanism, no automated renewal flagging, no approval escalation.]</En>
                <En n={13}>[Stated: INT-02, Q13. Executive Interviewee A described the $300,000 to $500,000 estimate as the result of an internal exercise he conducted to assess repricing potential.]</En>
                <En n={14}>[Derived: Operational Bottleneck Analysis, Bottleneck 1, Risk Factors. Tiered rollout: captive and sole-source accounts first, competitive accounts after demonstrating margin recovery.]</En>
                <En n={15}>[Stated: INT-02, FV-2. Client A unwinding permanently. Client B shifted to FTE hiring. Client C consolidated vendors, the Firm not selected for preferred list. Revenue loss $2,100,000 to $2,400,000. Pipeline replacement $1,200,000 to $1,500,000.]</En>
                <En n={16}>[Estimated: $600,000 net gap &times; 45% margin = $270,000 conservative. $900,000 &times; 45% = $405,000 aggressive. Moderate ($750,000 &times; 45%) = $338,000. See Profit Leak Workbook, Row 11.]</En>
                <En n={17}>[Verified: PAY-01. Sales headcount declined from 35 to 27, a reduction of approximately 23% year-over-year.]</En>
                <En n={18}>[Derived: Operational Bottleneck Analysis, Bottleneck Interaction Map. Root cause thesis synthesized from all seven bottleneck analyses. Verified: FIN-01, Revenue $52,000,000. Verified: PAY-01, headcount 236. Verified: ORG-01, eight revenue divisions.]</En>
                <En n={19}>[Estimated: R2 $552,000 + R3 $448,000 + R1 $400,000 = $1,400,000 moderate pricing governance cluster. See Profit Leak Workbook, Rows 8, 9, 10.]</En>
                <En n={20}>[Estimated: C1 $200,000 + P2 $29,000 + C7 $150,000 + R5 $81,000 = $460,000 post-acquisition integration deficit items at moderate scenario. See Profit Leak Workbook, Rows 15, 29, 21, 12.]</En>
                <En n={21}>[Stated: INT-01, Q3. CEO operates on financial data 6 to 8 weeks stale. INT-03, Q3. Outsourced CFO at approximately 10 hours per month delivers P&amp;L 3 to 4 weeks post-month-end. No real-time dashboard.]</En>
                <En n={22}>[Stated: INT-01, FV-1. Direct quote: &ldquo;That&rsquo;s real money. I did not have that number.&rdquo;]</En>
                <En n={23}>[Stated: INT-03, Q12. Payroll outsourcing vendor proposal pending CEO approval for six months. Combined stalled decisions: C4 $90,000 + C5 $70,000 + C1 $84,000 confirmed duplication + P3 $36,000 = approximately $280,000 to $320,000 at moderate.]</En>
                <En n={24}>[Verified: FIN-02, Pages 1 to 2. Equity $420,000 to $84,000. Revolver $2,080,000 to $3,680,000. Stated: INT-03, Executive Interviewee B-Q1. Interest coverage 1.18&times; against 1.25&times; floor. CEO contributed $200,000 equity to cure.]</En>
                <En n={25}>[Estimated: Quick Wins subtotal $1,761,000 moderate. See Narrative Spine, Section 11, Canonical Quadrant Assignments.]</En>
                <En n={26}>[Verified: Narrative Spine, Section 11. Quick Wins: R1 $400,000, R2 $552,000, R3 $448,000, C4 $90,000, C5 $70,000, C6 $160,000, C8 $41,000. Subtotal $1,761,000.]</En>
                <En n={27}>[Derived: Narrative Spine, Section 4. Quick Wins framing: policy decisions and contract standardization mechanisms.]</En>
                <En n={28}>[Estimated: R1 $400,000 + R2 $552,000 + R3 $448,000 = $1,400,000 pricing governance cluster. See Profit Leak Workbook, Rows 8, 9, 10.]</En>
                <En n={29}>[Estimated: C4 $90,000 + C5 $70,000 + C6 $160,000 + C8 $41,000 = $361,000 operational Quick Wins. See Profit Leak Workbook, Rows 18, 19, 20, 22.]</En>
                <En n={30}>[Verified: FIN-02. Equity trajectory $420,000 to $84,000. Revolver trajectory $2,080,000 to $3,680,000. Estimated: Profit Leak Workbook, Summary, Row 33. Moderate $3,585,000.]</En>
                <En n={31}>[Stated: INT-02, Executive Interviewee A-Q4. Rate card exists. Stated: INT-03, Q12. Vendor proposals on desk. Stated: INT-02, Executive Interviewee A-Q2. Division leaders identified underperformers. Stated: INT-03, Q8. Finance team scoped EIN consolidation.]</En>
                <En n={32}>[Stated: INT-03, FV-1. Direct quote: &ldquo;This isn&rsquo;t one problem. It&rsquo;s three problems that are adding up, and we&rsquo;ve been managing each one separately without seeing the total.&rdquo;]</En>
                <En n={33}>[Estimated: R1 $400,000 + R3 $448,000 = $848,000 pricing governance. C4 $90,000 payroll outsourcing. R2 $552,000 engagement letter standardization. Combined: $848,000 + $90,000 + $552,000 = $1,490,000. See Profit Leak Workbook, Rows 8, 9, 10, 18.]</En>
                <En n={34}>[Stated: Retainer Proposal, the Firm. Standard tier $5,000 per month; Accelerated tier $10,000 per month. Month-to-month, 30 days written notice.]</En>
              </div>
            </section>

            <Divider />

            <div className="text-center pb-2">
              <p className="text-[10px] text-[#2D3436]/40 uppercase tracking-wider max-w-lg mx-auto leading-relaxed">
                This document is a sanitized and anonymized version of an actual BaxterLabs Advisory engagement deliverable. It does not represent any specific company, individual, or financial data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-headline text-2xl sm:text-3xl text-[#66151C] mb-4 leading-snug">
      {children}
    </h2>
  )
}

function BodyText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[15px] sm:text-base leading-relaxed text-[#2D3436]/85 ${className}`}>
      {children}
    </p>
  )
}

function Divider() {
  return <hr className="border-t border-[#C9A84C]/20" />
}

function Sup({ n }: { n: number }) {
  return (
    <sup>
      <a
        href={`#en-${n}`}
        className="text-[#005454] hover:text-[#66151C] no-underline text-[10px] ml-px"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById(`en-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }}
      >
        {n}
      </a>
    </sup>
  )
}

function En({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p id={`en-${n}`} className="scroll-mt-8">
      <span className="font-bold text-[#005454] mr-1">{n}.</span> {children}
    </p>
  )
}

function Finding({
  number,
  title,
  amount,
  confidence,
  children,
}: {
  number: number
  title: string
  amount: string
  confidence: string
  children: React.ReactNode
}) {
  return (
    <div className="border border-[#005454]/10 bg-white/50 rounded-sm px-6 py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <span className="font-label text-[10px] uppercase tracking-[0.2em] text-[#005454] font-bold">
          Finding {number}
        </span>
        <h3 className="font-headline text-lg text-[#66151C] font-bold">{title}</h3>
        <span className="ml-auto text-sm font-bold text-[#005454]">{amount}</span>
        <span className="text-[10px] uppercase tracking-wider text-[#2D3436]/40">({confidence})</span>
      </div>
      <p className="text-[14px] sm:text-[15px] leading-relaxed text-[#2D3436]/80">
        {children}
      </p>
    </div>
  )
}
