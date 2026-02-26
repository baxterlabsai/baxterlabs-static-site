import { useState } from 'react'
import SEO from '../components/SEO'

interface InterviewContact {
  name: string
  title: string
  email: string
  phone: string
  linkedin_url: string
}

interface FormData {
  company_name: string
  primary_contact_name: string
  primary_contact_email: string
  primary_contact_phone: string
  industry: string
  revenue_range: string
  employee_count: string
  website_url: string
  pain_points: string
  referral_source: string
  preferred_start_date: string
  interview_contacts: InterviewContact[]
}

const emptyContact = (): InterviewContact => ({
  name: '',
  title: '',
  email: '',
  phone: '',
  linkedin_url: '',
})

const initialFormData: FormData = {
  company_name: '',
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: '',
  industry: '',
  revenue_range: '',
  employee_count: '',
  website_url: '',
  pain_points: '',
  referral_source: '',
  preferred_start_date: '',
  interview_contacts: [emptyContact()],
}

const INDUSTRY_OPTIONS = [
  'Manufacturing',
  'Distribution / Wholesale',
  'Professional Services',
  'Technology / SaaS',
  'Healthcare',
  'Construction',
  'Retail / E-commerce',
  'Financial Services',
  'Real Estate',
  'Other',
]

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

const REFERRAL_OPTIONS = [
  'Referral / Word of Mouth',
  'Google Search',
  'LinkedIn',
  'Industry Event / Conference',
  'Other',
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function GetStarted() {
  const [form, setForm] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [currentStep, setCurrentStep] = useState(1)

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

  const updateContact = (index: number, field: keyof InterviewContact, value: string) => {
    const formatted = field === 'phone' ? formatPhone(value) : value
    setForm(prev => {
      const contacts = [...prev.interview_contacts]
      contacts[index] = { ...contacts[index], [field]: formatted }
      return { ...prev, interview_contacts: contacts }
    })
    if (errors[`contact_${index}_${field}`]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[`contact_${index}_${field}`]
        return next
      })
    }
  }

  const addContact = () => {
    if (form.interview_contacts.length < 3) {
      setForm(prev => ({
        ...prev,
        interview_contacts: [...prev.interview_contacts, emptyContact()],
      }))
    }
  }

  const removeContact = (index: number) => {
    if (form.interview_contacts.length > 1) {
      setForm(prev => ({
        ...prev,
        interview_contacts: prev.interview_contacts.filter((_, i) => i !== index),
      }))
    }
  }

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.company_name.trim()) errs.company_name = 'Company name is required'
    if (!form.primary_contact_name.trim()) errs.primary_contact_name = 'Your name is required'
    if (!form.primary_contact_email.trim()) {
      errs.primary_contact_email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primary_contact_email)) {
      errs.primary_contact_email = 'Please enter a valid email'
    }
    if (!form.website_url.trim()) {
      errs.website_url = 'Company website is required'
    } else {
      // Auto-prepend https:// if missing
      let url = form.website_url.trim()
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`
        setForm(prev => ({ ...prev, website_url: url }))
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.industry) errs.industry = 'Please select an industry'
    if (!form.revenue_range) errs.revenue_range = 'Please select a revenue range'
    if (!form.employee_count) errs.employee_count = 'Please select an employee range'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    setErrors({})
    setCurrentStep(prev => Math.max(1, prev - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {}
    // Contact 1 is required
    const c1 = form.interview_contacts[0]
    if (!c1 || !c1.name.trim()) errs.contact_0_name = 'Contact 1 name is required'
    if (!c1 || !c1.title.trim()) errs.contact_0_title = 'Contact 1 title is required'
    if (!c1 || !c1.email.trim()) {
      errs.contact_0_email = 'Contact 1 email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c1.email)) {
      errs.contact_0_email = 'Please enter a valid email'
    }
    // Contacts 2-3: if name is provided, require title and email
    for (let i = 1; i < form.interview_contacts.length; i++) {
      const c = form.interview_contacts[i]
      if (c.name.trim()) {
        if (!c.title.trim()) errs[`contact_${i}_title`] = 'Title is required'
        if (!c.email.trim()) {
          errs[`contact_${i}_email`] = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
          errs[`contact_${i}_email`] = 'Please enter a valid email'
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validateStep3()) return

    setSubmitting(true)
    setSubmitError('')

    // Filter out empty contacts
    const contacts = form.interview_contacts.filter(c => c.name.trim())

    const payload = {
      ...form,
      preferred_start_date: form.preferred_start_date || null,
      interview_contacts: contacts,
    }

    try {
      const res = await fetch(`${API_URL}/api/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Server error (${res.status})`)
      }

      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success State ──
  if (submitted) {
    return (
      <>
        <SEO
          title="Thank You | BaxterLabs Advisory"
          description="Your intake form has been submitted. We'll be in touch shortly."
        />

        <section className="bg-white py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green/10 rounded-full mb-6">
              <svg className="w-8 h-8 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-crimson mb-4">
              Thank You — We're on It.
            </h1>
            <p className="text-charcoal text-lg mb-3">
              Your intake form has been received. Here's what happens next:
            </p>
            <div className="text-left max-w-lg mx-auto mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-crimson text-white text-sm font-bold flex items-center justify-center mt-0.5">1</span>
                <p className="text-charcoal"><strong>NDA</strong> — Check your inbox for a DocuSign NDA. Sign it so we can begin reviewing your information under confidentiality.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-crimson text-white text-sm font-bold flex items-center justify-center mt-0.5">2</span>
                <p className="text-charcoal"><strong>Discovery Call</strong> — Book a free 30-minute call using the calendar below. We'll ask the right questions and confirm fit.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-crimson text-white text-sm font-bold flex items-center justify-center mt-0.5">3</span>
                <p className="text-charcoal"><strong>Kickoff</strong> — If we're a fit, we'll send the engagement agreement and get started within days.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Calendly Embed */}
        <section className="bg-ivory py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-teal text-center mb-2">
              Schedule Your Discovery Call
            </h2>
            <p className="text-gray-warm text-center mb-8">
              Pick a time that works for you. This is a free, no-obligation conversation.
            </p>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ minHeight: '700px' }}>
              <iframe
                src={`https://calendly.com/george-baxterlabs?name=${encodeURIComponent(form.primary_contact_name)}&email=${encodeURIComponent(form.primary_contact_email)}`}
                width="100%"
                height="700"
                frameBorder="0"
                title="Schedule a Discovery Call with BaxterLabs Advisory"
                className="border-0"
              />
            </div>
          </div>
        </section>

      </>
    )
  }

  // ── Form State ──
  return (
    <>
      <SEO
        title="Get Started | BaxterLabs Advisory"
        description="Book a free 30-minute discovery call with BaxterLabs Advisory. We'll tell you honestly whether a profit leak audit makes sense for your business."
      />

      {/* Header */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-crimson mb-6">
            Let's Find Your Profit Leaks.
          </h1>
          <p className="text-charcoal text-base md:text-lg max-w-2xl mx-auto">
            Complete the form below to get started. We'll send you an NDA, then schedule a free discovery call to see if a BaxterLabs engagement is the right fit.
          </p>
        </div>
      </section>

      {/* Progress Steps */}
      <section className="bg-ivory pt-10 pb-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 mb-0">
            {[
              { num: 1, label: 'Contact Info' },
              { num: 2, label: 'Company Details' },
              { num: 3, label: 'Interview Contacts' },
            ].map(({ num, label }) => (
              <div key={num} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold transition-colors ${
                  currentStep === num
                    ? 'bg-crimson text-white'
                    : currentStep > num
                    ? 'bg-green/10 text-green'
                    : 'bg-gray-light text-gray-warm'
                }`}>
                  {currentStep > num ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-5 h-5 flex items-center justify-center">{num}</span>
                  )}
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {num < 3 && (
                  <div className={`w-8 sm:w-12 h-0.5 mx-1 ${
                    currentStep > num ? 'bg-green' : 'bg-gray-light'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-ivory py-10 md:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-light p-6 md:p-10">

            {/* Step 1: Contact Info */}
            {currentStep === 1 && (
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold text-teal mb-6">
                  Your Contact Information
                </h2>

                <div className="space-y-5">
                  <Field
                    label="Company Name"
                    required
                    error={errors.company_name}
                  >
                    <input
                      type="text"
                      value={form.company_name}
                      onChange={e => updateField('company_name', e.target.value)}
                      placeholder="Acme Industries"
                      className={inputClass(errors.company_name)}
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field
                      label="Your Full Name"
                      required
                      error={errors.primary_contact_name}
                    >
                      <input
                        type="text"
                        value={form.primary_contact_name}
                        onChange={e => updateField('primary_contact_name', e.target.value)}
                        placeholder="Jane Smith"
                        className={inputClass(errors.primary_contact_name)}
                      />
                    </Field>

                    <Field
                      label="Phone Number"
                    >
                      <input
                        type="tel"
                        value={form.primary_contact_phone}
                        onChange={e => updateField('primary_contact_phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        className={inputClass()}
                      />
                    </Field>
                  </div>

                  <Field
                    label="Email Address"
                    required
                    error={errors.primary_contact_email}
                  >
                    <input
                      type="email"
                      value={form.primary_contact_email}
                      onChange={e => updateField('primary_contact_email', e.target.value)}
                      placeholder="jane@acmeindustries.com"
                      className={inputClass(errors.primary_contact_email)}
                    />
                  </Field>

                  <Field label="Company Website" required error={errors.website_url}>
                    <input
                      type="url"
                      value={form.website_url}
                      onChange={e => updateField('website_url', e.target.value)}
                      placeholder="https://www.acmeindustries.com"
                      className={inputClass(errors.website_url)}
                    />
                  </Field>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={nextStep}
                    className="px-8 h-12 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90"
                  >
                    Next: Company Details
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Company Details */}
            {currentStep === 2 && (
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold text-teal mb-6">
                  Company Details
                </h2>

                <div className="space-y-5">
                  <Field
                    label="Industry"
                    required
                    error={errors.industry}
                  >
                    <select
                      value={form.industry}
                      onChange={e => updateField('industry', e.target.value)}
                      className={selectClass(errors.industry)}
                    >
                      <option value="">Select industry...</option>
                      {INDUSTRY_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field
                      label="Annual Revenue"
                      required
                      error={errors.revenue_range}
                    >
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

                  <Field label="What's keeping you up at night?">
                    <textarea
                      value={form.pain_points}
                      onChange={e => updateField('pain_points', e.target.value)}
                      rows={4}
                      placeholder="Tell us about the challenges or areas where you suspect margin is slipping — vendor costs, payroll bloat, pricing gaps, anything."
                      className={inputClass()}
                    />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="How did you hear about us?">
                      <select
                        value={form.referral_source}
                        onChange={e => updateField('referral_source', e.target.value)}
                        className={selectClass()}
                      >
                        <option value="">Select...</option>
                        {REFERRAL_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Preferred Start Date">
                      <input
                        type="date"
                        value={form.preferred_start_date}
                        onChange={e => updateField('preferred_start_date', e.target.value)}
                        className={inputClass()}
                      />
                    </Field>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-6 h-12 border border-gray-light text-charcoal font-semibold rounded-lg transition-colors hover:bg-gray-light/50"
                  >
                    Back
                  </button>
                  <button
                    onClick={nextStep}
                    className="px-8 h-12 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90"
                  >
                    Next: Interview Contacts
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Interview Contacts + Submit */}
            {currentStep === 3 && (
              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold text-teal mb-2">
                  Interview Contacts
                </h2>
                <p className="text-gray-warm text-sm mb-6">
                  Provide up to 3 people we may interview during the audit — department heads, controllers, operations leads, etc. <strong className="text-charcoal">At least one contact is required.</strong>
                </p>

                <div className="space-y-6">
                  {form.interview_contacts.map((contact, idx) => (
                    <div key={idx} className="p-4 bg-ivory rounded-lg border border-gray-light">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-teal">Contact {idx + 1}</span>
                        {form.interview_contacts.length > 1 && (
                          <button
                            onClick={() => removeContact(idx)}
                            className="text-red-soft text-sm font-medium hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <input
                              type="text"
                              value={contact.name}
                              onChange={e => updateContact(idx, 'name', e.target.value)}
                              placeholder={idx === 0 ? 'Full name *' : 'Full name'}
                              className={inputClass(errors[`contact_${idx}_name`])}
                            />
                            {errors[`contact_${idx}_name`] && <p className="mt-1 text-xs text-red-soft font-medium">{errors[`contact_${idx}_name`]}</p>}
                          </div>
                          <div>
                            <input
                              type="text"
                              value={contact.title}
                              onChange={e => updateContact(idx, 'title', e.target.value)}
                              placeholder={idx === 0 ? 'Title (e.g., CFO) *' : 'Title (e.g., CFO)'}
                              className={inputClass(errors[`contact_${idx}_title`])}
                            />
                            {errors[`contact_${idx}_title`] && <p className="mt-1 text-xs text-red-soft font-medium">{errors[`contact_${idx}_title`]}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <input
                              type="email"
                              value={contact.email}
                              onChange={e => updateContact(idx, 'email', e.target.value)}
                              placeholder={idx === 0 ? 'Email *' : 'Email'}
                              className={inputClass(errors[`contact_${idx}_email`])}
                            />
                            {errors[`contact_${idx}_email`] && <p className="mt-1 text-xs text-red-soft font-medium">{errors[`contact_${idx}_email`]}</p>}
                          </div>
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={e => updateContact(idx, 'phone', e.target.value)}
                            placeholder="Phone"
                            className={inputClass()}
                          />
                        </div>
                        <input
                          type="url"
                          value={contact.linkedin_url}
                          onChange={e => updateContact(idx, 'linkedin_url', e.target.value)}
                          placeholder="LinkedIn URL (optional)"
                          className={inputClass()}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {form.interview_contacts.length < 3 && (
                  <button
                    onClick={addContact}
                    className="mt-4 flex items-center gap-1.5 text-teal font-semibold text-sm hover:underline"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Another Contact
                  </button>
                )}

                {submitError && (
                  <div className="mt-6 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg">
                    <p className="text-red-soft text-sm font-medium">{submitError}</p>
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={prevStep}
                    className="px-6 h-12 border border-gray-light text-charcoal font-semibold rounded-lg transition-colors hover:bg-gray-light/50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 h-12 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Submit & Get Started'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Note */}
          <p className="mt-6 text-center text-gray-warm text-xs">
            Your information is kept strictly confidential. An NDA will be sent immediately upon submission.
          </p>
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
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal mb-1.5">
        {label}
        {required && <span className="text-crimson ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-soft font-medium">{error}</p>}
    </div>
  )
}

function inputClass(error?: string): string {
  return `w-full px-4 py-2.5 rounded-lg border ${
    error ? 'border-red-soft' : 'border-gray-light'
  } bg-white text-charcoal placeholder:text-gray-warm/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors text-sm`
}

function selectClass(error?: string): string {
  return `w-full px-4 py-2.5 rounded-lg border ${
    error ? 'border-red-soft' : 'border-gray-light'
  } bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors text-sm`
}
