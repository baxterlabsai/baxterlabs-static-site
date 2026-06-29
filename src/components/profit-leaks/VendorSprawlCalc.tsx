import { useState } from 'react'

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString()
}

export default function VendorSprawlCalc() {
  const [spend, setSpend] = useState(500000)
  const [count, setCount] = useState(60)

  const safeSpend = Math.max(0, spend || 0)
  const safeCount = Math.max(1, count || 1)
  const lo = safeSpend * 0.08
  const hi = safeSpend * 0.15

  return (
    <div className="pl-calc" style={{ marginTop: '1.5rem' }}>
      <div className="title">Vendor sprawl &middot; estimated exposure</div>
      <div className="pl-calc-grid">
        <div className="pl-calc-field">
          <label htmlFor="vend-spend">Annual vendor spend ($)</label>
          <input
            id="vend-spend"
            type="text"
            inputMode="numeric"
            value={safeSpend.toLocaleString('en-US')}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, '')
              setSpend(digits === '' ? 0 : parseInt(digits, 10))
            }}
          />
        </div>
        <div className="pl-calc-field">
          <label htmlFor="vend-count">Number of vendors</label>
          <input
            id="vend-count"
            type="number"
            min={1}
            step={1}
            value={Number.isFinite(count) ? count : 1}
            onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
          />
        </div>
      </div>
      <div className="pl-calc-out">
        <div className="l">Estimated exposure</div>
        <div className="v">{fmt(lo)} to {fmt(hi)}</div>
        <div className="note">
          Firms with {safeCount} vendors typically have 8 to 15 percent overlap.
        </div>
      </div>
      <p className="pl-disclaim">
        This is an illustrative estimate based on diagnostic patterns, not a finding.
      </p>
    </div>
  )
}
