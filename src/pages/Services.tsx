import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function Services() {
  return (
    <>
      <SEO
        title="Services | BaxterLabs Advisory"
        description="14-day fixed-fee profit leak diagnostic ($12,500) and optional implementation retainer. Enterprise-level analytical rigor for mid-market businesses."
      />

      {/* Phase 1 — The 14-Day Diagnostic */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-teal uppercase tracking-wide mb-4">Phase 1 — The 14-Day Diagnostic</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-crimson mb-8">
            Stop Guessing. Start Knowing.
          </h1>
          <div className="space-y-5 text-charcoal text-base md:text-lg">
            <p>
              Our flagship engagement is a fixed-scope, fixed-fee diagnostic that identifies, quantifies, and prioritizes the operational and financial inefficiencies costing your business margin. We collect your financials, interview your leadership, map your workflows, and deliver a complete findings package in 14 days — including a board-ready report and a 90-day implementation roadmap.
            </p>
          </div>
          <div className="mt-8 bg-ivory border-l-4 border-l-crimson rounded-lg p-6">
            <p className="text-teal font-semibold text-lg">
              $12,500 | Fixed-fee | All-inclusive | Remote-first
            </p>
          </div>

          <div className="mt-12">
            <h3 className="font-display text-2xl font-bold text-crimson mb-6">What You Receive</h3>
            <div className="grid gap-4">
              <div className="bg-ivory rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">Executive Summary</p>
                <p className="text-charcoal text-base">Board-ready overview of key findings and the highest-priority actions to take first.</p>
              </div>
              <div className="bg-ivory rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">Full Diagnostic Report</p>
                <p className="text-charcoal text-base">Complete analysis of every identified profit leak, with root causes, dollar quantification, and supporting evidence for each finding.</p>
              </div>
              <div className="bg-ivory rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">Implementation Roadmap</p>
                <p className="text-charcoal text-base">90-day prioritized action plan tied directly to the dollar-quantified findings. Sequenced by impact and feasibility.</p>
              </div>
              <div className="bg-ivory rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">Profit Leak Quantification Workbook</p>
                <p className="text-charcoal text-base">The underlying financial model showing exactly where margin is going, how much each leak is worth, and what recovery looks like.</p>
              </div>
            </div>

            <p className="text-sm font-semibold text-charcoal/60 uppercase tracking-wide mt-8 mb-4">Delivered after your debrief meeting:</p>
            <div className="grid gap-4">
              <div className="bg-ivory rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">Executive Presentation Deck</p>
                <p className="text-charcoal text-base">A formatted presentation of your findings, ready to share with your leadership team or board.</p>
              </div>
              <div className="bg-ivory rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">Phase 2 Retainer Proposal</p>
                <p className="text-charcoal text-base">A tailored implementation proposal for continued support. Only if you want it. The roadmap is yours either way.</p>
              </div>
            </div>
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
              After the diagnostic debrief, we offer an optional Implementation Retainer for firms that want partner-level support executing the roadmap. Engagements are month-to-month with no long-term contract — you stay because it's working, not because you're locked in.
            </p>
          </div>

          <div className="mt-8">
            <p className="font-semibold text-teal text-lg mb-4">What's included:</p>
            <div className="grid gap-4">
              <div className="bg-white rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">Weekly working sessions</p>
                <p className="text-charcoal text-base">with a BaxterLabs partner to drive implementation of the roadmap priorities</p>
              </div>
              <div className="bg-white rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">Financial monitoring</p>
                <p className="text-charcoal text-base">we track the metrics that matter and flag drift before it compounds</p>
              </div>
              <div className="bg-white rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">Vendor and process analysis</p>
                <p className="text-charcoal text-base">as new cost or efficiency questions arise</p>
              </div>
              <div className="bg-white rounded-lg p-5">
                <p className="font-semibold text-teal mb-1">On-call advisory</p>
                <p className="text-charcoal text-base">between sessions for decisions that can't wait for the next meeting</p>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white border-l-4 border-l-crimson rounded-lg p-6">
            <p className="text-teal font-semibold text-lg">
              $5,000–$10,000/month | Month-to-month | No long-term contract
            </p>
          </div>
        </div>
      </section>

      {/* What We'll Need From You */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-teal uppercase tracking-wide mb-4">What We'll Need From You</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-8">
            Prepared Clients Get Better Results.
          </h2>
          <p className="text-charcoal text-base md:text-lg mb-10">
            Our 14-day timeline depends on having your financials ready on day one. Once your engagement agreement is signed, we designate a document contact at your firm — typically your CFO, Controller, or office manager — who receives a link to a secure upload portal. Here's what we'll ask for.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-ivory rounded-lg p-5">
              <p className="font-semibold text-teal mb-1">Profit & Loss Statement</p>
              <p className="text-charcoal text-base">Two to three years. The primary lens for identifying revenue leakage, margin compression, and cost drift over time.</p>
            </div>
            <div className="bg-ivory rounded-lg p-5">
              <p className="font-semibold text-teal mb-1">Balance Sheet</p>
              <p className="text-charcoal text-base">Current year. We use this to assess working capital position and structural issues that don't appear in the P&L.</p>
            </div>
            <div className="bg-ivory rounded-lg p-5">
              <p className="font-semibold text-teal mb-1">Payroll Summary Report</p>
              <p className="text-charcoal text-base">By department or cost center. Staffing is typically the largest cost line in a service firm — we look at structure, not individual salaries.</p>
            </div>
            <div className="bg-ivory rounded-lg p-5">
              <p className="font-semibold text-teal mb-1">Org Chart</p>
              <p className="text-charcoal text-base">Current structure. Helps us understand reporting relationships and spans of control that drive overhead.</p>
            </div>
            <div className="bg-ivory rounded-lg p-5">
              <p className="font-semibold text-teal mb-1">Vendor List with Spend</p>
              <p className="text-charcoal text-base">Annual spend by vendor. Vendor proliferation and contract drift are among the most common sources of recoverable cost in service firms.</p>
            </div>
            <div className="bg-ivory rounded-lg p-5">
              <p className="font-semibold text-teal mb-1">Software Subscriptions</p>
              <p className="text-charcoal text-base">Active SaaS and software licenses with monthly or annual cost. Unused and duplicated subscriptions are a consistent finding.</p>
            </div>
            <div className="bg-ivory rounded-lg p-5">
              <p className="font-semibold text-teal mb-1">Revenue by Customer / Account</p>
              <p className="text-charcoal text-base">Top accounts ranked by revenue. We look at concentration risk and margin by account type.</p>
            </div>
            <div className="bg-ivory rounded-lg p-5">
              <p className="font-semibold text-teal mb-1">Invoicing & Billing Records</p>
              <p className="text-charcoal text-base">Three to six months of invoices. We use these to identify billing gaps, delays, and write-off patterns.</p>
            </div>
            <div className="bg-ivory rounded-lg p-5">
              <p className="font-semibold text-teal mb-1">Accounts Receivable Aging</p>
              <p className="text-charcoal text-base">Current AR aging report. Slow collections are a direct cash flow leak and often signal underlying billing or relationship issues.</p>
            </div>
          </div>

          <p className="text-sm text-gray-warm text-center mt-8">
            All documents are handled under strict confidentiality per your Engagement Agreement.
          </p>
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
