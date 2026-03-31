import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function Services() {
  return (
    <>
      <SEO
        title="The 14-Day Executive Profit Leak Diagnostic | BaxterLabs"
        description="A rigorous, structured diagnostic engineered for firms with $5M–$50M in annual revenue. We identify significant, recoverable cash flow lost to misaligned financial controls."
      />

      {/* Hero */}
      <section className="px-8 md:px-16 lg:px-24 py-24 md:py-32">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-headline italic font-semibold text-primary leading-tight mb-12 tracking-tight">
            The 14-Day Executive <br />Profit Leak Diagnostic.
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2">
              <p className="text-xl md:text-2xl text-on-surface-variant font-light leading-relaxed">
                A rigorous, structured diagnostic engineered for firms with <span className="text-on-surface font-medium">$5M–$50M in annual revenue</span>. We identify significant, recoverable cash flow lost to misaligned financial controls and operational friction.
              </p>
            </div>
            <div className="flex items-end">
              <div className="h-px w-full bg-outline-variant/30 hidden md:block mb-4" />
            </div>
          </div>
        </div>
      </section>

      {/* What You Receive (Deliverables) */}
      <section className="bg-surface-container-low py-32 px-8 md:px-16 lg:px-24 border-y border-surface-container">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-secondary font-semibold uppercase tracking-widest text-xs mb-4 block">The Deliverables</span>
            <h2 className="text-4xl font-headline text-on-surface mb-2">The Diagnostic Package</h2>
            <p className="text-on-surface-variant text-lg font-medium opacity-80">Each engagement produces a complete, executive-ready diagnostic package.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Executive Summary */}
            <div className="md:col-span-8 bg-surface-container-lowest p-12 rounded-sm shadow-[0_30px_60px_rgba(29,28,23,0.08)] flex flex-col justify-between group border-l-4 border-primary transform scale-[1.02] z-10">
              <div>
                <span className="material-symbols-outlined text-primary mb-8 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                <h3 className="text-3xl font-semibold mb-6 text-on-surface font-headline italic">Executive Summary</h3>
                <p className="text-on-surface-variant text-lg leading-relaxed max-w-xl">
                  A board-ready overview of key findings, risk exposure, and high-priority recovery actions distilled for immediate leadership review. This is the cornerstone of the diagnostic output.
                </p>
              </div>
            </div>
            {/* Quant Workbook */}
            <div className="md:col-span-4 bg-secondary p-10 rounded-sm flex flex-col justify-between shadow-lg">
              <div>
                <span className="material-symbols-outlined mb-6 text-3xl text-on-primary/80" style={{ fontVariationSettings: "'FILL' 1" }}>calculate</span>
                <h3 className="text-2xl font-semibold mb-4 font-headline italic text-on-primary/80">Profit Leak Quantification Workbook</h3>
                <p className="text-on-primary/80 text-sm leading-relaxed">
                  The underlying financial model showing exactly where margin is eroding and the specific recovery potential per category.
                </p>
              </div>
            </div>
            {/* Full Diagnostic */}
            <div className="md:col-span-4 bg-surface-container-highest p-10 rounded-sm flex flex-col justify-between border border-outline-variant/10">
              <div>
                <span className="material-symbols-outlined text-primary mb-6 text-3xl">fact_check</span>
                <h3 className="text-xl font-semibold mb-4 text-on-surface">Full Diagnostic Report</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Complete analysis of every identified profit leak with root cause identification and quantified P&amp;L impact.
                </p>
              </div>
            </div>
            {/* Roadmap */}
            <div className="md:col-span-4 bg-surface-container-lowest p-10 rounded-sm border border-outline-variant/20 shadow-sm">
              <div>
                <span className="material-symbols-outlined text-secondary mb-6 text-3xl">architecture</span>
                <h3 className="text-xl font-semibold mb-4 text-on-surface">Implementation Roadmap</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  A prioritized 90-day action plan tied directly to diagnostic findings, designed for internal execution or supported growth.
                </p>
              </div>
            </div>
            {/* Presentation & Retainer */}
            <div className="md:col-span-4 flex flex-col gap-6">
              <div className="bg-primary text-on-primary p-8 rounded-sm flex-1 flex items-center gap-4 shadow-md">
                <span className="material-symbols-outlined">present_to_all</span>
                <span className="font-medium text-sm">Executive Presentation Deck</span>
              </div>
              <div className="bg-surface-container-highest p-8 rounded-sm flex-1 flex items-center gap-4 text-on-surface-variant border border-outline-variant/20">
                <span className="material-symbols-outlined">handshake</span>
                <span className="font-medium text-sm">Phase 2 Retainer Proposal (Optional)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How the Diagnostic Works */}
      <section className="bg-primary text-on-primary py-32 px-8 md:px-16 lg:px-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-headline italic mb-24 text-center">How the Diagnostic Works</h2>
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
            <h2 className="text-4xl font-headline text-on-surface mb-8">Delivery Model</h2>
            <p className="text-xl text-on-surface-variant leading-relaxed mb-8">
              Findings are presented in an <span className="text-primary font-bold italic">executive debrief</span>, followed by delivery of the full diagnostic package.
            </p>
            <p className="text-on-surface-variant mb-12 text-lg">
              We prioritize intellectual clarity. The debrief ensures leadership fully understands the 'why' before being handed the 'how' within the comprehensive documentation.
            </p>
            <div className="p-8 border-l-4 border-primary bg-surface-container-low shadow-sm">
              <span className="text-xs font-bold text-secondary uppercase tracking-[0.2em] mb-4 block">Primary Preview</span>
              <Link to="/get-started" className="flex flex-col text-left group">
                <span className="flex items-center gap-3 text-2xl font-headline italic font-bold text-primary transition-colors group-hover:text-primary-container">
                  View Sample Executive Summary
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </span>
                <span className="text-sm text-on-surface-variant mt-2 font-medium opacity-80">
                  Representative output illustrating the structure and depth of the diagnostic. No downloads required.
                </span>
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] bg-surface-container-highest rounded-sm shadow-2xl p-1 relative overflow-hidden border border-outline-variant/10">
              <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center z-10">
                <div className="text-center">
                  <span className="material-symbols-outlined text-7xl text-primary/30 mb-4 block">lock</span>
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/40">Secured Document Preview</p>
                </div>
              </div>
              <div className="p-12 space-y-8 opacity-40">
                <div className="h-10 w-2/3 bg-primary/10" />
                <div className="space-y-3">
                  <div className="h-4 w-full bg-on-surface-variant/10" />
                  <div className="h-4 w-full bg-on-surface-variant/10" />
                  <div className="h-4 w-4/5 bg-on-surface-variant/10" />
                </div>
                <div className="grid grid-cols-2 gap-6 mt-16">
                  <div className="h-32 bg-secondary/5 border border-secondary/10" />
                  <div className="h-32 bg-secondary/5 border border-secondary/10" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10" />
          </div>
        </div>
      </section>

      {/* Data Handling & Confidentiality */}
      <section className="py-32 px-8 md:px-16 lg:px-24 bg-surface-container-low border-y border-surface-container">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="material-symbols-outlined text-secondary text-5xl mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            <h2 className="text-4xl font-headline text-on-surface mb-4">Data Handling &amp; Confidentiality</h2>
            <p className="text-on-surface-variant font-medium">As standard professional practice, we prioritize your firm's data integrity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
            {[
              { icon: 'gavel', title: 'Mutual NDA', desc: 'Execution of a standard non-disclosure agreement prior to any data exchange.' },
              { icon: 'encrypted', title: 'Controlled Access', desc: 'Financial data is handled within secure, isolated environments with zero external visibility.' },
              { icon: 'block', title: 'No External Use', desc: 'Client data is never aggregated, anonymized for third parties, or used outside of the engagement.' },
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
          <h2 className="text-5xl font-headline text-on-surface mb-8 italic">Strategic Post-Diagnostic Execution.</h2>
          <p className="text-on-surface-variant text-xl leading-relaxed mb-16">
            While the diagnostic provides a standalone roadmap for internal execution, we offer a <span className="text-primary font-bold">Phase 2 Retainer</span> for firms requiring external governance and technical advisory during implementation.
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
          <Link to="/services" className="inline-block text-primary font-bold border-b-2 border-primary pb-1 hover:text-primary-container hover:border-primary-container transition-all">
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
            Stop the bleed. Quantify the recovery. Limited intake availability for Q1 engagements.
          </p>
          <div className="flex flex-col items-center">
            <Link
              to="/get-started"
              className="bg-primary text-on-primary px-16 py-6 rounded-sm text-sm font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-primary-container transition-all transform hover:scale-105"
            >
              Request Diagnostic Review
            </Link>
            <p className="mt-8 text-xs text-on-surface-variant/60 font-medium uppercase tracking-[0.2em]">Consultation for Revenue $5M - $50M</p>
          </div>
        </div>
      </section>
    </>
  )
}
