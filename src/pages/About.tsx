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

      {/* The Partners */}
      <section className="py-20 md:py-28" style={{ backgroundColor: '#FAF8F2' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-4 text-center">
            The Partners.
          </h2>
          <p className="text-center text-charcoal/60 text-base mb-16 max-w-xl mx-auto">
            Senior operators who have run the finance function from the inside.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">

            {/* George DeVries */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <div className="mb-6">
                <img
                  src="/images/George.png"
                  alt="George DeVries"
                  className="w-40 h-40 rounded-full object-cover object-top border-4 border-white shadow-lg"
                />
              </div>
              <h3 className="text-xl font-bold text-charcoal">George DeVries</h3>
              <p className="text-teal text-sm font-semibold tracking-wide uppercase mt-1 mb-5">
                Managing Partner
              </p>
              <div className="space-y-4 text-charcoal text-base leading-relaxed">
                <p>
                  I've spent 25 years inside the finance function of companies that were growing faster than their infrastructure. Venture-backed startups closing $100M+ rounds. Healthcare services organizations managing 600 people across six states. Food technology companies in the middle of $175M Series C. At every stage, the same pattern: the money was there, but nobody had built the systems to see where it was going.
                </p>
                <p>
                  I've generated over $8M in annual cost savings at a single organization. I've cut month-end close by five days. I've watched companies lose $200K+ a year to billing gaps they didn't know existed. What I've learned is that margin erosion rarely comes from one big mistake — it comes from a dozen small systems that nobody owns.
                </p>
                <p>
                  That's why I built BaxterLabs. Not to sell another advisory retainer, but to give firms a clean answer in two weeks: here's exactly what's leaking, here's what it's worth, here's where to start.
                </p>
              </div>
            </div>

            {/* Alfonso Cordón */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <div className="mb-6">
                <img
                  src="/images/Alfonso.jpg"
                  alt="Alfonso Cordón"
                  className="w-40 h-40 rounded-full object-cover object-top border-4 border-white shadow-lg"
                />
              </div>
              <h3 className="text-xl font-bold text-charcoal">Alfonso Cordón</h3>
              <p className="text-teal text-sm font-semibold tracking-wide uppercase mt-1 mb-5">
                Partner
              </p>
              <div className="space-y-4 text-charcoal text-base leading-relaxed">
                <p>
                  For 16 years at Moody's Analytics, I ran the finance function for businesses generating over $3 billion in annual recurring revenue. That means I've seen what scale actually looks like from the inside — the forecasting breakdowns, the pricing models that quietly underperform, the transition points where a business outgrows its financial infrastructure before anyone realizes it.
                </p>
                <p>
                  I led the finance work for a $400M line of business through a full shift from on-premise to SaaS. I built the pricing framework that drove 12% revenue growth and got adopted company-wide. Before that, at Bayer and Abbott, I managed financial consolidations across multiple countries and currencies. What you learn doing that work is how to find signal in complex data — and how quickly things drift when nobody's built the right monitoring in.
                </p>
                <p>
                  What drew me to BaxterLabs is the specificity of the model. We're not selling a strategy engagement or a roadmap. We're telling you, in two weeks, exactly where margin is leaving your business and what it's worth to get it back.
                </p>
              </div>
            </div>

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
