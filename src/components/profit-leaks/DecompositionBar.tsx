import { useMemo, useState } from 'react'

type Cat = 'rev' | 'cost' | 'proc'

type Leak = {
  id: string
  nm: string
  cat: Cat
  v: number
  lo: number
  hi: number
  desc: string
}

const LEAKS: Leak[] = [
  { id: 'R1', nm: 'Below-Card Temp Account Pricing', cat: 'rev', v: 400000, lo: 350000, hi: 475000, desc: 'Temp staffing accounts priced below the rate card floor because no approval escalation existed for division-level pricing concessions.' },
  { id: 'R2', nm: 'Executive Search Guarantee Erosion', cat: 'rev', v: 552000, lo: 497000, hi: 607000, desc: 'Engagement letter language allowed guarantee periods to drift from 60 to 90 days without repricing, compressing realized margin by 18 to 22 percent.' },
  { id: 'R3', nm: 'Legacy Account Rate Drift', cat: 'rev', v: 448000, lo: 380000, hi: 540000, desc: 'Long-running client engagements priced three or four years ago. Delivery cost grew. Rates did not. Margin quietly compressed by 18 to 32 percent across the book.' },
  { id: 'R4', nm: 'Client Revenue Attrition', cat: 'rev', v: 338000, lo: 280000, hi: 420000, desc: 'Dormant and at-risk accounts never formally reviewed or reactivated. Relationship equity eroded without intervention.' },
  { id: 'R5', nm: 'AR Write-Off Exposure', cat: 'rev', v: 81000, lo: 60000, hi: 110000, desc: 'Aged receivables beyond 120 days that were never escalated to formal collections and quietly became write-offs.' },
  { id: 'C1', nm: 'SaaS Platform Duplication', cat: 'cost', v: 200000, lo: 160000, hi: 250000, desc: '116 active software platforms across offices and divisions, with confirmed duplication across CRM, ATS, payroll, and BI tools.' },
  { id: 'C2', nm: 'Non-SaaS Vendor Consolidation', cat: 'cost', v: 100000, lo: 70000, hi: 150000, desc: 'Printing, telecom, and facilities vendors contracted independently by office location. Consolidation recovered duplicated spend.' },
  { id: 'C3', nm: 'Office Real Estate Optimization', cat: 'cost', v: 30000, lo: 20000, hi: 50000, desc: 'Two offices below utilization thresholds given hybrid work patterns. Footprint renegotiation at lease renewal.' },
  { id: 'C4', nm: 'Payroll Outsourcing Conversion', cat: 'cost', v: 90000, lo: 70000, hi: 120000, desc: 'In-house payroll administration moved to a specialized provider at lower cost with improved compliance coverage.' },
  { id: 'C5', nm: 'IT Managed Services Conversion', cat: 'cost', v: 70000, lo: 50000, hi: 95000, desc: 'Two internal IT roles replaced with an MSP relationship. Lower cost, higher availability, broader skill coverage.' },
  { id: 'C6', nm: 'Light Industrial Division Merge', cat: 'cost', v: 160000, lo: 130000, hi: 200000, desc: 'Two light industrial divisions operating with independent management. Consolidation under one division manager removed duplicated overhead.' },
  { id: 'C7', nm: "Workers' Comp Carrier Optimization", cat: 'cost', v: 150000, lo: 120000, hi: 180000, desc: 'Carrier had not been re-bid in five years. Market bids returned premium reductions of 18 to 24 percent.' },
  { id: 'C8', nm: 'VMS Fee Renegotiation', cat: 'cost', v: 41000, lo: 30000, hi: 55000, desc: 'Vendor management system fees renegotiated against current market rates.' },
  { id: 'C9', nm: 'Trainer Role Repurposing', cat: 'cost', v: 115000, lo: 90000, hi: 140000, desc: 'Dedicated trainer role restructured to blended production-plus-training mandate tied to revenue goals.' },
  { id: 'C10', nm: 'Underperforming Recruiter Optimization', cat: 'cost', v: 420000, lo: 320000, hi: 520000, desc: 'Bottom decile of recruiters generating below 40 percent of desk quota. Performance improvement plans and reassignment recovered capacity.' },
  { id: 'C11', nm: 'DSO Improvement', cat: 'cost', v: 22000, lo: 15000, hi: 32000, desc: 'Invoice generation accelerated from 18 to 9 days post-work-complete. Modest but structural working-capital improvement.' },
  { id: 'P1', nm: 'Financial Reporting Lag / CFO Structure', cat: 'proc', v: 303000, lo: 240000, hi: 370000, desc: 'Outsourced fractional CFO delivering monthly P&L three to four weeks after month-end. Replaced with in-house controller plus real-time dashboard, enabling same-week decisions.' },
  { id: 'P2', nm: 'Month-End Close Acceleration', cat: 'proc', v: 29000, lo: 20000, hi: 40000, desc: 'Month-end close compressed from 14 days to 7. Executive decisions on pricing and vendor spend accelerated by one full cycle per month.' },
  { id: 'P3', nm: 'Payroll EIN Consolidation', cat: 'proc', v: 36000, lo: 25000, hi: 48000, desc: 'Three historical acquisition EINs collapsed into one operating EIN. Reduced payroll administration overhead and simplified tax filings.' },
]

