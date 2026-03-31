import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function Home() {
  return (
    <>
      <SEO
        title="BaxterLabs Advisory | Executive Profit Recovery"
        description="Most firms operate with significant, unidentified leakage. BaxterLabs delivers a 14-day executive diagnostic identifying specific, recoverable cash flow lost to misaligned financial controls."
      />

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 py-24 md:py-44 overflow-hidden bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display italic text-4xl md:text-7xl text-primary leading-[1.02] mb-4">
            Quantify and Recover Material Annualized Profit Leakage.
          </h1>
          <p className="font-headline italic text-secondary/80 text-xl md:text-2xl mb-8">
            Most firms don't know where profit is leaking. We make it visible.
          </p>
          <p className="font-headline font-bold text-secondary text-xl md:text-2xl mb-8 leading-snug">
            Most firms operate with significant, unidentified leakage—often losing 5–12% of EBITDA to operational friction they haven't yet quantified.
          </p>
          <p className="font-body text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
            For professional service firms with $5M–$50M in revenue. A 14-day executive diagnostic identifying specific, recoverable cash flow lost to misaligned financial controls.
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <Link
              to="/get-started"
              className="bg-primary text-on-primary px-12 py-5 rounded-sm font-label text-sm uppercase tracking-widest font-bold shadow-lg hover:bg-primary-container transition-all"
            >
              Start Your Diagnostic
            </Link>
            <div className="flex flex-col items-center">
              <Link
                to="/get-started"
                className="border-b border-secondary text-secondary px-6 py-3 font-label text-sm uppercase tracking-widest font-bold hover:text-primary hover:border-primary transition-all"
              >
                View Sample Executive Summary
              </Link>
              <p className="mt-2 text-[10px] text-on-surface/60 uppercase tracking-tighter">
                Representative output illustrating the structure and depth of the 14-day diagnostic.
              </p>
            </div>
          </div>
          <p className="mt-10 text-sm text-on-surface-variant/70 max-w-xl mx-auto leading-relaxed">
            Each engagement is executed through a structured, proprietary diagnostic process designed for speed, accuracy, and confidentiality.
          </p>
        </div>
      </section>

      {/* Credibility Section */}
      <section className="bg-surface-container-low px-6 md:px-12 py-24 border-y border-surface-container">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <span className="font-label text-secondary uppercase tracking-[0.3em] text-xs font-bold block mb-4">
                Experienced Finance Operators
              </span>
              <h2 className="font-display text-4xl text-secondary leading-tight">
                Led Exclusively by Partners with 25+ Years of Real-World P&amp;L Ownership.
              </h2>
            </div>
            <div className="space-y-6">
              <p className="text-on-surface-variant text-lg leading-relaxed">
                Unlike software tools or generic consulting firms that deploy junior staff to learn on your time, we are experienced finance operators who have sat in the seat, managed the financials, and owned the outcomes. We operate as an extension of your executive team, leveraging 25+ years of real-world P&amp;L ownership to identify material leakage.
              </p>
              <div className="h-px w-24 bg-secondary" />
              <p className="text-on-surface-variant font-medium italic">
                "Precision is the difference between a forecast and a strategy."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The 14-Day Diagnostic */}
      <section className="bg-surface-container-lowest px-6 md:px-12 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl text-secondary mb-4">
              The 14-Day Executive Profit Leak Diagnostic
            </h2>
            <p className="text-secondary uppercase tracking-widest text-sm font-semibold">
              Three Phases to Absolute Financial Clarity
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Phase 1 */}
            <div className="bg-surface-container-low p-10 rounded-sm flex flex-col justify-between group hover:border-secondary border border-transparent transition-all">
              <div>
                <span className="text-5xl font-display italic text-secondary/20 mb-6 block">01</span>
                <h3 className="font-headline text-2xl font-bold text-secondary mb-4">Forensic Data Integration</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  We establish a secure, encrypted pipeline for your financial data. No generic surveys—just raw, unfiltered data ingestion for true analysis.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-secondary font-bold text-sm uppercase tracking-tighter">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_person</span>
                Secure Protocols
              </div>
            </div>
            {/* Phase 2 */}
            <div className="bg-secondary p-10 rounded-sm flex flex-col justify-between text-on-primary shadow-xl">
              <div>
                <span className="text-5xl font-display italic text-on-primary/30 mb-6 block">02</span>
                <h3 className="font-headline text-2xl font-bold mb-4">Leakage Diagnostics &amp; Modeling</h3>
                <p className="text-on-primary/80 leading-relaxed">
                  Our proprietary algorithms and 25 years of experience clash to find hidden overhead, inefficient capital allocation, and missed revenue triggers.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 font-bold text-sm uppercase tracking-tighter">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                Deep Analysis
              </div>
            </div>
            {/* Phase 3 */}
            <div className="bg-surface-container-low p-10 rounded-sm flex flex-col justify-between group hover:border-secondary border border-transparent transition-all">
              <div>
                <span className="text-5xl font-display italic text-secondary/20 mb-6 block">03</span>
                <h3 className="font-headline text-2xl font-bold text-secondary mb-4">Executive Recovery Roadmap</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  You receive a direct executive summary. No fluff. Just specific actions to recover significant EBITDA within 90 days.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-secondary font-bold text-sm uppercase tracking-tighter">
                <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_turned_in</span>
                Actionable Roadmap
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section (NDA/Data Integrity) */}
      <section className="bg-primary text-on-primary px-6 md:px-12 py-24 overflow-hidden relative">
        <div className="max-w-7xl mx-auto relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-on-primary/10 border border-on-primary/20 rounded-sm">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span className="text-xs font-label uppercase tracking-widest font-bold">Standard Professional Practice</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl mb-8">Data Integrity &amp; Professional Standards.</h2>
            <p className="text-on-primary/80 text-lg leading-relaxed mb-6">
              We operate with the confidentiality of an internal finance team. As standard professional practice, a mutual confidentiality agreement (NDA) is executed prior to any data intake. All data is handled through a structured, controlled, and auditable protocol.
            </p>
            <div className="flex items-center gap-4 py-4 border-y border-on-primary/20">
              <span className="material-symbols-outlined text-3xl">lock</span>
              <p className="text-sm font-label uppercase tracking-widest font-semibold">STRICT GOVERNANCE PROTOCOLS</p>
            </div>
          </div>
          {/* Human Advantage — teal box */}
          <div className="bg-secondary p-8 rounded-sm border border-on-primary/10">
            <div className="flex items-start gap-4 mb-6">
              <span className="material-symbols-outlined text-surface-container-highest bg-on-primary/20 p-2 rounded-sm" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
              <div>
                <h4 className="font-bold text-xl mb-2 text-on-primary">The Human Advantage</h4>
                <p className="text-sm text-on-primary/80 italic">
                  AI-enabled modeling is our tool, but experience is the artist. We use advanced analytics as a support system, ensuring every insight is triple-verified by senior human partners with real-world P&amp;L ownership.
                </p>
              </div>
            </div>
            <div className="text-xs uppercase tracking-tighter text-on-primary/50 text-right">Auditable &amp; Non-Generative Workflows</div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="bg-surface-container-low px-6 md:px-12 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-4xl text-secondary mb-4">Quantified, Prioritized, and Repeatable Outcomes.</h2>
              <p className="text-on-surface-variant">
                Every engagement produces a quantified, prioritized, and repeatable set of profit leaks for immediate recovery. Our methodology ensures consistent, auditable findings across every firm we analyze.
              </p>
            </div>
            <div className="hidden md:block h-px flex-grow bg-outline-variant mx-12" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container-lowest p-8 rounded-sm shadow-sm border-b-4 border-secondary transition-transform hover:-translate-y-2">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-6 leading-tight">
                Quantified forensic analysis of immediate recovery targets.
              </p>
              <h3 className="font-display text-4xl text-secondary mb-2">$425,000</h3>
              <p className="text-xs text-secondary font-bold uppercase">ANNUAL RECURRING RECOVERY</p>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-sm shadow-sm border-b-4 border-primary transition-transform hover:-translate-y-2">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-6 leading-tight">
                Every finding is backed by auditable data trails and repeatable methodology.
              </p>
              <h3 className="font-display text-4xl text-secondary mb-2">100%</h3>
              <p className="text-xs text-secondary font-bold uppercase">AUDITABLE FINDINGS</p>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-sm shadow-sm border-b-4 border-secondary transition-transform hover:-translate-y-2">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-6 leading-tight">
                Time from data intake to full executive recovery roadmap.
              </p>
              <h3 className="font-display text-4xl text-secondary mb-2">14 Days</h3>
              <p className="text-xs text-secondary font-bold uppercase">TOTAL DURATION</p>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-sm shadow-sm border-b-4 border-primary transition-transform hover:-translate-y-2">
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-6 leading-tight">
                Median return on investment for the diagnostic engagement.
              </p>
              <h3 className="font-display text-4xl text-secondary mb-2">12.5x</h3>
              <p className="text-xs text-secondary font-bold uppercase">ON ADVISORY FEE</p>
            </div>
          </div>
        </div>
      </section>

      {/* Implementation Section */}
      <section className="bg-surface px-6 md:px-12 py-32 border-t border-surface-container">
        <div className="max-w-4xl mx-auto text-center">
          <span className="font-label text-secondary uppercase tracking-[0.3em] text-xs font-bold block mb-6">Post-Diagnostic Support</span>
          <h2 className="font-display text-5xl text-secondary mb-8">Strategic Post-Diagnostic Execution.</h2>
          <p className="text-on-surface-variant text-xl leading-relaxed mb-12">
            The diagnostic identifies the leaks; the implementation retainer ensures they stay closed. For firms requiring continued excellence, we offer optional high-touch support to manage the execution of all recommended recovery strategies.
          </p>
          <div className="grid md:grid-cols-3 gap-8 mb-12 text-left">
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
      <section className="bg-surface-container-highest px-6 md:px-12 py-24 border-t border-surface-container">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-5xl md:text-6xl text-primary mb-8 leading-tight">Secure Your Diagnostic.</h2>
          <p className="text-on-surface-variant text-xl mb-12">Stop the bleed. Quantify the recovery. Selective client intake.</p>
          <div className="flex justify-center">
            <Link
              to="/get-started"
              className="bg-primary text-on-primary px-12 py-6 rounded-sm font-label text-sm uppercase tracking-[0.3em] font-bold shadow-xl hover:bg-primary-container transition-all"
            >
              Start Your Diagnostic
            </Link>
          </div>
          <p className="mt-8 text-sm text-on-surface-variant/60 font-medium">
            A mutual confidentiality agreement (NDA) is executed prior to any data intake.
          </p>
        </div>
      </section>
    </>
  )
}
