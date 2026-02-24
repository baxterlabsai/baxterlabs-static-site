import SEO from '../components/SEO'

export default function About() {
  return (
    <>
      <SEO
        title="About | BaxterLabs Advisory"
        description="Meet the BaxterLabs Advisory team. We built a tightly scoped diagnostic that gives growth-stage businesses answers they can act on in two weeks."
      />

      {/* Header */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-crimson mb-4">
            About BaxterLabs Advisory
          </h1>
          <p className="text-gray-warm text-lg">
            The people behind the diagnostic.
          </p>
        </div>
      </section>

      {/* Partner Bios */}
      <section className="bg-ivory py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-crimson mb-12 text-center">Our Partners</h2>

          <div className="space-y-8">
            {/* George DeVries — PLACEHOLDER: Replace with real bio */}
            <div className="bg-white border-l-4 border-l-crimson rounded-lg p-8 border-2 border-dashed border-gold/50">
              <h3 className="text-xl font-semibold text-teal mb-4">George DeVries</h3>
              <p className="text-charcoal">
                George DeVries is a [TITLE / BACKGROUND]. He has spent [X] years helping [TYPE OF BUSINESSES] [SPECIFIC OUTCOME]. At BaxterLabs, George leads business development, client relationships, and engagement delivery.
              </p>
              <p className="text-xs text-gold mt-3 font-medium">Placeholder — replace with real bio</p>
            </div>

            {/* Alfonso Cordon — PLACEHOLDER: Replace with real bio */}
            <div className="bg-white border-l-4 border-l-crimson rounded-lg p-8 border-2 border-dashed border-gold/50">
              <h3 className="text-xl font-semibold text-teal mb-4">Alfonso Cordon</h3>
              <p className="text-charcoal">
                Alfonso Cordon is a [TITLE / BACKGROUND]. He brings deep expertise in [SPECIALTY] and has previously [KEY EXPERIENCE]. At BaxterLabs, Alfonso leads financial modeling, data analysis, and report development.
              </p>
              <p className="text-xs text-gold mt-3 font-medium">Placeholder — replace with real bio</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why BaxterLabs */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-8 text-center">
            Why BaxterLabs
          </h2>
          <p className="text-charcoal text-base md:text-lg">
            We built BaxterLabs Advisory because we kept seeing the same pattern: growth-stage businesses pouring energy into top-line growth while quietly hemorrhaging margin on the operational side. Most advisory firms either cost too much, take too long, or deliver reports that sit on a shelf. We built something different — a tightly scoped, rapidly executed diagnostic that gives you answers you can act on, in two weeks, for a fixed fee.
          </p>
        </div>
      </section>
    </>
  )
}