const CAT_LABEL: Record<Cat, string> = {
  rev: 'Revenue Leak',
  cost: 'Cost Leak',
  proc: 'Process Leak',
}

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString()
}

type Filter = 'all' | Cat

export default function DecompositionBar() {
  const [filter, setFilter] = useState<Filter>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [hovering, setHovering] = useState(false)

  const list = useMemo(() => (filter === 'all' ? LEAKS : LEAKS.filter((x) => x.cat === filter)), [filter])
  const total = useMemo(() => list.reduce((s, x) => s + x.v, 0), [list])
  const active = useMemo(() => LEAKS.find((l) => l.id === activeId) ?? null, [activeId])

  const counts = { all: LEAKS.length, rev: 5, cost: 11, proc: 3 } as const

  const tipClass = active ? `pl-decomp-tip ${active.cat}` : 'pl-decomp-tip'
  const barClass = `pl-decomp-bar${hovering ? ' has-hover' : ''}`

  return (
    <div style={{ marginTop: '2.5rem' }}>
      <div className="pl-decomp-filters" role="tablist">
        {(['all', 'rev', 'cost', 'proc'] as const).map((k) => {
          const label = k === 'all' ? 'All' : k === 'rev' ? 'Revenue' : k === 'cost' ? 'Cost' : 'Process'
          return (
            <button
              key={k}
              className={`pl-decomp-filter${filter === k ? ' active' : ''}`}
              onClick={() => setFilter(k)}
              role="tab"
              aria-selected={filter === k}
            >
              {label} <span className="cnt">{counts[k]}</span>
            </button>
          )
        })}
      </div>

      <div
        className={barClass}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => {
          setHovering(false)
          setActiveId(null)
        }}
      >
        {list.map((x) => {
          const width = (x.v / total) * 100
          const isActive = activeId === x.id
          return (
            <div
              key={x.id}
              className={`pl-decomp-seg ${x.cat}${isActive ? ' active' : ''}`}
              style={{ width: `${width}%` }}
              role="button"
              tabIndex={0}
              aria-label={`${x.nm}, ${fmt(x.v)}`}
              onMouseEnter={() => setActiveId(x.id)}
              onFocus={() => setActiveId(x.id)}
              onClick={() => setActiveId(x.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveId(x.id)
                }
              }}
            >
              <span className="code">{x.id}</span>
            </div>
          )
        })}
      </div>

      <div className={tipClass}>
        <div className="top">
          <div className="nm">
            {active ? `${active.id} · ${active.nm}` : 'Hover or tap a segment'}
          </div>
          <div className="range">
            {active ? (
              <>
                {fmt(active.lo)} to {fmt(active.hi)}{' '}
                <span className="mod">{fmt(active.v)}</span> moderate
              </>
            ) : (
              <>19 leaks &middot; $3.585M moderate scenario</>
            )}
          </div>
        </div>
        <span className="cat">
          {active
            ? `${CAT_LABEL[active.cat]} · ${active.id}`
            : 'Anonymized $52M Professional Service Firm · 2026'}
        </span>
        <p className="desc">
          {active
            ? active.desc
            : 'Each segment is one finding, sized by its moderate-scenario dollar impact. Hover to explore. Filter by category to see relative distribution within revenue, cost, or process leaks.'}
        </p>
      </div>

      <div className="pl-decomp-totals">
        <div className="pl-decomp-total rev">
          <div className="swatch" />
          <div className="k">Revenue Leaks &middot; 5</div>
          <div className="v">$1,819,000</div>
          <div className="pct">50.7% of total</div>
        </div>
        <div className="pl-decomp-total cost">
          <div className="swatch" />
          <div className="k">Cost Leaks &middot; 11</div>
          <div className="v">$1,398,000</div>
          <div className="pct">39.0% of total</div>
        </div>
        <div className="pl-decomp-total proc">
          <div className="swatch" />
          <div className="k">Process Leaks &middot; 3</div>
          <div className="v">$368,000</div>
          <div className="pct">10.3% of total</div>
        </div>
      </div>

      <p className="pl-decomp-scen">
        Moderate-scenario findings. Conservative was $2.784M. Aggressive was $4.384M.
      </p>
      <p className="pl-disclaim">
        Findings from a BaxterLabs methodology demonstration on a real $52M staffing firm. Firm identity withheld; source documents modeled.
      </p>
    </div>
  )
}
