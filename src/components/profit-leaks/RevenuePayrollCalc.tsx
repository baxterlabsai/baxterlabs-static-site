import { useState } from 'react'

type Band = { label: string; cls: 'green' | 'amber' | 'red' }

function bandFor(ratio: number): Band {
  if (ratio < 2.0) return { label: 'Payroll outpacing revenue', cls: 'red' }
  if (ratio < 2.5) return { label: 'Monitor', cls: 'amber' }
  return { label: 'Healthy', cls: 'green' }
}

export default function RevenuePayrollCalc() {
  const [payroll, setPayroll] = useState(1200000)
  const [revenue, setRevenue] = useState(3000000)

  const pay = Math.max(1, payroll || 1)
  const rev = Math.max(0, revenue || 0)
  const ratio = rev / pay
  const band = bandFor(ratio)

  return (
    <div className="pl-calc" style={{ marginTop: '1.5rem' }}>
      <div className="title">Revenue-to-payroll ratio</div>
      <div className="pl-calc-grid">
        <div className="pl-calc-field">
          <label htmlFor="pay-pay">Practice group payroll ($)</label>
          <input
            id="pay-pay"
            type="text"
            inputMode="numeric"
            value={payroll.toLocaleString('en-US')}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, '')
              setPayroll(digits === '' ? 0 : parseInt(digits, 10))
            }}
          />
        </div>
        <div className="pl-calc-field">
          <label htmlFor="pay-rev">Revenue produced ($)</label>
          <input
            id="pay-rev"
            type="text"
            inputMode="numeric"
            value={revenue.toLocaleString('en-US')}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, '')
              setRevenue(digits === '' ? 0 : parseInt(digits, 10))
            }}
          />
        </div>
      </div>
      <div className="pl-calc-out">
        <div className="l">Revenue-to-payroll ratio</div>
        <div className={`v ${band.cls}`}>{ratio.toFixed(2)}x &middot; {band.label}</div>
        <div className="note">Green above 2.5x. Amber 2.0 to 2.5x. Red below 2.0x.</div>
      </div>
      <p className="pl-disclaim">
        Benchmarks vary by industry segment. This is a general guideline for professional service firms.
      </p>
    </div>
  )
}
