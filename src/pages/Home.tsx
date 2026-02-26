import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function Home() {
  return (
    <>
      <SEO
        title="BaxterLabs Advisory | 14-Day Profit Leak Diagnostic"
        description="BaxterLabs Advisory delivers a 14-day fixed-fee diagnostic that pinpoints where your business is losing margin. $12,500 all-in. Board-ready deliverables."
      />

      {/* Hero */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-crimson mb-6">
            Get Back in Control of Your Margins.
          </h1>
          <p className="text-lg md:text-xl text-charcoal max-w-3xl mx-auto mb-10">
            BaxterLabs Advisory delivers a 14-day fixed-fee diagnostic that pinpoints exactly where your business is losing margin — and shows you how to get it back.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center px-8 h-12 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90 text-base"
            >
              Book a Discovery Call
            </Link>
            <a
              href="#process"
              className="inline-flex items-center text-teal font-semibold hover:underline text-base"
            >
              See How It Works
              <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="bg-teal py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold text-gold mb-1">$400K+</p>
              <p className="text-white/80 text-sm">Avg. profit leaks identified per engagement</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-gold mb-1">14 Days</p>
              <p className="text-white/80 text-sm">Fixed-scope, fixed-fee engagement</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold text-gold mb-1">$12,500</p>
              <p className="text-white/80 text-sm">All-in fee. No surprises.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Block */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-8 text-center">
            You're growing. So why are margins shrinking?
          </h2>
          <div className="space-y-5 text-charcoal text-base md:text-lg">
            <p>
              Most growth-stage businesses hit a wall somewhere between $5M and $50M. Revenue climbs. Headcount grows. But margins don't move — or worse, they compress. The culprit is almost always the same: profit leaking quietly through overspend, inefficiency, billing lag, and operational drag that nobody has had the time to quantify.
            </p>
            <p>
              Most owners know something is wrong. They just don't know exactly where — or how much.
            </p>
            <p className="font-semibold text-teal text-lg md:text-xl">
              That's what we fix.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Block */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-8 text-center">
            A 14-Day Diagnostic That Pays for Itself.
          </h2>
          <p className="text-charcoal text-base md:text-lg">
            The BaxterLabs 14-Day Profit Leak &amp; Operational Efficiency Diagnostic is a fixed-scope, fixed-fee engagement that delivers enterprise-level analytical rigor in two weeks. We collect your financials, interview your leadership, map your workflows, and hand you a board-ready report that tells you exactly what's leaking, how much, and how to stop it.
          </p>
        </div>
      </section>

      {/* 3 Feature Cards */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Fixed Scope. Fixed Fee.',
                body: '$12,500. No hourly billing, no scope creep, no surprises.',
              },
              {
                title: 'Outcome-Quantified.',
                body: 'Every finding is tied to a dollar value. You see the ROI before committing.',
              },
              {
                title: 'Board-Ready Deliverables.',
                body: 'A full diagnostic report + executive debrief your leadership team can act on.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-white border-l-4 border-l-crimson rounded-lg p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-teal mb-3">{card.title}</h3>
                <p className="text-charcoal">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Block */}
      <section id="process" className="bg-white py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-12 text-center">
            How It Works
          </h2>
          <div className="space-y-8">
            {[
              { step: 1, title: 'Data Intake', body: 'You share your financials, payroll, and vendor data. We handle the analysis.' },
              { step: 2, title: 'Leadership Interviews', body: 'We conduct structured interviews with your owner and operations lead.' },
              { step: 3, title: 'Profit Leak Quantification', body: 'We model and dollar-quantify every identified inefficiency.' },
              { step: 4, title: 'Report Assembly', body: 'We build your diagnostic report and 90-day roadmap.' },
              { step: 5, title: 'Executive Debrief', body: 'We walk your team through every finding and answer every question.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal text-white flex items-center justify-center font-semibold text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-teal mb-1">{item.title}</h3>
                  <p className="text-charcoal">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-8 text-center">
            Built for Growth-Stage Mid-Market Businesses.
          </h2>
          <p className="text-charcoal text-base md:text-lg mb-10 text-center max-w-3xl mx-auto">
            BaxterLabs Advisory works with privately held businesses generating $5M–$50M in annual revenue with 20–200 employees. Our clients are typically founder-led or owner-operated, growing quickly, and dealing with the operational complexity that comes with scale.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              'Professional services (accounting, legal, staffing, consulting)',
              'Healthcare and specialty services',
              'Light manufacturing and distribution',
              'Technology and SaaS',
              'Real estate and property management',
            ].map((industry) => (
              <div
                key={industry}
                className="bg-white rounded-lg px-4 py-3 text-charcoal text-sm border border-gray-light"
              >
                {industry}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-crimson py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Your Margins Back on Track?
          </h2>
          <p className="text-white/90 text-base md:text-lg mb-10 max-w-2xl mx-auto">
            A 30-minute discovery call is free and confidential. We'll ask a few questions, share what we're seeing in your industry, and tell you honestly whether this engagement makes sense for your business. We work with a limited number of firms each quarter to ensure dedicated partner attention.
          </p>
          <Link
            to="/get-started"
            className="inline-flex items-center justify-center px-8 h-12 bg-white text-crimson font-semibold rounded-lg transition-colors hover:bg-white/90 text-base"
          >
            Book a Discovery Call
          </Link>
        </div>
      </section>
    </>
  )
}
