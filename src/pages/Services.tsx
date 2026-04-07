import { useState } from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'
import ExecutiveSummaryLightbox from '../components/ExecutiveSummaryLightbox'

const deliverables = [
  { icon: 'analytics', label: 'Executive Summary' },
  { icon: 'fact_check', label: 'Full Diagnostic Report' },
  { icon: 'architecture', label: 'Implementation Roadmap' },
  { icon: 'calculate', label: 'Profit Leak Quantification Workbook' },
  { icon: 'present_to_all', label: 'Executive Presentation Deck' },
  { icon: 'handshake', label: 'Retainer Proposal' },
]

const deliverableDetails = [
  {
    icon: 'analytics',
    label: 'Executive Summary',
    what: 'A board-ready overview of key findings, risk exposure, and high-priority recovery actions.',
    why: 'Gives leadership a clear, defensible picture of where margin is leaking and what to address first — designed to drive decisions, not sit in a drawer.',
  },
  {
    icon: 'fact_check',
    label: 'Full Diagnostic Report',
    what: 'Complete analysis of every identified profit leak with root cause identification and quantified P&L impact.',
    why: 'Ensures your team fixes the actual problem behind each leak, not just the visible symptom.',
  },
  {
    icon: 'architecture',
    label: 'Implementation Roadmap',
    what: 'A prioritized 90-day action plan sequenced by impact and tied directly to diagnostic findings.',
    why: 'Turns analysis into execution your team can begin immediately, without outside dependencies.',
  },
  {
    icon: 'calculate',
    label: 'Profit Leak Quantification Workbook',
    what: 'The underlying financial model showing exactly where margin is eroding and the recovery potential per category.',
    why: 'Lets you prioritize fixes by actual dollar recovery value rather than intuition or guesswork.',
  },
  {
    icon: 'present_to_all',
    label: 'Executive Presentation Deck',
    what: 'A structured slide deck summarizing findings, priorities, and recommended actions for stakeholder alignment.',
    why: 'Provides a ready-made format for presenting the diagnostic to boards, partners, or leadership teams.',
  },
  {
    icon: 'handshake',
    label: 'Retainer Proposal',
    what: 'A scoped proposal for ongoing advisory and implementation support, included optionally with every engagement.',
    why: 'Provides a clear path forward for firms that want external governance during execution — with no obligation.',
  },
]

