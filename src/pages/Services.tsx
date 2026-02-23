import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function Services() {
  return (
    <>
      <SEO
        title="Services | BaxterLabs Advisory"
        description="14-day fixed-fee profit leak audit ($12,500) and optional implementation retainer. Enterprise-level analytical rigor for mid-market businesses."
      />

      {/* Phase 1 — The 14-Day Audit */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-teal uppercase tracking-wide mb-4">Phase 1 — The 14-Day Audit</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-crimson mb-8">
            Stop Guessing. Start Knowing.
          </h1>
          <div className="space-y-5 text-charcoal text-base md:text-lg">
            <p>
              Our flagship engagement is a 14-day fixed-fee diagnostic that identifies, quantifies, and prioritizes the operational and financial inefficiencies costing your business margin. The engagement includes everything from data collection and analysis to leadership interviews, workflow mapping, and a full report with a 90-day implementation roadmap.
            </p>
          </div>
          <div className="mt-8 bg-ivory border-l-4 border-l-crimson rounded-lg p-6">
            <p className="text-teal font-semibold text-lg">
              $12,500 | Fixed-fee | All-inclusive | Remote-first
            </p>
          </div>
        </div>
      </section>

      {/* Phase 2 — Implementation Retainer */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-teal uppercase tracking-wide mb-4">Phase 2 — Implementation Retainer</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-8">
            The Roadmap Only Works If You Work It.
          </h2>
          <div className="space-y-5 text-charcoal text-base md:text-lg">
            <p>
              After the audit, we offer an optional Implementation Retainer to support your team in executing the recommendations. Whether you need strategic guidance or hands-on support, we have a tier that fits your pace and bandwidth.
            </p>
          </div>
          <div className="mt-8 bg-white border-l-4 border-l-crimson rounded-lg p-6">
            <p className="text-teal font-semibold text-lg">
              $5,000–$10,000/month | Month-to-month | No long-term contract
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-crimson py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-white/90 text-base md:text-lg mb-10">
            Book a free 30-minute discovery call. We'll tell you honestly whether a BaxterLabs engagement makes sense for your business.
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
