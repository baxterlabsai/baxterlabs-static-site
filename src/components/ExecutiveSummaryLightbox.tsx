import { useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function ExecutiveSummaryLightbox({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-8 animate-[fadeIn_200ms_ease-out]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Sample Executive Summary"
    >
      <div className="relative w-full max-w-[900px] my-8 animate-[scaleIn_200ms_ease-out]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="sticky top-0 float-right z-10 ml-auto mr-2 mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#2D3436]/80 text-white/90 hover:bg-[#2D3436] hover:text-white transition-colors shadow-lg"
          aria-label="Close preview"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Document container */}
        <div className="bg-[#FAF8F2] shadow-2xl rounded-sm overflow-hidden" style={{ clear: 'both' }}>

          {/* ═══════════════ TITLE PAGE ═══════════════ */}
          <div className="px-10 sm:px-16 pt-14 pb-16 text-center border-b border-[#C9A84C]/30">
            {/* Disclaimer */}
            <div className="mb-12 mx-auto max-w-xl border border-[#C9A84C]/40 bg-[#F6E7C8]/30 rounded-sm px-6 py-4">
              <p className="text-[11px] leading-relaxed text-[#2D3436]/70 italic">
                <span className="font-bold not-italic text-[#66151C] uppercase tracking-wider text-[10px]">Representative Sample Deliverable</span>
                <br className="mb-1" />
                This document is a representative sample of a BaxterLabs Advisory Executive Summary. It is constructed from a composite of real-world diagnostic patterns, anonymized and generalized for illustration purposes. It does not represent any specific client engagement.
              </p>
            </div>

            {/* Logo */}
            <img
              src="/images/baxterlabs-logo.png"
              alt="BaxterLabs"
              className="h-14 w-auto mx-auto mb-10 opacity-90"
            />

            {/* Title block */}
            <p className="font-label text-xs uppercase tracking-[0.35em] text-[#005454] mb-3">BaxterLabs Advisory</p>
            <h1 className="font-headline text-4xl sm:text-5xl text-[#66151C] mb-3 leading-tight">Executive Summary</h1>
            <p className="font-headline italic text-xl sm:text-2xl text-[#005454] mb-10 leading-snug">
              Profit Leak &amp; Operational Efficiency Diagnostic
            </p>

            <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-10" />

            <p className="font-label text-xs uppercase tracking-[0.25em] text-[#2D3436]/50 mb-2">Prepared for</p>
            <p className="font-headline text-lg sm:text-xl text-[#2D3436] mb-8">
              Representative Mid-Market Staffing Firm<br />
              <span className="text-base text-[#2D3436]/60">($50M Revenue)</span>
            </p>

            <p className="text-sm text-[#2D3436]/70 mb-2">
              George DeVries &amp; Alfonso Cordon&nbsp;&nbsp;|&nbsp;&nbsp;BaxterLabs Advisory
            </p>
            <p className="text-[11px] text-[#2D3436]/40 uppercase tracking-wider">
              Confidential — Prepared for Representative Mid-Market Staffing Firm ($50M Revenue)
            </p>
          </div>

          {/* ═══════════════ BODY ═══════════════ */}
          <div className="px-10 sm:px-16 py-14 space-y-12">

            {/* Purpose of This Document */}
            <section>
              <SectionHeading>Purpose of This Document</SectionHeading>
              <BodyText>
                This Executive Summary distills the findings and recommendations of the Profit Leak &amp; Operational Efficiency Diagnostic conducted by BaxterLabs Advisory for Representative Mid-Market Staffing Firm ($50M Revenue). The diagnostic comprised a structured analysis of financial data, operational workflows, and leadership interviews across all eight divisions. The full engagement deliverable package includes six documents: this Executive Summary, a Full Diagnostic Report, a Profit Leak Quantification Workbook, an Implementation Roadmap, an Executive Presentation Deck, and a Retainer Proposal.
              </BodyText>
            </section>

            {/* Headline Finding */}
            <section>
              <SectionHeading>Headline Finding</SectionHeading>
              <div className="border-l-4 border-[#005454] bg-[#005454]/5 px-6 py-5 rounded-r-sm">
                <BodyText>
                  BaxterLabs Advisory has identified <strong className="text-[#66151C]">$2,784,000</strong> (conservative) to <strong className="text-[#66151C]">$4,384,000</strong> (aggressive) in annual profit leak opportunity across Representative Mid-Market Staffing Firm ($50M Revenue), with a moderate scenario of <strong className="text-[#66151C]">$3,585,000</strong>. This represents approximately 15.2% of gross profit, distributed across 19 individually quantified findings spanning revenue leakage, cost inefficiency, and process bottleneck categories.
                </BodyText>
              </div>
            </section>

            <Divider />

            {/* Five Key Findings */}
            <section>
              <SectionHeading>Five Key Findings</SectionHeading>
              <div className="space-y-6">
                <Finding
                  number={1}
                  title="Executive Search Guarantee Erosion"
                  amount="$552,000"
                  confidence="moderate"
                >
                  Ambiguous engagement letter language and guarantee period creep from 60 to 90 days without repricing have reduced executive search replacement revenue by an estimated 18–22%. The practice has become normalized across divisions without management visibility into cumulative margin impact. Remediation requires outside counsel engagement letter revision (estimated $5,000–$10,000 one-time) and standardized guarantee language.
                </Finding>

                <Finding
                  number={2}
                  title="Legacy Account Rate Drift"
                  amount="$448,000"
                  confidence="moderate"
                >
                  Within-division bill rate compression of 160–180 basis points has accumulated over multiple renewal cycles, with 30–40% of active temp accounts priced below the current rate card. As one division leader described: "It doesn't show up as a client loss—it just shows up as every account quietly worth a little less than it used to be."
                </Finding>

                <Finding
                  number={3}
                  title="Underperforming Recruiter Optimization"
                  amount="$420,000"
                  confidence="moderate"
                >
                  The bottom 20% of individual recruiters (approximately 12–15 people) generate revenue below their fully loaded compensation cost, while the top quartile generates approximately 4.2× the output. The trainer tasked with development has "strong individual recruiting skills and limited training or instructional design experience." No formal performance management framework, minimum production thresholds, or structured improvement plans exist.
                </Finding>

                <Finding
                  number={4}
                  title="Below-Card Temp Account Pricing"
                  amount="$400,000"
                  confidence="moderate"
                >
                  The rate card exists as a spreadsheet on a shared drive with no enforcement mechanism, enabling division-level pricing discretion that has produced systematic below-card billing. One division leader estimated the total repricing opportunity at $300,000–$500,000 based on his own internal review.
                </Finding>

                <Finding
                  number={5}
                  title="Client Revenue Attrition"
                  amount="$338,000"
                  confidence="moderate"
                >
                  Three declining accounts represent a $600,000–$900,000 net revenue gap against a replacement pipeline of $1,200,000. Client A is unwinding permanently. Client B has shifted to FTE hiring. Client C consolidated vendors, and the firm was not selected for the preferred list. Sales headcount has declined from 35 to 27, a reduction of approximately 23% year-over-year, limiting pipeline recovery capacity.
                </Finding>
              </div>
            </section>

            <Divider />

            {/* Root Cause Analysis */}
            <section>
              <SectionHeading>Root Cause Analysis</SectionHeading>
              <BodyText>
                The 19 profit leaks are not 19 independent problems. They are symptoms of a single structural condition: the firm has scaled to $52 million in revenue across eight divisions without building the governance, pricing controls, or real-time financial visibility required at that scale.
              </BodyText>
              <BodyText className="mt-4">
                The structural diagnosis traces the 19 findings to four interconnected root causes. First, <strong>absent pricing governance</strong>: three of the five largest findings ($552,000 + $448,000 + $400,000 = $1,400,000) trace directly to pricing decisions made without enforcement or escalation mechanisms. Second, <strong>post-acquisition integration deficit</strong>: multiple findings cluster around systems, processes, and compensation structures that were never harmonized after prior acquisitions. Third, <strong>financial visibility lag</strong>: the CEO operates on financial data 6–8 weeks stale, and the outsourced CFO at approximately 10 hours per month delivers P&amp;L 3–4 weeks post-month-end with no real-time dashboard, no rolling forecast, and no margin-by-division reporting. Fourth, <strong>deferred management decisions</strong>: at least $280,000 in identifiable profit recovery is blocked by vendor proposals, headcount decisions, and policy changes that have been pending executive approval for six months or longer.
              </BodyText>
              <BodyText className="mt-4">
                These root causes converge in a balance sheet fragility loop. Stockholders' equity declined from $420,000 to $84,000 over six quarters. The revolving credit facility grew from $2,080,000 to $3,680,000. Interest coverage sits at 1.18× against a 1.25× covenant floor. The CEO contributed $200,000 in personal funds to meet payroll. The $3,585,000 in moderate-scenario profit leakage is not hypothetical upside—it is the structural gap between current performance and what the existing business can support.
              </BodyText>
            </section>

            <Divider />

            {/* Quick Wins — highlighted callout */}
            <section className="border-2 border-[#C9A84C]/50 bg-gradient-to-br from-[#F6E7C8]/20 to-[#FAF8F2] rounded-sm px-8 sm:px-10 py-10 shadow-sm">
              <p className="font-label text-[10px] uppercase tracking-[0.3em] text-[#C9A84C] mb-2 font-bold">Board-Level Highlight</p>
              <SectionHeading>Quick Wins: 90-Day Capture Opportunity</SectionHeading>
              <div className="border-l-4 border-[#C9A84C] bg-[#C9A84C]/5 px-6 py-4 rounded-r-sm mb-6">
                <p className="font-headline text-lg sm:text-xl text-[#66151C] font-bold leading-snug">
                  $1,761,000 in annual profit recovery is available within 90 days through executive decisions alone—no capital investment, no technology build.
                </p>
                <p className="text-sm text-[#2D3436]/70 mt-2">
                  This represents 49.1% of the total moderate opportunity.
                </p>
              </div>
              <BodyText>
                The mechanism is policy decisions and contract standardization: enforcing the existing rate card, standardizing executive search engagement letters, approving vendor proposals already on management's desk, and formalizing recruiter performance thresholds that division leaders have already identified informally. The Quick Wins include: rate card enforcement ($400,000), engagement letter standardization ($552,000), legacy account repricing ($448,000), payroll outsourcing ($90,000), benefits consolidation ($70,000), vendor renegotiation ($160,000), and duplicate subscription elimination ($41,000).
              </BodyText>
            </section>

            <Divider />

            {/* Path Forward */}
            <section>
              <SectionHeading>Path Forward</SectionHeading>
              <BodyText>
                Representative Mid-Market Staffing Firm is losing $3,585,000 per year in profit that is structurally recoverable. This is not a market condition or an economic cycle. It is an internal governance gap that has compounded as the firm scaled past $50 million in revenue without corresponding infrastructure.
              </BodyText>
              <BodyText className="mt-4">
                Every one of the 19 findings is addressable with tools, data, and relationships that already exist inside the firm. The rate card exists. The vendor proposals are on management's desk. The division leaders have identified underperforming recruiters. The outsourced CFO has the data to build a real-time margin dashboard. As the Head of Finance noted: "This isn't one problem. It's three problems that are adding up, and we've been managing each one separately without seeing the total."
              </BodyText>
              <BodyText className="mt-4">
                Three decisions in the first week, requiring no capital and no technology, would begin recovering $1,490,000 in annual profit: enforce the rate card (initiating recovery of $400,000 in below-card margin), approve the payroll outsourcing vendor proposal ($90,000 in duplicated cost), and issue standardized engagement letters to the executive search division ($552,000 in guarantee erosion).
              </BodyText>
              <BodyText className="mt-4">
                BaxterLabs Advisory offers ongoing implementation support through a retainer engagement. Details are provided in the companion Retainer Proposal.
              </BodyText>
            </section>

            <Divider />

            {/* Footer sign-off */}
            <div className="text-center pt-4 pb-2">
              <p className="text-sm text-[#2D3436]/70 mb-6">
                George DeVries&nbsp;&nbsp;|&nbsp;&nbsp;Managing Partner&nbsp;&nbsp;|&nbsp;&nbsp;BaxterLabs Advisory
              </p>
              <div className="w-12 h-px bg-[#C9A84C]/40 mx-auto mb-6" />
              <p className="text-[10px] text-[#2D3436]/40 uppercase tracking-wider max-w-md mx-auto leading-relaxed">
                This document is a representative sample prepared for illustration purposes only. It does not represent any specific client, engagement, or financial data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Sub-components ─── */

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
