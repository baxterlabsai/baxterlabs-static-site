import SEO from '../components/SEO'

export default function GetStarted() {
  return (
    <>
      <SEO
        title="Get Started | BaxterLabs Advisory"
        description="Book a free 30-minute discovery call with BaxterLabs Advisory. We'll tell you honestly whether a profit leak audit makes sense for your business."
      />

      {/* Header */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-crimson mb-6">
            Let's Find Your Profit Leaks.
          </h1>
          <p className="text-charcoal text-base md:text-lg max-w-2xl mx-auto">
            Book a free 30-minute discovery call. We'll ask the right questions and tell you honestly whether a BaxterLabs engagement makes sense for your business.
          </p>
        </div>
      </section>

      {/* Intake Form Placeholder */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-light p-12 text-center">
            <div className="mb-4">
              <svg className="mx-auto w-12 h-12 text-gray-warm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-teal mb-2">Intake form coming soon</p>
            <p className="text-gray-warm text-sm">
              The full intake form with company details, interview contacts, and Calendly scheduling will be available in the next milestone.
            </p>
          </div>

          {/* Contact Info */}
          <div className="mt-10 text-center">
            <p className="text-charcoal mb-2">In the meantime, reach out directly:</p>
            <a
              href="mailto:george@baxterlabs.ai"
              className="text-teal font-semibold text-lg hover:underline"
            >
              george@baxterlabs.ai
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
