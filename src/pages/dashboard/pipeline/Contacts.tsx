import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api'
import { formatPhone, stripPhone } from '../../../lib/formatPhone'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Company {
  id: string
  name: string
  industry: string | null
}

interface Contact {
  id: string
  company_id: string | null
  name: string
  title: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  is_decision_maker: boolean
  notes: string | null
  source: string | null
  created_at: string
  updated_at: string
  pipeline_companies: { id: string; name: string } | null
}

interface Opportunity {
  id: string
  title: string
  stage: string
  estimated_value: number | null
}

interface Activity {
  id: string
  type: string
  subject: string
  occurred_at: string
  outcome: string | null
}

interface ContactDetail extends Contact {
  activities: Activity[]
  opportunities: Opportunity[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGE_COLORS: Record<string, string> = {
  identified: 'bg-gray-light text-charcoal',
  contacted: 'bg-blue-100 text-blue-800',
  discovery_scheduled: 'bg-teal/10 text-teal',
  nda_sent: 'bg-gold/10 text-charcoal',
  nda_signed: 'bg-gold/20 text-charcoal',
  discovery_complete: 'bg-teal/20 text-teal',
  negotiation: 'bg-gold/30 text-charcoal',
  agreement_sent: 'bg-crimson/10 text-crimson',
  won: 'bg-green/10 text-green',
  lost: 'bg-red-soft/10 text-red-soft',
  dormant: 'bg-gray-light/50 text-charcoal',
}

const STAGE_LABELS: Record<string, string> = {
  identified: 'Identified',
  contacted: 'Contacted',
  discovery_scheduled: 'Discovery',
  nda_sent: 'NDA Sent',
  nda_signed: 'NDA Signed',
  discovery_complete: 'Disc. Complete',
  negotiation: 'Negotiation',
  agreement_sent: 'Agreement Sent',
  won: 'Won',
  lost: 'Lost',
  dormant: 'Dormant',
}

const SOURCE_COLORS: Record<string, string> = {
  referral: 'bg-green/10 text-green',
  website: 'bg-teal/10 text-teal',
  linkedin: 'bg-blue-100 text-blue-800',
  conference: 'bg-gold/20 text-charcoal',
  cold_outreach: 'bg-gray-light text-charcoal',
  inbound: 'bg-crimson/10 text-crimson',
}

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  video_call: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
  phone_call: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
  email: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  dm: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  linkedin: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
  meeting: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  note: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  referral: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatCurrency(value: number | null): string {
  if (value == null) return '--'
  return `$${value.toLocaleString()}`
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PipelineContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      apiGet<{ contacts: Contact[] }>('/api/pipeline/contacts'),
      apiGet<{ companies: Company[] }>('/api/pipeline/companies'),
    ])
      .then(([contactData, compData]) => {
        setContacts(contactData.contacts)
        setCompanies(compData.companies)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.pipeline_companies?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.title || '').toLowerCase().includes(search.toLowerCase())
      )
    : contacts

  async function handleAdd(data: Record<string, unknown>) {
    try {
      const result = await apiPost<Contact>('/api/pipeline/contacts', data)
      // Re-fetch to get the joined company name
      const refreshed = await apiGet<{ contacts: Contact[] }>('/api/pipeline/contacts')
      setContacts(refreshed.contacts)
      setShowAddModal(false)
      return result
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create contact')
    }
  }

