import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function About() {
  return (
    <>
      <SEO
        title="About | BaxterLabs Advisory"
        description="BaxterLabs Advisory was built for one purpose: helping growth-stage firms find and fix the margin erosion that comes with scaling. Senior finance leaders. 14-day diagnostic. Fixed fee."
      />

      {/* Header */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-crimson mb-4">
            About BaxterLabs Advisory
          </h1>
          <p className="text-gray-warm text-lg">
            Built for one purpose: helping growth-stage firms get back in control of their margins.
          </p>
        </div>
      </section>

      {/* Why We Exist */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-8 text-center">
            We kept seeing the same pattern.
          </h2>
          <div className="space-y-5 text-charcoal text-base md:text-lg">
            <p>
              Businesses cross $5M in revenue and something shifts. The growth is real — revenue climbs, headcount grows, the client list expands. But margins don't keep pace. Sometimes they compress. The owner feels it before the numbers confirm it: something is leaking, but there's no time to stop and figure out exactly what or how much.
            </p>
            <p>
              We built BaxterLabs Advisory because the existing options for these businesses don't work. Big 4 firms won't take a $12,500 engagement. Freelance consultants lack the analytical infrastructure to deliver institutional-quality findings. And most advisory firms sell hours, not outcomes — so the meter runs while the answers stay vague.
            </p>
            <p>
              We built something different. A tightly scoped, fixed-fee diagnostic that delivers quantified answers in two weeks. Every finding tied to a dollar amount. Every recommendation prioritized for impact. A deliverable package your leadership team can act on the day we present it.
            </p>
          </div>
        </div>
      </section>

      {/* What We Bring */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-8 text-center">
            Enterprise rigor. Mid-market focus.
          </h2>
          <div className="space-y-5 text-charcoal text-base md:text-lg">
            <p>
              The team behind BaxterLabs brings decades of senior finance leadership across healthcare, enterprise analytics, capital markets, food technology, and professional services. Our collective experience includes managing finance operations spanning hundreds of staff across multiple states, supporting more than $350M in capital formation, building institutional-grade financial infrastructure, and delivering the kind of analytical depth that boards and investors expect.
            </p>
            <p>
              We've sat in the seats our clients sit in — managing P&Ls, negotiating vendor contracts, building forecasts, closing underperforming operations, restructuring cost centers. That's not consulting theory. It's pattern recognition earned through direct operational experience across dozens of complex organizations.
            </p>
          </div>
        </div>
      </section>

      {/* How We're Different */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-8 text-center">
            Four things we do differently.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Senior leaders on every engagement.',
                body: 'There are no junior analysts, no handoffs, no \'B team.\' The people who scope the engagement are the same people who analyze your data, conduct your interviews, and present the findings.',
              },
              {
                title: 'Fixed scope. Fixed fee. Fixed timeline.',
                body: '$12,500. Fourteen days. You know exactly what you\'re getting and exactly what it costs before we start. No hourly billing, no scope creep, no change orders.',
              },
              {
                title: 'Every finding is quantified.',
                body: 'We don\'t hand you a list of observations. Every identified inefficiency is tied to a dollar amount — so you can see the ROI before deciding what to act on first.',
              },
              {
                title: 'Built for the gap between Big 4 and freelance.',
                body: 'Growth-stage firms generating $5M–$50M deserve the same analytical rigor that enterprise companies get. They just don\'t need a six-month engagement and a seven-figure invoice to get it.',
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

      {/* Bottom CTA */}
      <section className="bg-crimson py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6">
            See if a diagnostic makes sense for your business.
          </h2>
          <p className="text-white/90 text-base md:text-lg mb-10 max-w-2xl mx-auto">
            A 30-minute discovery call is free and confidential. We'll ask a few questions, share what we're seeing in your industry, and tell you honestly whether this engagement is the right fit. We work with a limited number of firms each quarter to ensure dedicated attention on every engagement.
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
