import { Link } from 'react-router-dom'

export default function PipelineContacts() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Contacts</h1>
        <p className="text-gray-warm text-sm mt-1">Prospect contact directory</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
        <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <p className="text-lg font-semibold text-charcoal mb-1">Coming soon</p>
        <p className="text-gray-warm text-sm mb-4">Contact management will be available in the next update.</p>
        <Link to="/dashboard/pipeline" className="text-teal text-sm font-semibold hover:underline">
          Back to Pipeline Board
        </Link>
      </div>
    </div>
  )
}
