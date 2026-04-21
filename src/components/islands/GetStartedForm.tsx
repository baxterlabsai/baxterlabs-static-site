import { useState } from 'react'

interface FormData {
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
  company_name: string
  website_url: string
  revenue_range: string
  employee_count: string
  pain_points: string
}

const initialFormData: FormData = {
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: '',
  company_name: '',
  website_url: '',
  revenue_range: '',
  employee_count: '',
  pain_points: '',
}

const REVENUE_OPTIONS = [
  '$1M – $5M',
  '$5M – $10M',
  '$10M – $25M',
  '$25M – $50M',
  '$50M – $100M',
  '$100M+',
]

const EMPLOYEE_OPTIONS = [
  '1 – 25',
  '26 – 100',
  '101 – 250',
  '251 – 500',
  '500+',
]

const CALENDLY_URL = 'https://calendly.com/george-baxterlabs'
const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000'

export default function GetStartedForm() {
  const [form, setForm] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const formatPhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 0) return ''
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const updateField = (field: keyof FormData, value: string) => {
    const formatted = field === 'primary_contact_phone' ? formatPhone(value) : value
    setForm(prev => ({ ...prev, [field]: formatted }))
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.primary_contact_name.trim()) errs.primary_contact_name = 'Full name is required'
    if (!form.primary_contact_email.trim()) {
      errs.primary_contact_email = 'Work email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primary_contact_email)) {
      errs.primary_contact_email = 'Please enter a valid email'
    }
    if (!form.company_name.trim()) errs.company_name = 'Company name is required'
    if (!form.website_url.trim()) {
      errs.website_url = 'Company website is required'
    } else {
      let url = form.website_url.trim()
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`
        setForm(prev => ({ ...prev, website_url: url }))
      }
    }
    if (!form.revenue_range) errs.revenue_range = 'Please select a revenue range'
    if (!form.employee_count) errs.employee_count = 'Please select an employee range'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSubmitting(true)
    setSubmitError('')

    const payload = {
      company_name: form.company_name,
      primary_contact_name: form.primary_contact_name,
      primary_contact_email: form.primary_contact_email,
      primary_contact_phone: form.primary_contact_phone || null,
      website_url: form.website_url,
      revenue_range: form.revenue_range,
      employee_count: form.employee_count,
      pain_points: form.pain_points || null,
    }

    try {
      const res = await fetch(`${API_URL}/api/pipeline/website-intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Server error (${res.status})`)
      }

      const data = await res.json()

      // Redirect through platform scheduling flow if token available,
      // otherwise fall back to direct Calendly with pre-filled fields
      if (data.schedule_token) {
        window.location.href = `/schedule/${data.schedule_token}`
      } else {
        const name = encodeURIComponent(form.primary_contact_name)
        const email = encodeURIComponent(form.primary_contact_email)
        window.location.href = `${CALENDLY_URL}?name=${name}&email=${email}`
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Header */}
      <section className="bg-surface px-6 md:px-12 py-16 md:py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-6">
            Start Your Diagnostic
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            Submit your details below to begin the diagnostic review process.
          </p>
          <p className="text-on-surface-variant/70 text-sm mt-3 max-w-lg mx-auto">
            Designed for companies with $5M–$50M in revenue.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-surface-container-low pb-20 px-6 md:px-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface-container-lowest rounded-sm shadow-sm border border-outline-variant/20 p-6 md:p-10">
            <p className="text-on-surface-variant/60 text-xs mb-6 leading-relaxed">
              Each submission is reviewed in advance using publicly available data and internal research models.
            </p>
            <div className="space-y-5">
              {/* Full Name + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Full Name" required error={errors.primary_contact_name}>
                  <input
                    type="text"
                    value={form.primary_contact_name}
                    onChange={e => updateField('primary_contact_name', e.target.value)}
                    placeholder="Jane Smith"
                    className={inputClass(errors.primary_contact_name)}
                  />
                </Field>
                <Field label="Phone Number">
                  <input
                    type="tel"
                    value={form.primary_contact_phone}
                    onChange={e => updateField('primary_contact_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className={inputClass()}
                  />
                </Field>
              </div>

              {/* Work Email */}
              <Field label="Work Email" required error={errors.primary_contact_email}>
                <input
                  type="email"
                  value={form.primary_contact_email}
                  onChange={e => updateField('primary_contact_email', e.target.value)}
                  placeholder="jane@acmeindustries.com"
                  className={inputClass(errors.primary_contact_email)}
                />
              </Field>

              {/* Company Name */}
              <Field label="Company Name" required error={errors.company_name}>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={e => updateField('company_name', e.target.value)}
                  placeholder="Acme Industries"
                  className={inputClass(errors.company_name)}
                />
              </Field>

              {/* Company Website */}
              <Field label="Company Website (used for pre-call analysis)" required error={errors.website_url}>
                <input
                  type="url"
                  value={form.website_url}
                  onChange={e => updateField('website_url', e.target.value)}
                  placeholder="https://www.acmeindustries.com"
                  className={inputClass(errors.website_url)}
                />
              </Field>

              {/* Revenue + Employees */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Annual Revenue" required error={errors.revenue_range}>
                  <select
                    value={form.revenue_range}
                    onChange={e => updateField('revenue_range', e.target.value)}
                    className={selectClass(errors.revenue_range)}
                  >
                    <option value="">Select range...</option>
                    {REVENUE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Number of Employees" required error={errors.employee_count}>
                  <select
                    value={form.employee_count}
                    onChange={e => updateField('employee_count', e.target.value)}
                    className={selectClass(errors.employee_count)}
                  >
                    <option value="">Select range...</option>
                    {EMPLOYEE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Pain Points */}
              <Field label="Where do you believe margin is leaking or performance is breaking down?">
                <textarea
                  value={form.pain_points}
                  onChange={e => updateField('pain_points', e.target.value)}
                  rows={3}
                  placeholder="Vendor costs, payroll alignment, pricing gaps, operational friction — anything on your radar."
                  className={inputClass()}
                />
              </Field>
            </div>

            {/* Error */}
            {submitError && (
              <div className="mt-6 p-4 bg-red-soft/10 border border-red-soft/30 rounded-sm">
                <p className="text-red-soft text-sm font-medium">{submitError}</p>
              </div>
            )}

            {/* Submit */}
            <div className="mt-8">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-primary text-on-primary py-4 rounded-sm font-label text-sm uppercase tracking-widest font-bold shadow-lg hover:bg-primary-container transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Continue to Scheduling'
                )}
              </button>
            </div>

            {/* Trust line */}
            <p className="mt-4 text-center text-on-surface-variant/50 text-xs font-label">
              Used only for pre-call diagnostic review. All information handled confidentially.
            </p>
          </div>

          {/* Process note */}
          <div className="mt-8 flex items-start gap-3 px-2">
            <span className="material-symbols-outlined text-secondary text-lg mt-0.5 shrink-0">info</span>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              A structured onboarding process begins only after mutual fit is confirmed. No commitments at this stage.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

// ── Helper Components ──

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-on-surface mb-1.5">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
        {hint && <span className="text-on-surface-variant/50 font-normal text-xs ml-2">— {hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-soft font-medium">{error}</p>}
    </div>
  )
}

function inputClass(error?: string): string {
  return `w-full px-4 py-2.5 rounded-sm border ${
    error ? 'border-red-soft' : 'border-outline-variant/40'
  } bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-colors text-sm`
}

function selectClass(error?: string): string {
  return `w-full px-4 py-2.5 rounded-sm border ${
    error ? 'border-red-soft' : 'border-outline-variant/40'
  } bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-colors text-sm`
}
