import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ScheduleData {
  company_name: string
  contact_name: string | null
  contact_email: string | null
  assigned_to: string | null
  booking_time: string | null
  nda_already_requested: boolean
  nda_already_signed: boolean
  stage: string
  calendly_url: string | null
}

export default function ScheduleDiscovery() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [ndaSent, setNdaSent] = useState(false)
  const [booked, setBooked] = useState(false)

  // Fetch schedule page data
  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/api/pipeline/schedule/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Schedule link not found')
        return res.json()
      })
      .then((d: ScheduleData) => {
        setData(d)
        // If they already have a booking, jump to NDA phase
        if (d.booking_time) setBooked(true)
        if (d.nda_already_requested || d.nda_already_signed) setNdaSent(true)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  // Listen for Calendly widget postMessage events
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.event === 'calendly.event_scheduled') {
        setBooked(true)
        // Poll backend briefly to confirm webhook recorded the booking
        if (token) {
          setTimeout(() => {
            fetch(`${API_URL}/api/pipeline/schedule/${token}`)
              .then(res => res.json())
              .then((d: ScheduleData) => setData(d))
              .catch(() => {})
          }, 2000)
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [token])

  const handleRequestNda = useCallback(async () => {
    if (!token) return
    setSending(true)
    try {
      const res = await fetch(`${API_URL}/api/pipeline/schedule/${token}/request-nda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to send NDA')
      }
      setNdaSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send NDA')
    } finally {
      setSending(false)
    }
  }, [token])

  function formatBookingTime(iso: string | null): string {
    if (!iso) return 'To be confirmed'
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    } catch {
      return iso
    }
  }

  // Build Calendly embed URL with pre-filled params
  function getCalendlyUrl(): string {
    const base = data?.calendly_url || 'https://calendly.com/george-baxterlabs'
    const params = new URLSearchParams()
    if (data?.contact_name) params.set('name', data.contact_name)
    if (data?.contact_email) params.set('email', data.contact_email)
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-crimson border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <svg className="mx-auto w-12 h-12 text-red-soft mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h2 className="text-lg font-bold text-charcoal mb-2">Page Not Found</h2>
          <p className="text-sm text-gray-warm">This scheduling link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <div className="bg-crimson">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <h1 className="font-display text-2xl font-bold text-white">BaxterLabs Advisory</h1>
          <div className="h-0.5 w-16 bg-gold mx-auto mt-2" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-charcoal mb-2">
            {booked ? 'Discovery Call Confirmed' : 'Schedule Your Discovery Call'}
          </h2>
          {data?.contact_name && (
            <p className="text-gray-warm">
              Welcome, {data.contact_name}
              {data.company_name && <span> — {data.company_name}</span>}
            </p>
          )}
          {data?.assigned_to && !booked && (
            <p className="text-sm text-teal font-medium mt-1">
              with {data.assigned_to}
            </p>
          )}
        </div>

        {/* Phase 1: Calendly Embed (not yet booked) */}
        {!booked && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-light">
              <p className="text-sm text-charcoal">
                Pick a time that works for you. This is a free, no-obligation 30-minute conversation.
              </p>
            </div>
            <div style={{ minHeight: '700px' }}>
              <iframe
                src={getCalendlyUrl()}
                width="100%"
                height="700"
                frameBorder="0"
                title="Schedule a Discovery Call with BaxterLabs Advisory"
                className="border-0"
              />
            </div>
          </div>
        )}

        {/* Phase 2: Booked — show booking confirmation + NDA card */}
        {booked && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Booking details */}
            <div className="px-6 py-5 border-b border-gray-light">
              <div className="bg-teal/5 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-teal mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-teal">Call Scheduled</p>
                    <p className="text-sm text-charcoal mt-0.5">{formatBookingTime(data?.booking_time || null)}</p>
                    {data?.assigned_to && (
                      <p className="text-xs text-gray-warm mt-1">with {data.assigned_to}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* NDA Card */}
            <div className="px-6 py-5">
              <div className="border border-gray-light rounded-lg p-5">
                <div className="flex items-start gap-3 mb-4">
                  <svg className="w-5 h-5 text-crimson mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-bold text-charcoal">One More Step: Non-Disclosure Agreement</h3>
                    <p className="text-sm text-gray-warm mt-1">
                      Before your discovery call, we ask that you sign a mutual NDA. This ensures all information shared during our conversation remains strictly confidential and protected.
                    </p>
                  </div>
                </div>

                <div className="bg-ivory/50 rounded-lg p-4 mb-4">
                  <h4 className="text-xs font-semibold text-charcoal mb-2 uppercase tracking-wider">What the NDA covers:</h4>
                  <ul className="space-y-1.5 text-sm text-charcoal">
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      All financial and operational data shared remains confidential
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Information used solely for evaluation purposes
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      3-year confidentiality period with materials return
                    </li>
                  </ul>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-soft/10 border border-red-soft/30 rounded-lg">
                    <p className="text-red-soft text-sm">{error}</p>
                  </div>
                )}

                {ndaSent ? (
                  <div className="bg-teal/5 border border-teal/20 rounded-lg p-4 text-center">
                    <svg className="mx-auto w-8 h-8 text-teal mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-semibold text-teal">
                      {data?.nda_already_signed ? 'NDA has been signed — thank you!' : 'NDA sent to your email via DocuSign'}
                    </p>
                    <p className="text-xs text-gray-warm mt-1">
                      {data?.nda_already_signed
                        ? 'We look forward to your discovery call.'
                        : 'Please check your inbox and complete the signature before your call.'}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleRequestNda}
                    disabled={sending}
                    className="w-full py-3 bg-crimson text-white font-semibold rounded-lg hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Sending NDA...
                      </span>
                    ) : 'Send Me the NDA'}
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-ivory/50 border-t border-gray-light">
              <p className="text-xs text-gray-warm text-center">
                Questions? Contact us at info@baxterlabs.ai
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