export default function Services() {
  const [showSample, setShowSample] = useState(false)
  return (
    <>
      <SEO
        title="The 14-Day Executive Profit Leak Diagnostic | BaxterLabs"
        description="A rigorous, structured diagnostic engineered for firms with $5M–$50M in annual revenue. We identify significant, recoverable cash flow lost to misaligned financial controls."
      />

      {/* Hero */}
      <section className="px-8 md:px-16 lg:px-24 py-24 md:py-32">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <h1 className="text-5xl md:text-7xl font-headline italic font-semibold text-primary leading-tight mb-12 tracking-tight">
              The 14-Day Executive <br />Profit Leak Diagnostic.
            </h1>
            <p className="text-xl md:text-2xl text-on-surface-variant font-light leading-relaxed mb-6">
              A rigorous, structured diagnostic engineered for firms with <span className="text-on-surface font-medium">$5M–$50M in annual revenue</span>. We identify significant, recoverable cash flow lost to misaligned financial controls and operational friction.
            </p>
            <p className="text-on-surface-variant/70 text-sm leading-relaxed">
              This is not an open-ended consulting engagement. It is a structured diagnostic process with defined inputs, timelines, and outputs.
            </p>
          </div>
          {/* Deliverables snapshot */}
          <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-sm shadow-lg lg:mt-4 overflow-hidden">
            <div className="bg-secondary px-10 py-5">
              <span className="font-label text-on-primary uppercase tracking-[0.3em] text-xs font-bold">What You Receive</span>
            </div>
            <div className="px-10 py-8">
              <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                {deliverables.map((d) => (
                  <div key={d.label} className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary text-lg shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{d.icon}</span>
                    <span className="text-on-surface font-medium text-sm leading-tight">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-10 pb-8">
              <div className="flex items-center gap-3 pt-5 border-t border-outline-variant/20">
                <span className="material-symbols-outlined text-secondary text-lg">schedule</span>
                <p className="text-xs text-on-surface-variant font-label font-medium uppercase tracking-widest">Complete executive-ready package in 14 days</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How the Diagnostic Translates Into Action */}
      <section className="bg-surface-container-low py-32 px-8 md:px-16 lg:px-24 border-y border-surface-container">
        <div className="max-w-5xl mx-auto">
          <div className="mb-20">
            <span className="text-secondary font-semibold uppercase tracking-widest text-xs mb-4 block">Beyond the Package</span>
            <h2 className="text-4xl font-headline text-secondary mb-4">How the Diagnostic Translates Into Action</h2>
            <p className="text-on-surface-variant text-lg font-medium opacity-80">Each component of the diagnostic is designed to move from identification to quantified action.</p>
          </div>
          <div className="space-y-16">
            {deliverableDetails.map((d) => (
              <div key={d.label} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-x-8 gap-y-4 items-start">
                <span className="material-symbols-outlined text-secondary text-3xl mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>{d.icon}</span>
                <div>
                  <h3 className="text-xl font-semibold text-on-surface mb-3 font-headline italic">{d.label}</h3>
                  <p className="text-on-surface-variant text-base leading-relaxed mb-2">{d.what}</p>
                  <p className="text-secondary/80 text-sm leading-relaxed font-medium">{d.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How the Diagnostic Works */}
      <section className="bg-secondary text-on-primary py-32 px-8 md:px-16 lg:px-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-headline italic mb-6 text-center">How the Diagnostic Works</h2>
          <p className="text-on-primary/60 text-sm text-center mb-24 max-w-xl mx-auto">
            Each engagement begins with pre-call analysis using publicly available data and internal research models.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {[
              { num: '01', title: 'Data Collection', desc: 'Structured gathering and analysis of internal financial data and operational workflows.' },
              { num: '02', title: 'Identification', desc: 'Precision detection and quantification of leakage points across the value chain.' },
              { num: '03', title: 'Executive Debrief', desc: 'Direct presentation of high-level findings and immediate strategic priorities.' },
              { num: '04', title: 'Package Delivery', desc: 'Handover of the complete documentation package and implementation roadmap.' },
            ].map((step) => (
              <div key={step.num} className="relative">
                <span className="text-7xl font-display font-bold opacity-10 absolute -top-12 -left-6 italic">{step.num}</span>
                <h4 className="text-xl font-semibold mb-4">{step.title}</h4>
                <p className="text-on-primary/70 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delivery Model */}
      <section className="py-32 px-8 md:px-16 lg:px-24 bg-surface">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <div>
            <h2 className="text-4xl font-headline text-secondary mb-8">Delivery Model</h2>
            <p className="text-xl text-on-surface-variant leading-relaxed mb-8">
              Findings are presented in an <span className="text-secondary font-bold italic">executive debrief</span>, followed by delivery of the full diagnostic package.
            </p>
            <p className="text-on-surface-variant mb-12 text-lg">
              We prioritize intellectual clarity. The debrief ensures leadership fully understands the 'why' before being handed the 'how' within the comprehensive documentation.
            </p>
            <div className="p-8 border-l-4 border-secondary bg-surface-container-low shadow-sm">
              <span className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-4 block">Primary Preview</span>
              <button onClick={() => setShowSample(true)} className="flex flex-col text-left group cursor-pointer">
                <span className="flex items-center gap-3 text-2xl font-headline italic font-bold text-secondary transition-colors group-hover:text-primary">
                  View Sample Executive Summary
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </span>
                <span className="text-sm text-on-surface-variant mt-2 font-medium opacity-80">
                  Representative output illustrating the structure and depth of the diagnostic. No downloads required.
                </span>
              </button>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSample(true)}
              className="aspect-[4/5] w-full bg-[#FAF8F2] rounded-sm shadow-2xl p-8 sm:p-10 relative overflow-hidden border border-outline-variant/10 text-left cursor-pointer group transition-shadow hover:shadow-3xl"
              aria-label="Preview Sample Executive Summary"
            >
              {/* Fade-out overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FAF8F2] to-transparent z-10 pointer-events-none" />
              {/* Hover prompt */}
              <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/5">
                <span className="bg-white/95 shadow-lg rounded-sm px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">visibility</span>
                  Preview Document
                </span>
              </div>
              {/* Mini title page replica */}
              <div className="text-center">
                <p className="text-[7px] uppercase tracking-[0.2em] text-[#C9A84C] font-bold mb-3">Sample Deliverable</p>
                <img
                  src="/images/sample-deliverables/exec-summary/logo-mascot.png"
                  alt=""
                  className="h-10 w-auto mx-auto mb-4 opacity-80"
                />
                <p className="font-label text-[7px] uppercase tracking-[0.25em] text-secondary mb-1">BaxterLabs Advisory</p>
                <p className="font-headline text-lg sm:text-xl text-primary leading-tight mb-1">Executive Summary</p>
                <p className="font-headline italic text-[11px] text-secondary mb-4">Profit Leak &amp; Operational Efficiency Diagnostic</p>
                <div className="w-8 h-px bg-[#C9A84C] mx-auto mb-4" />
                <p className="text-[8px] uppercase tracking-wider text-on-surface-variant/50 mb-1">Prepared for</p>
                <p className="font-headline text-xs text-on-surface/80 mb-6">Regional Staffing Firm (Illustrative Example)</p>
              </div>
              {/* Mini content hint */}
              <div className="space-y-3 mt-2">
                <p className="font-headline text-[10px] text-primary font-bold">Headline Finding</p>
                <div className="border-l-2 border-secondary/30 pl-3">
                  <p className="text-[8px] leading-relaxed text-on-surface/60">
                    BaxterLabs Advisory has identified <span className="font-bold text-primary">$2,784,000</span> to <span className="font-bold text-primary">$4,384,000</span> in annual profit leak opportunity&hellip;
                  </p>
                </div>
                <div className="mt-3">
                  <img
                    src="/images/sample-deliverables/exec-summary/chart-profit-leak-by-category.png"
                    alt=""
                    className="w-full rounded-sm opacity-70"
                  />
                </div>
              </div>
            </button>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-secondary/5 rounded-full blur-[80px] -z-10" />
          </div>
        </div>
      </section>

      {/* Data Handling & Confidentiality */}
      <section className="py-32 px-8 md:px-16 lg:px-24 bg-surface-container-low border-y border-surface-container">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="material-symbols-outlined text-secondary text-5xl mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            <h2 className="text-4xl font-headline text-secondary mb-4">Data Handling &amp; Confidentiality</h2>
            <p className="text-on-surface-variant font-medium max-w-2xl mx-auto">All engagements operate under strict confidentiality protocols and are executed through a controlled, access-managed workflow designed for sensitive financial and operational data.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
            {[
              { icon: 'gavel', title: 'Mutual NDA', desc: 'Execution of a standard non-disclosure agreement prior to any data exchange.' },
              { icon: 'encrypted', title: 'Encrypted & Access-Controlled', desc: 'All client data is encrypted in transit and at rest, with strict access controls and confidentiality protocols governing every engagement.' },
              { icon: 'block', title: 'No External Use', desc: 'Client data is never aggregated, shared with third parties, or used outside the scope of the engagement. Confidential handling of client information is non-negotiable.' },
              { icon: 'delete_forever', title: 'Destruction Protocol', desc: 'Option for full secure return or verified destruction of all datasets post-delivery.' },
            ].map((item) => (
              <div key={item.icon} className="flex gap-4 p-4 hover:bg-surface-container-lowest transition-colors rounded-sm">
                <span className="material-symbols-outlined text-secondary text-2xl">{item.icon}</span>
                <p className="text-sm text-on-surface-variant">
                  <strong className="text-on-surface block mb-1 text-base">{item.title}</strong>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Optional Implementation Support */}
      <section className="py-32 px-8 md:px-16 lg:px-24 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-secondary font-bold uppercase tracking-[0.3em] text-xs mb-8 block">Continuous Excellence</span>
          <h2 className="text-5xl font-headline text-secondary mb-8 italic">Strategic Post-Diagnostic Execution.</h2>
          <p className="text-on-surface-variant text-xl leading-relaxed mb-16">
            While the diagnostic provides a standalone roadmap for internal execution, we offer a <span className="text-secondary font-bold">Retainer</span> for firms requiring external governance and technical advisory during implementation.
          </p>
          <div className="grid md:grid-cols-3 gap-8 mb-16 text-left">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="text-on-surface font-medium">Direct access to Lead Partner</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="text-on-surface font-medium">Monthly performance audits</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="text-on-surface font-medium">Executive change management</span>
            </div>
          </div>
          <Link to="/services" className="inline-block text-secondary font-bold border-b-2 border-secondary pb-1 hover:text-primary hover:border-primary transition-all">
            Learn More About Implementation
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-8 md:px-16 lg:px-24 bg-surface-container-highest border-t border-surface-container">
        <div className="max-w-5xl mx-auto p-12 md:p-20 text-center relative overflow-hidden bg-surface-container-lowest shadow-2xl rounded-sm">
          <div className="absolute top-0 right-0 w-80 h-80 bg-secondary/5 rounded-full blur-[100px] -z-10 -mr-40 -mt-40" />
          <h2 className="text-5xl md:text-6xl font-headline text-primary mb-8 leading-tight italic">Start Your Diagnostic.</h2>
          <p className="text-on-surface-variant text-xl mb-16 max-w-2xl mx-auto leading-relaxed">
            Stop the bleed. Quantify the recovery. Selective client intake.
          </p>
          <div className="flex flex-col items-center">
            <Link
              to="/get-started"
              className="bg-primary text-on-primary px-16 py-6 rounded-sm text-sm font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-primary-container transition-all transform hover:scale-105"
            >
              Start Your Diagnostic
            </Link>
            <p className="mt-8 text-xs text-on-surface-variant/60 font-medium uppercase tracking-[0.2em]">Consultation for Revenue $5M - $50M</p>
          </div>
        </div>
      </section>

      <ExecutiveSummaryLightbox isOpen={showSample} onClose={() => setShowSample(false)} />
    </>
  )
}