  async function handleUpdate(id: string, data: Record<string, unknown>) {
    try {
      await apiPut<Contact>(`/api/pipeline/contacts/${id}`, data)
      // Re-fetch to get updated joined data
      const refreshed = await apiGet<{ contacts: Contact[] }>('/api/pipeline/contacts')
      setContacts(refreshed.contacts)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update contact')
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/pipeline/contacts/${id}`)
      setContacts(prev => prev.filter(c => c.id !== id))
      setDetailId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-crimson border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Contacts</h1>
          <p className="text-gray-warm text-sm mt-1">{filtered.length} prospect contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-warm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="pl-9 pr-4 py-2 rounded-lg border border-gray-light bg-white text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30 w-56"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Contact
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg flex items-center justify-between">
          <p className="text-red-soft text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-soft/60 hover:text-red-soft">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
          <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <p className="text-lg font-semibold text-charcoal mb-1">
            {search ? 'No contacts match your search' : 'No contacts yet'}
          </p>
          <p className="text-gray-warm text-sm mb-4">
            {search ? 'Try a different search term.' : 'Add your first prospect contact to get started.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowAddModal(true)}
              className="text-teal text-sm font-semibold hover:underline"
            >
              Add Contact
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-light bg-ivory/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider hidden md:table-cell">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider hidden lg:table-cell">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider hidden xl:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider hidden xl:table-cell">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-light">
                {filtered.map(contact => (
                  <tr
                    key={contact.id}
                    onClick={() => setDetailId(contact.id)}
                    className="hover:bg-ivory/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal/10 text-teal flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {contact.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-charcoal">
                            {contact.name}
                            {contact.is_decision_maker && (
                              <span className="ml-1.5 inline-block px-1.5 py-0.5 bg-gold/20 text-gold text-xs font-semibold rounded">DM</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal hidden md:table-cell">
                      {contact.pipeline_companies?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal hidden lg:table-cell">{contact.title || '—'}</td>
                    <td className="px-4 py-3 text-sm text-charcoal hidden sm:table-cell">
                      {contact.email ? (
                        <span className="truncate block max-w-[180px]">{contact.email}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal hidden xl:table-cell">{contact.phone || '—'}</td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {contact.source ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[contact.source] || 'bg-gray-light text-charcoal'}`}>
                          {contact.source.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-warm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-warm">{timeAgo(contact.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddContactModal
          companies={companies}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Detail Slide-Over */}
      {detailId && (
        <ContactSlideOver
          contactId={detailId}
          companies={companies}
          onClose={() => setDetailId(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Contact Modal
// ---------------------------------------------------------------------------

function AddContactModal({
  companies,
  onSubmit,
  onClose,
}: {
  companies: Company[]
  onSubmit: (data: Record<string, unknown>) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [companySearch, setCompanySearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [isDecisionMaker, setIsDecisionMaker] = useState(false)
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filteredCompanies = companySearch.length > 0
    ? companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
    : companies

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const data: Record<string, unknown> = { name }
    if (selectedCompanyId) data.company_id = selectedCompanyId
    if (title) data.title = title
    if (email) data.email = email
    if (phone) data.phone = stripPhone(phone)
    if (linkedinUrl) data.linkedin_url = linkedinUrl
    if (isDecisionMaker) data.is_decision_maker = true
    if (source) data.source = source
    if (notes) data.notes = notes
    await onSubmit(data)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <h2 className="font-display text-xl font-bold text-charcoal">Add Contact</h2>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-gray-light" />
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Jane Smith"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              required
              autoFocus
            />
          </div>

          {/* Company typeahead */}
          <div className="relative">
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Company *</label>
            <input
              type="text"
              value={selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.name || '' : companySearch}
              onChange={e => {
                setCompanySearch(e.target.value)
                setSelectedCompanyId('')
                setShowCompanyDropdown(true)
              }}
              onFocus={() => setShowCompanyDropdown(true)}
              placeholder="Search for a company..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
            {selectedCompanyId && (
              <button
                type="button"
                onClick={() => { setSelectedCompanyId(''); setCompanySearch('') }}
                className="absolute right-3 top-[38px] text-gray-warm hover:text-charcoal"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {showCompanyDropdown && filteredCompanies.length > 0 && !selectedCompanyId && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-light max-h-40 overflow-y-auto">
                {filteredCompanies.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedCompanyId(c.id); setCompanySearch(''); setShowCompanyDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-ivory"
                  >
                    {c.name}
                    {c.industry && <span className="text-gray-warm ml-2 text-xs">{c.industry}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Title <span className="text-gray-warm font-normal">(Recommended)</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., VP of Operations"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">LinkedIn URL</label>
            <input
              type="url"
              value={linkedinUrl}
              onChange={e => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Source</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              >
                <option value="">Select source...</option>
                <option value="referral">Referral</option>
                <option value="website">Website</option>
                <option value="linkedin">LinkedIn</option>
                <option value="conference">Conference</option>
                <option value="cold_outreach">Cold Outreach</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDecisionMaker}
                  onChange={e => setIsDecisionMaker(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-light text-teal focus:ring-teal/30"
                />
                <span className="text-sm font-medium text-charcoal">Decision Maker</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes about this contact..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-crimson rounded-lg hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating...
                </span>
              ) : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Contact Slide-Over Detail
// ---------------------------------------------------------------------------

function ContactSlideOver({
  contactId,
  companies,
  onClose,
  onUpdate,
  onDelete,
}: {
  contactId: string
  companies: Company[]
  onClose: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}) {
  const [detail, setDetail] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editCompanyId, setEditCompanyId] = useState('')
  const [editCompanySearch, setEditCompanySearch] = useState('')
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLinkedinUrl, setEditLinkedinUrl] = useState('')
  const [editIsDecisionMaker, setEditIsDecisionMaker] = useState(false)
  const [editSource, setEditSource] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const filteredCompanies = editCompanySearch.length > 0
    ? companies.filter(c => c.name.toLowerCase().includes(editCompanySearch.toLowerCase()))
    : companies

  useEffect(() => {
    setLoading(true)
    apiGet<ContactDetail>(`/api/pipeline/contacts/${contactId}`)
      .then(data => {
        setDetail(data)
        setEditName(data.name)
        setEditCompanyId(data.company_id || '')
        setEditTitle(data.title || '')
        setEditEmail(data.email || '')
        setEditPhone(data.phone || '')
        setEditLinkedinUrl(data.linkedin_url || '')
        setEditIsDecisionMaker(data.is_decision_maker)
        setEditSource(data.source || '')
        setEditNotes(data.notes || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [contactId])

  async function handleSave() {
    if (!detail) return
    setSaving(true)
    const updates: Record<string, unknown> = {}
    if (editName !== detail.name) updates.name = editName
    if (editCompanyId !== (detail.company_id || '')) updates.company_id = editCompanyId || null
    if (editTitle !== (detail.title || '')) updates.title = editTitle || null
    if (editEmail !== (detail.email || '')) updates.email = editEmail || null
    if (editPhone !== (detail.phone || '')) updates.phone = editPhone ? stripPhone(editPhone) : null
    if (editLinkedinUrl !== (detail.linkedin_url || '')) updates.linkedin_url = editLinkedinUrl || null
    if (editIsDecisionMaker !== detail.is_decision_maker) updates.is_decision_maker = editIsDecisionMaker
    if (editSource !== (detail.source || '')) updates.source = editSource || null
    if (editNotes !== (detail.notes || '')) updates.notes = editNotes || null

    if (Object.keys(updates).length > 0) {
      await onUpdate(contactId, updates)
      setDetail(prev => prev ? { ...prev, ...updates } as ContactDetail : prev)
    }
    setSaving(false)
    setEditing(false)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-light flex-shrink-0">
          <h2 className="font-display text-lg font-bold text-charcoal truncate">Contact Detail</h2>
          <div className="flex items-center gap-2">
            {detail && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-teal font-semibold hover:text-teal/80 px-2 py-1"
              >
                Edit
              </button>
            )}
            <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-3 border-crimson border-t-transparent rounded-full" />
            </div>
          ) : detail ? (
            <>
              {editing ? (
                /* Edit Form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1.5">Name *</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" required />
                  </div>

                  {/* Company typeahead */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-charcoal mb-1.5">Company</label>
                    <input
                      type="text"
                      value={editCompanyId ? companies.find(c => c.id === editCompanyId)?.name || '' : editCompanySearch}
                      onChange={e => {
                        setEditCompanySearch(e.target.value)
                        setEditCompanyId('')
                        setShowCompanyDropdown(true)
                      }}
                      onFocus={() => setShowCompanyDropdown(true)}
                      placeholder="Search for a company..."
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    />
                    {editCompanyId && (
                      <button
                        type="button"
                        onClick={() => { setEditCompanyId(''); setEditCompanySearch('') }}
                        className="absolute right-3 top-[38px] text-gray-warm hover:text-charcoal"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    {showCompanyDropdown && filteredCompanies.length > 0 && !editCompanyId && (
                      <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-light max-h-40 overflow-y-auto">
                        {filteredCompanies.slice(0, 8).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setEditCompanyId(c.id); setEditCompanySearch(''); setShowCompanyDropdown(false) }}
                            className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-ivory"
                          >
                            {c.name}
                            {c.industry && <span className="text-gray-warm ml-2 text-xs">{c.industry}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1.5">Title</label>
                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="e.g., VP of Operations" className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-1.5">Email</label>
                      <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-1.5">Phone</label>
                      <input type="tel" value={editPhone} onChange={e => setEditPhone(formatPhone(e.target.value))} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1.5">LinkedIn URL</label>
                    <input type="url" value={editLinkedinUrl} onChange={e => setEditLinkedinUrl(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-1.5">Source</label>
                      <select value={editSource} onChange={e => setEditSource(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
                        <option value="">No source</option>
                        <option value="referral">Referral</option>
                        <option value="website">Website</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="conference">Conference</option>
                        <option value="cold_outreach">Cold Outreach</option>
                        <option value="inbound">Inbound</option>
                      </select>
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editIsDecisionMaker}
                          onChange={e => setEditIsDecisionMaker(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-light text-teal focus:ring-teal/30"
                        />
                        <span className="text-sm font-medium text-charcoal">Decision Maker</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1.5">Notes</label>
                    <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none" />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !editName.trim()}
                      className="px-4 py-2 text-sm font-semibold text-white bg-teal rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          Saving...
                        </span>
                      ) : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Read-only view */
                <>
                  {/* Name & avatar */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-teal/10 text-teal flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {detail.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-charcoal">
                        {detail.name}
                        {detail.is_decision_maker && (
                          <span className="ml-2 inline-block px-2 py-0.5 bg-gold/20 text-gold text-xs font-semibold rounded">Decision Maker</span>
                        )}
                      </h3>
                      {detail.title && <p className="text-sm text-gray-warm">{detail.title}</p>}
                      {detail.source && (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mt-1.5 ${SOURCE_COLORS[detail.source] || 'bg-gray-light text-charcoal'}`}>
                          {detail.source.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">Company</p>
                      {detail.pipeline_companies?.name ? (
                        <p className="font-medium text-teal">{detail.pipeline_companies.name}</p>
                      ) : (
                        <p className="font-medium text-charcoal">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">Email</p>
                      {detail.email ? (
                        <a href={`mailto:${detail.email}`} className="font-medium text-teal hover:underline">{detail.email}</a>
                      ) : (
                        <p className="font-medium text-charcoal">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">Phone</p>
                      {detail.phone ? (
                        <a href={`tel:${detail.phone}`} className="font-medium text-teal hover:underline">{detail.phone}</a>
                      ) : (
                        <p className="font-medium text-charcoal">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">LinkedIn</p>
                      {detail.linkedin_url ? (
                        <a href={detail.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-medium text-teal hover:underline truncate block">Profile</a>
                      ) : (
                        <p className="font-medium text-charcoal">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">Added</p>
                      <p className="font-medium text-charcoal">{timeAgo(detail.created_at)}</p>
                    </div>
                    {detail.notes && (
                      <div className="col-span-2">
                        <p className="text-gray-warm text-xs mb-0.5">Notes</p>
                        <p className="text-charcoal whitespace-pre-wrap text-sm">{detail.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Opportunities */}
                  <div>
                    <h4 className="text-sm font-semibold text-charcoal mb-2">
                      Opportunities ({detail.opportunities.length})
                    </h4>
                    {detail.opportunities.length === 0 ? (
                      <p className="text-xs text-gray-warm">No opportunities linked as primary contact</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.opportunities.map(opp => (
                          <div key={opp.id} className="flex items-center justify-between bg-ivory/50 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-charcoal truncate">{opp.title}</p>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${STAGE_COLORS[opp.stage] || 'bg-gray-light text-charcoal'}`}>
                                {STAGE_LABELS[opp.stage] || opp.stage}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-charcoal flex-shrink-0 ml-3">
                              {formatCurrency(opp.estimated_value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Activities */}
                  <div>
                    <h4 className="text-sm font-semibold text-charcoal mb-2">
                      Recent Activities ({detail.activities.length})
                    </h4>
                    {detail.activities.length === 0 ? (
                      <p className="text-xs text-gray-warm">No activities yet</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.activities.slice(0, 10).map(act => (
                          <div key={act.id} className="flex items-start gap-2 text-xs">
                            <svg className="w-4 h-4 text-gray-warm flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={ACTIVITY_TYPE_ICONS[act.type] || ACTIVITY_TYPE_ICONS.note} />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-charcoal font-medium truncate">{act.subject}</p>
                              {act.outcome && <p className="text-gray-warm truncate">{act.outcome}</p>}
                            </div>
                            <span className="text-gray-warm flex-shrink-0">{timeAgo(act.occurred_at)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="border-t border-gray-light pt-4">
                    {confirmDelete ? (
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-red-soft flex-1">Delete this contact?</p>
                        <button onClick={() => setConfirmDelete(false)} className="text-xs text-charcoal hover:underline">Cancel</button>
                        <button onClick={() => onDelete(contactId)} className="text-xs text-white bg-red-soft px-3 py-1 rounded-lg hover:bg-red-soft/90">Delete</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="text-xs text-red-soft hover:underline"
                      >
                        Delete contact
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-warm text-center py-8">Contact not found</p>
          )}
        </div>
      </div>
    </>
  )
}
