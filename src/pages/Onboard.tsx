import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ContactRow {
  name: string
  title: string
  email: string
  phone: string
  linkedin_url: string
  context_notes: string
}

interface DocContact {
  name: string
  title: string
  email: string
  phone: string
}

interface OnboardingData {
  engagement_id: string
  company_name: string
  primary_contact_name: string
  completed: boolean
  completed_at: string | null
  contacts: ContactRow[]
  document_contact: DocContact
}

const emptyContact = (): ContactRow => ({
  name: '',
  title: '',
  email: '',
  phone: '',
  linkedin_url: '',
  context_notes: '',
})

const emptyDocContact = (): DocContact => ({
  name: '',
  title: '',
  email: '',
  phone: '',
})

export default function Onboard() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData | null>(null)
  const [contacts, setContacts] = useState<ContactRow[]>([emptyContact(), emptyContact()])
  const [docContact, setDocContact] = useState<DocContact>(emptyDocContact())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`${API_URL}/api/onboard/${token}`)
      .then(async res => {
        if (!res.ok) throw new Error('Invalid or expired link')
        return res.json()
      })
      .then((d: OnboardingData) => {
        setData(d)
        if (d.completed && d.contacts.length > 0) {
          setContacts(d.contacts)
        }
        if (d.document_contact && d.document_contact.name) {
          setDocContact(d.document_contact)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const updateContact = (idx: number, field: keyof ContactRow, value: string) => {
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  const updateDocContact = (field: keyof DocContact, value: string) => {
    setDocContact(prev => ({ ...prev, [field]: value }))
  }

  const addContact = () => {
    if (contacts.length < 5) setContacts(prev => [...prev, emptyContact()])
  }

  const removeContact = (idx: number) => {
    if (contacts.length > 1) setContacts(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    // Validate interview contacts
    const valid = contacts.every(c => c.name.trim() && c.title.trim() && c.email.trim())
    if (!valid) {
      setSubmitError('Please fill in Name, Title, and Email for each interview contact.')
      return
    }

    // Validate document contact
    if (!docContact.name.trim() || !docContact.title.trim() || !docContact.email.trim()) {
      setSubmitError('Please fill in Name, Title, and Email for the document upload contact.')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidInterviewEmail = contacts.find(c => !emailRegex.test(c.email.trim()))
    if (invalidInterviewEmail) {
      setSubmitError(`Invalid email address: ${invalidInterviewEmail.email}`)
      return
    }
    if (!emailRegex.test(docContact.email.trim())) {
      setSubmitError(`Invalid document contact email: ${docContact.email}`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/onboard/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: contacts.map(c => ({
            name: c.name.trim(),
            title: c.title.trim(),
            email: c.email.trim(),
            phone: c.phone.trim() || null,
            linkedin_url: c.linkedin_url.trim() || null,
            context_notes: c.context_notes.trim() || null,
          })),
          document_contact: {
            name: docContact.name.trim(),
            title: docContact.title.trim(),
            email: docContact.email.trim(),
            phone: docContact.phone.trim() || null,
          },
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.detail || 'Submission failed')
      }

      setSubmitted(true)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-crimson border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-warm">Loading...</p>
        </div>
      </div>
    )
  }

  // --- Error ---
  if (error) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-light p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-red-soft/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-charcoal mb-2">Invalid Link</h2>
          <p className="text-gray-warm text-sm">This link is invalid or has expired. Please contact <a href="mailto:george@baxterlabs.ai" className="text-teal hover:underline">george@baxterlabs.ai</a></p>
        </div>
      </div>
    )
  }

  if (!data) return null

  // --- Success ---
  if (submitted) {
    return (
      <div className="min-h-screen bg-ivory">
        <header className="bg-crimson">
          <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
            <img src="/baxterlabs-logo-white-text.png" alt="BaxterLabs Advisory" className="h-10" />
            <div className="border-l border-white/30 pl-4">
              <h1 className="text-white font-display text-lg font-bold leading-tight">Onboarding</h1>
              <p className="text-white/70 text-sm">{data.company_name}</p>
            </div>
          </div>
        </header>
        <div className="h-[3px] bg-gold" />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl border border-gray-light p-8 text-center">
            <svg className="w-14 h-14 text-green mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="font-display text-2xl font-bold text-charcoal mb-2">Thank You!</h2>
            <p className="text-gray-warm mb-6">
              We've received your interview contacts and will send the document upload portal to <strong className="text-charcoal">{docContact.name}</strong> shortly.
            </p>
            <div className="bg-ivory rounded-lg p-4 text-sm text-charcoal">
              <p className="font-semibold mb-1">What happens next?</p>
              <p className="text-gray-warm">{docContact.name} will receive an email with a secure upload portal and checklist of the financial documents we need.</p>
            </div>
          </div>
          <footer className="mt-12 text-center">
            <p className="text-xs text-gray-warm">
              Questions? Contact <a href="mailto:george@baxterlabs.ai" className="text-teal hover:underline">george@baxterlabs.ai</a>
            </p>
            <p className="text-[10px] text-gray-warm mt-1">&copy; 2026 BaxterLabs Advisory</p>
          </footer>
        </main>
      </div>
    )
  }

  // --- Already Completed (read-only) ---
  if (data.completed) {
    return (
      <div className="min-h-screen bg-ivory">
        <header className="bg-crimson">
          <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
            <img src="/baxterlabs-logo-white-text.png" alt="BaxterLabs Advisory" className="h-10" />
            <div className="border-l border-white/30 pl-4">
              <h1 className="text-white font-display text-lg font-bold leading-tight">Onboarding</h1>
              <p className="text-white/70 text-sm">{data.company_name}</p>
            </div>
          </div>
        </header>
        <div className="h-[3px] bg-gold" />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-green/10 border border-green/30 rounded-xl p-5 mb-6 text-center">
            <svg className="w-10 h-10 text-green mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="font-display text-lg font-bold text-charcoal mb-1">Onboarding Complete</h2>
            <p className="text-gray-warm text-sm">You've already submitted your contacts. If you need to make changes, please contact George at <a href="mailto:george@baxterlabs.ai" className="text-teal hover:underline">george@baxterlabs.ai</a>.</p>
          </div>

          {/* Read-only Interview Contacts */}
          <h3 className="font-display text-base font-bold text-charcoal mb-3">Interview Contacts</h3>
          <div className="space-y-3 mb-6">
            {contacts.map((c, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-light p-4">
                <p className="font-semibold text-charcoal">{c.name} <span className="text-gray-warm font-normal">· {c.title}</span></p>
                <div className="flex flex-wrap gap-3 mt-1 text-gray-warm text-xs">
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                  {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="text-teal hover:underline">LinkedIn</a>}
                </div>
                {c.context_notes && <p className="mt-2 text-sm text-charcoal bg-ivory rounded-lg px-3 py-2">{c.context_notes}</p>}
              </div>
            ))}
          </div>

          {/* Read-only Document Contact */}
          {docContact.name && (
            <>
              <h3 className="font-display text-base font-bold text-charcoal mb-3">Document Upload Contact</h3>
              <div className="bg-white rounded-xl border border-gray-light p-4">
                <p className="font-semibold text-charcoal">{docContact.name} <span className="text-gray-warm font-normal">· {docContact.title}</span></p>
                <div className="flex flex-wrap gap-3 mt-1 text-gray-warm text-xs">
                  {docContact.email && <span>{docContact.email}</span>}
                  {docContact.phone && <span>{docContact.phone}</span>}
                </div>
              </div>
            </>
          )}

          <footer className="mt-12 pt-6 border-t border-gray-light text-center">
            <p className="text-xs text-gray-warm">
              Questions? Contact <a href="mailto:george@baxterlabs.ai" className="text-teal hover:underline">george@baxterlabs.ai</a>
            </p>
            <p className="text-[10px] text-gray-warm mt-1">&copy; 2026 BaxterLabs Advisory</p>
          </footer>
        </main>
      </div>
    )
  }

  // --- Editable Form ---
  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-crimson">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
          <img src="/baxterlabs-logo-white-text.png" alt="BaxterLabs Advisory" className="h-10" />
          <div className="border-l border-white/30 pl-4">
            <h1 className="text-white font-display text-lg font-bold leading-tight">Onboarding</h1>
            <p className="text-white/70 text-sm">{data.company_name}</p>
          </div>
        </div>
      </header>
      <div className="h-[3px] bg-gold" />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-light p-5 mb-6">
          <h2 className="font-display text-lg font-bold text-charcoal mb-2">Welcome, {data.primary_contact_name}</h2>
          <p className="text-sm text-gray-warm leading-relaxed">
            To kick off your diagnostic, we need two things from you: the team members we should interview, and the person who will handle uploading financial documents.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Interview Contacts */}
          <div className="mb-8">
            <h3 className="font-display text-base font-bold text-crimson mb-1">Section 1: Who should we interview?</h3>
            <p className="text-xs text-gray-warm mb-4">We'll conduct confidential interviews with these team members as part of the diagnostic.</p>

            <div className="space-y-4">
              {contacts.map((contact, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-light p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-charcoal text-sm">Contact {idx + 1}</h4>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(idx)}
                        className="text-xs text-red-soft hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-charcoal mb-1">Name <span className="text-crimson">*</span></label>
                      <input
                        type="text"
                        value={contact.name}
                        onChange={e => updateContact(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                        placeholder="John Smith"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-charcoal mb-1">Title <span className="text-crimson">*</span></label>
                      <input
                        type="text"
                        value={contact.title}
                        onChange={e => updateContact(idx, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                        placeholder="VP of Operations"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-charcoal mb-1">Email <span className="text-crimson">*</span></label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={e => updateContact(idx, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-charcoal mb-1">Phone</label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={e => updateContact(idx, 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-charcoal mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        value={contact.linkedin_url}
                        onChange={e => updateContact(idx, 'linkedin_url', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                        placeholder="https://linkedin.com/in/johnsmith"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-charcoal mb-1">Context Notes</label>
                      <textarea
                        value={contact.context_notes}
                        onChange={e => updateContact(idx, 'context_notes', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal resize-none"
                        placeholder="e.g., Best person for financial questions, oversees all vendor relationships"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {contacts.length < 5 && (
              <button
                type="button"
                onClick={addContact}
                className="mt-4 w-full py-2.5 border-2 border-dashed border-gray-light rounded-xl text-sm font-semibold text-teal hover:border-teal/50 hover:bg-teal/5 transition-colors"
              >
                + Add Another Contact
              </button>
            )}
          </div>

          {/* Section 2: Document Upload Contact */}
          <div className="mb-8">
            <h3 className="font-display text-base font-bold text-crimson mb-1">Section 2: Who should handle document uploads?</h3>
            <p className="text-xs text-gray-warm mb-4">We'll send this person a secure upload portal with a checklist of the financial documents we need. This is typically someone in your accounting or finance department.</p>

            <div className="bg-white rounded-xl border border-gray-light p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Name <span className="text-crimson">*</span></label>
                  <input
                    type="text"
                    value={docContact.name}
                    onChange={e => updateDocContact('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    placeholder="Sarah Johnson"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Title <span className="text-crimson">*</span></label>
                  <input
                    type="text"
                    value={docContact.title}
                    onChange={e => updateDocContact('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    placeholder="Controller"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Email <span className="text-crimson">*</span></label>
                  <input
                    type="email"
                    value={docContact.email}
                    onChange={e => updateDocContact('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    placeholder="sarah@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal mb-1">Phone</label>
                  <input
                    type="tel"
                    value={docContact.phone}
                    onChange={e => updateDocContact('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <div className="mb-4 bg-red-soft/10 border border-red-soft/30 rounded-lg p-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-soft flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-soft text-sm">{submitError}</p>
            </div>
          )}

          <div className="text-center">
            <button
              type="submit"
              disabled={submitting}
              className="px-10 py-3.5 bg-crimson text-white rounded-xl font-bold text-base hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>

        <footer className="mt-12 pt-6 border-t border-gray-light text-center">
          <p className="text-xs text-gray-warm">
            Questions? Contact <a href="mailto:george@baxterlabs.ai" className="text-teal hover:underline">george@baxterlabs.ai</a>
          </p>
          <p className="text-[10px] text-gray-warm mt-1">&copy; 2026 BaxterLabs Advisory</p>
        </footer>
      </main>
    </div>
  )
}
