import { Link } from 'react-router-dom'

export default function PipelineCompanies() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Companies</h1>
        <p className="text-gray-warm text-sm mt-1">Prospect company directory</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
        <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
        <p className="text-lg font-semibold text-charcoal mb-1">Coming soon</p>
        <p className="text-gray-warm text-sm mb-4">Company management will be available in the next update.</p>
        <Link to="/dashboard/pipeline" className="text-teal text-sm font-semibold hover:underline">
          Back to Pipeline Board
        </Link>
      </div>
    </div>
  )
}
