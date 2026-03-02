import { useEffect, useState, useRef, useCallback } from 'react'
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
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const fallbackRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef(0)

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

  // Poll backend after booking to sync webhook data
  const pollForBooking = useCallback(() => {
    if (!token) return
    const POLL_DELAYS = [2000, 4000, 8000] // 2s, 4s, 8s
    function poll() {
      if (pollRef.current >= POLL_DELAYS.length) return
      setTimeout(() => {
        fetch(`${API_URL}/api/pipeline/schedule/${token}`)
          .then(res => res.json())
          .then((d: ScheduleData) => {
            setData(d)
            if (!d.booking_time && pollRef.current < POLL_DELAYS.length - 1) {
              pollRef.current += 1
              poll()
            }
          })
          .catch(() => {})
      }, POLL_DELAYS[pollRef.current])
      pollRef.current += 1
    }
    poll()
  }, [token])

  // Show fallback button after 30 seconds, then auto-scroll it into view
  useEffect(() => {
    if (booked) return
    const timer = setTimeout(() => {
      setShowFallback(true)
    }, 30000)
    return () => clearTimeout(timer)
  }, [booked])

  useEffect(() => {
    if (showFallback && fallbackRef.current) {
      fallbackRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [showFallback])

  // Listen for Calendly widget postMessage events
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.event === 'calendly.event_scheduled') {
        setBooked(true)
        pollRef.current = 0
        pollForBooking()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [pollForBooking])

  // Build Calendly embed URL with pre-filled params
  function getCalendlyUrl(): string {
    const base = data?.calendly_url || 'https://calendly.com/george-baxterlabs'
    const params = new URLSearchParams()
    if (data?.contact_name) params.set('name', data.contact_name)
    if (data?.contact_email) params.set('email', data.contact_email)
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }

  // Manual fallback — user clicks "I've booked my call"
  function handleManualBookConfirm() {
    setBooked(true)
    pollRef.current = 0
    pollForBooking()
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
          <>
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
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
            </div>

            {/* Manual fallback button — shown after 30s or when iframe loads */}
            {(showFallback || iframeLoaded) && (
              <div ref={fallbackRef} className="text-center mt-6">
                <p className="text-xs text-gray-warm mb-3">Already completed your booking above?</p>
                <button
                  onClick={handleManualBookConfirm}
                  className="w-full py-3 bg-crimson text-white font-semibold rounded-lg hover:bg-crimson/90 transition-colors animate-pulse-subtle ring-2 ring-gold/60 ring-offset-2 ring-offset-ivory"
                >
                  I've booked my call — continue to NDA
                </button>
              </div>
            )}
          </>
        )}

        {/* Phase 2: Booked — show NDAGate */}
        {booked && token && <NDAGate token={token} initialData={data} />}
      </div>
    </div>
  )
}
