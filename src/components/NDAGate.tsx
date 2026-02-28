import { useEffect, useState, useCallback } from 'react'

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

interface NDAGateProps {
  token: string
  onNdaSent?: () => void
}

export default function NDAGate({ token, onNdaSent }: NDAGateProps) {
  const [data, setData] = useState<ScheduleData | null>(null)
  const [sending, setSending] = useState(false)
  const [ndaSent, setNdaSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/pipeline/schedule/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Schedule link not found')
        return res.json()
      })
      .then((d: ScheduleData) => {
        setData(d)
        if (d.nda_already_requested || d.nda_already_signed) setNdaSent(true)
      })
      .catch(err => setError(err.message))
  }, [token])

  const handleRequestNda = useCallback(async () => {
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
      onNdaSent?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send NDA')
    } finally {
      setSending(false)
    }
  }, [token, onNdaSent])

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

  return (
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
  )
}
