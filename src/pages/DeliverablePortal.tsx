import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Deliverable {
  id: string
  type: string
  status: string
  wave: number
  storage_path: string | null
  approved_at: string | null
  released_at: string | null
  signed_url?: string
}

interface PortalData {
  company_name: string
  engagement_id: string
  start_date: string | null
  target_end_date: string | null
  wave_1: Deliverable[]
  wave_2: Deliverable[]
  expired?: boolean
  message?: string
}

const WAVE_1_LABELS: Record<string, string> = {
  exec_summary: 'Executive Summary',
  full_report: 'Full Diagnostic Report',
  workbook: 'Profit Leak Quantification Workbook',
  roadmap: '90-Day Implementation Roadmap',
}

const WAVE_2_LABELS: Record<string, string> = {
  deck: 'Executive Presentation Deck',
  retainer_proposal: 'Phase 2 Retainer Proposal',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function DeliverableCard({
  deliverable,
  labels,
}: {
  deliverable: Deliverable
  labels: Record<string, string>
}) {
  const label = labels[deliverable.type] || deliverable.type
  const hasUrl = !!deliverable.signed_url

  return (
    <div className="bg-white rounded-xl border border-gray-light p-5 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-charcoal text-sm">{label}</h4>
        {deliverable.released_at && (
          <p className="text-xs text-gray-warm mt-0.5">
            Released {formatDate(deliverable.released_at)}
          </p>
        )}
      </div>
      <button
        onClick={() => {
          if (hasUrl) window.open(deliverable.signed_url, '_blank')
        }}
        disabled={!hasUrl}
        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex-shrink-0 ${
          hasUrl
            ? 'bg-gold text-white hover:bg-gold/90 cursor-pointer'
            : 'bg-gray-light text-gray-warm cursor-not-allowed'
        }`}
      >
        {hasUrl ? 'Download' : 'Unavailable'}
      </button>
    </div>
  )
}

export default function DeliverablePortal() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/deliverables/${token}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || 'Invalid deliverable link')
      }
      const payload: PortalData = await res.json()
      if (payload.expired) {
        setExpired(true)
        setData(payload)
        return
      }
      setData(payload)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load deliverables')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- Loading state ---
  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-crimson border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-warm">Loading deliverables...</p>
        </div>
      </div>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-light p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-red-soft/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-soft"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-charcoal mb-2">
            Invalid Deliverable Link
          </h2>
          <p className="text-gray-warm text-sm">
            This link is invalid or has been deactivated. Please contact your BaxterLabs
            engagement partner.
          </p>
          <a
            href="mailto:george@baxterlabs.ai"
            className="inline-block mt-4 text-teal font-semibold hover:underline"
          >
            george@baxterlabs.ai
          </a>
        </div>
      </div>
    )
  }

  // --- Expired state ---
  if (expired) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col">
        {/* Header */}
        <header className="bg-crimson">
          <div className="flex items-center justify-center py-5">
            <img
              src="/images/baxterlabs-logo-white-text.png"
              alt="BaxterLabs Advisory"
              className="h-10"
            />
          </div>
        </header>
        <div className="h-[3px] bg-gold" />

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl border border-gray-light p-8 max-w-md text-center">
            <div className="w-12 h-12 bg-amber/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-amber"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-charcoal mb-2">Link Expired</h2>
            <p className="text-gray-warm text-sm mb-4">
              This link has expired. Please contact your BaxterLabs engagement partner for access
              to your deliverables.
            </p>
            <a
              href="mailto:george@baxterlabs.ai"
              className="text-teal font-semibold hover:underline"
            >
              george@baxterlabs.ai
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-teal py-6 px-4 text-center">
          <p className="text-white/80 text-xs">
            &copy; 2026 BaxterLabs Advisory
          </p>
        </footer>
      </div>
    )
  }

  if (!data) return null

  const hasWave1 = data.wave_1.length > 0
  const hasWave2 = data.wave_2.length > 0

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      {/* Header */}
      <header className="bg-crimson">
        <div className="flex items-center justify-center py-5">
          <img
            src="/images/baxterlabs-logo-white-text.png"
            alt="BaxterLabs Advisory"
            className="h-10"
          />
        </div>
      </header>
      <div className="h-[3px] bg-gold" />

      {/* Main content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        {/* Company heading */}
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-charcoal mb-2">
            {data.company_name}
          </h1>
          <p className="text-gray-warm text-sm">Engagement Deliverables</p>
          {(data.start_date || data.target_end_date) && (
            <p className="text-gray-warm text-xs mt-2">
              {data.start_date && <>Started {formatDate(data.start_date)}</>}
              {data.start_date && data.target_end_date && <span className="mx-2">|</span>}
              {data.target_end_date && <>Target completion {formatDate(data.target_end_date)}</>}
            </p>
          )}
        </div>

        {/* Wave 1 — Diagnostic Results */}
        {hasWave1 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold text-crimson mb-4">
              Diagnostic Results
            </h2>
            <div className="space-y-3">
              {data.wave_1.map((d) => (
                <DeliverableCard key={d.id} deliverable={d} labels={WAVE_1_LABELS} />
              ))}
            </div>
          </section>
        )}

        {/* Wave 2 — Executive Debrief Materials (completely hidden if empty) */}
        {hasWave2 && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-bold text-crimson mb-4">
              Executive Debrief Materials
            </h2>
            <div className="space-y-3">
              {data.wave_2.map((d) => (
                <DeliverableCard key={d.id} deliverable={d} labels={WAVE_2_LABELS} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state — no deliverables at all */}
        {!hasWave1 && !hasWave2 && (
          <div className="bg-white rounded-xl border border-gray-light p-8 text-center">
            <p className="text-gray-warm text-sm">
              No deliverables have been released yet. You will receive an email when your
              deliverables are ready for download.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-teal py-6 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/80 text-xs">
            &copy; 2026 BaxterLabs Advisory
          </p>
          <p className="text-white/60 text-[10px] mt-2 leading-relaxed">
            CONFIDENTIAL — This portal contains proprietary information prepared exclusively for{' '}
            {data.company_name}.
          </p>
        </div>
      </footer>
    </div>
  )
}
