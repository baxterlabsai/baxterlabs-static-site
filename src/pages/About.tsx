import SEO from '../components/SEO'

export default function About() {
  return (
    <>
      <SEO
        title="About | BaxterLabs Advisory"
        description="Operator-led financial diagnostics. Built by finance operators who have owned financial outcomes. 25+ years of real-world P&L ownership."
      />

      {/* Opening/Positioning */}
      <section className="px-6 md:px-12 mb-32 max-w-7xl mx-auto pt-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-8">
            <span className="font-label text-secondary uppercase tracking-[0.3em] text-xs font-bold block mb-4">Our Foundation</span>
            <h1 className="font-display italic text-5xl md:text-7xl text-primary leading-tight mb-8">
              Operator-Led Financial Diagnostics
            </h1>
          </div>
          <div className="md:col-span-4 self-end">
            <p className="text-on-surface-variant text-lg leading-relaxed font-body">
              The firm is built by finance operators who have owned financial outcomes. Unlike traditional advisory models staffed by theoretical analysts, we deliver diagnostics rooted in the reality of day-to-day fiscal management.
            </p>
          </div>
        </div>
      </section>

      {/* Why This Exists */}
      <section className="bg-surface-container-low py-32 px-6 md:px-12 border-y border-surface-container">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-start">
          <div>
            <h2 className="font-display text-4xl text-primary mb-6">Why This Exists</h2>
            <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
              There is a systemic gap between high-level advisory and ground-level execution. Strategy often dies in the translation to the general ledger. BaxterLabs was founded to bridge this divide through structured diagnostics that focus on one singular metric: quantified profit leakage.
            </p>
          </div>
          <div className="space-y-12">
            <div className="border-l-2 border-secondary pl-8">
              <h4 className="font-label text-secondary text-sm uppercase tracking-widest font-bold mb-2">The Execution Gap</h4>
              <p className="text-on-surface-variant text-sm">Traditional firms stop at the 'what.' We identify the 'how' by mapping financial strategy directly to operational workflows.</p>
            </div>
            <div className="border-l-2 border-secondary pl-8">
              <h4 className="font-label text-secondary text-sm uppercase tracking-widest font-bold mb-2">Quantified Impact</h4>
              <p className="text-on-surface-variant text-sm">We don't offer generalities. Our process isolates specific nodes where capital is inefficiently deployed or leaked.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Partners */}
      <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <p className="font-display italic text-2xl text-primary mb-4">"All engagements are led directly by partners. No junior teams. No handoffs."</p>
          <h2 className="font-display text-4xl md:text-5xl text-secondary">The Partners</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
          {/* George */}
          <div className="flex flex-col items-center group">
            <div className="w-72 h-72 rounded-full overflow-hidden mb-8 border-4 border-surface-container-highest transition-transform duration-500 group-hover:scale-[1.02]">
              <img
                alt="George DeVries"
                className="w-full h-full object-cover object-top transition-all duration-700"
                src="/images/George.png"
              />
            </div>
            <h3 className="font-display text-2xl text-primary mb-1">George DeVries</h3>
            <p className="text-secondary font-label text-sm uppercase tracking-widest font-bold mb-6">Managing Partner</p>
            <div className="text-on-surface-variant leading-relaxed max-w-2xl font-body text-sm space-y-4 text-left">
              <p>I've spent 25 years inside the finance function of companies that were growing faster than their infrastructure. Venture-backed startups closing $100M+ rounds. Healthcare services organizations managing 600 people across six states. Food technology companies in the middle of $175M Series C. At every stage, the same pattern: the money was there, but nobody had built the systems to see where it was going.</p>
              <p>I've generated over $8M in annual cost savings at a single organization. I've cut month-end close by five days. I've watched companies lose $200K+ a year to billing gaps they didn't know existed. What I've learned is that margin erosion rarely comes from one big mistake. It comes from a dozen small systems that nobody owns.</p>
              <p>That's why I built BaxterLabs. Not to sell another advisory retainer, but to give firms a clean answer in two weeks: here's exactly what's leaking, here's what it's worth, here's where to start.</p>
            </div>
          </div>
          {/* Alfonso */}
          <div className="flex flex-col items-center group">
            <div className="w-72 h-72 rounded-full overflow-hidden mb-8 border-4 border-surface-container-highest transition-transform duration-500 group-hover:scale-[1.02]">
              <img
                alt="Alfonso Cordon"
                className="w-full h-full object-cover object-top transition-all duration-700"
                src="/images/Alfonso.jpg"
              />
            </div>
            <h3 className="font-display text-2xl text-primary mb-1">Alfonso Cordon</h3>
            <p className="text-secondary font-label text-sm uppercase tracking-widest font-bold mb-6">Partner</p>
            <div className="text-on-surface-variant leading-relaxed max-w-2xl font-body text-sm space-y-4 text-left">
              <p>For 16 years at Moody's Analytics, I ran the finance function for businesses generating over $3 billion in annual recurring revenue. That means I've seen what scale actually looks like from the inside: the forecasting breakdowns, the pricing models that quietly underperform, the transition points where a business outgrows its financial infrastructure before anyone realizes it.</p>
              <p>I led the finance work for a $400M line of business through a full shift from on-premise to SaaS. I built the pricing framework that drove 12% revenue growth and got adopted company-wide. Before that, at Bayer and Abbott, I managed financial consolidations across multiple countries and currencies. What you learn doing that work is how to find signal in complex data, and how quickly things drift when nobody's built the right monitoring in.</p>
              <p>What drew me to BaxterLabs is the specificity of the model. We're not selling a strategy engagement or a roadmap. We're telling you, in two weeks, exactly where margin is leaving your business and what it's worth to get it back.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="bg-surface-container-highest py-32 px-6 md:px-12 border-y border-surface-container">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-4">
              <h2 className="font-display text-4xl text-primary">How We Work</h2>
              <div className="mt-8 w-12 h-0.5 bg-secondary" />
            </div>
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-y-16 gap-x-12">
              {[
                { num: '01', title: 'Direct Partner Involvement', desc: 'No translation layers. The partners who pitch the work are the ones who conduct the forensic analysis and deliver the findings.' },
                { num: '02', title: 'Structured Repeatable Process', desc: 'We utilize a proprietary diagnostic framework that ensures consistency across audits while remaining adaptable to industry-specific nuances.' },
                { num: '03', title: 'Quantified Financial Impact', desc: 'Observations are only useful if they are priced. Every diagnostic finding is accompanied by a calculated dollar-value impact.' },
                { num: '04', title: 'Executive Decision-Making', desc: 'Our outputs are designed for Board and C-Suite review—concise, data-backed, and focused on immediate actionable levers.' },
              ].map((item) => (
                <div key={item.num} className="flex flex-col gap-4">
                  <span className="text-primary font-display italic text-3xl">{item.num}</span>
                  <h4 className="font-bold text-secondary uppercase tracking-tight font-label text-sm">{item.title}</h4>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Reinforcement */}
      <section className="py-32 px-6 md:px-12 max-w-5xl mx-auto text-center">
        <div className="bg-primary p-12 md:p-20 rounded-sm relative overflow-hidden text-on-primary">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full" />
          <span className="material-symbols-outlined text-4xl text-surface-container-highest mb-6 block" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <h2 className="font-display text-3xl md:text-4xl mb-8">Data Integrity &amp; Professional Standards.</h2>
          <p className="text-on-primary/80 leading-relaxed max-w-2xl mx-auto mb-12 italic text-lg">
            "Integrity in financial advisory is non-negotiable. Our protocols ensure that your data remains your most protected asset."
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-on-primary/10">
            <div className="p-4">
              <p className="font-bold text-surface-container-highest uppercase text-[10px] tracking-widest mb-2">NDA Commitment</p>
              <p className="text-on-primary/60 text-xs">Full legal non-disclosure binding on all project phases.</p>
            </div>
            <div className="p-4 border-x border-on-primary/10">
              <p className="font-bold text-surface-container-highest uppercase text-[10px] tracking-widest mb-2">Controlled Handling</p>
              <p className="text-on-primary/60 text-xs">Direct, encrypted transmission of sensitive ledger data.</p>
            </div>
            <div className="p-4">
              <p className="font-bold text-surface-container-highest uppercase text-[10px] tracking-widest mb-2">Zero External Use</p>
              <p className="text-on-primary/60 text-xs">No anonymized benchmarking or external sharing of client data.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
