import { Link } from 'react-router-dom'

export default function PipelineActivities() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Activities</h1>
        <p className="text-gray-warm text-sm mt-1">Prospect interaction timeline</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
        <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-semibold text-charcoal mb-1">Coming soon</p>
        <p className="text-gray-warm text-sm mb-4">Activity feed and call notes will be available in the next update.</p>
        <Link to="/dashboard/pipeline" className="text-teal text-sm font-semibold hover:underline">
          Back to Pipeline Board
        </Link>
      </div>
    </div>
  )
}
