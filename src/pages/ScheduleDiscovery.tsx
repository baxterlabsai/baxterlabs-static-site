import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import NDAGate from '../components/NDAGate'

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

        {/* Phase 2: Booked — show NDAGate */}
        {booked && token && <NDAGate token={token} />}
      </div>
    </div>
  )
}
