import { Link } from 'react-router-dom'

export default function PipelineTasks() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Tasks</h1>
        <p className="text-gray-warm text-sm mt-1">Follow-ups and reminders</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
        <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-semibold text-charcoal mb-1">Coming soon</p>
        <p className="text-gray-warm text-sm mb-4">Task management will be available in the next update.</p>
        <Link to="/dashboard/pipeline" className="text-teal text-sm font-semibold hover:underline">
          Back to Pipeline Board
        </Link>
      </div>
    </div>
  )
}
