import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Company {
  id: string
  name: string
  website: string | null
  industry: string | null
  revenue_range: string | null
  employee_count: string | null
  location: string | null
  notes: string | null
  source: string | null
  company_type: string | null
  enrichment_data: Record<string, any> | null
  created_at: string
  updated_at: string
}

interface Contact {
  id: string
  name: string
  title: string | null
  email: string | null
  phone: string | null
  is_decision_maker: boolean
}

interface Opportunity {
  id: string
  title: string
  stage: string
  estimated_value: number | null
  created_at: string
}

interface Activity {
  id: string
  type: string
  subject: string
  body: string | null
  occurred_at: string
  outcome: string | null
  contact_id: string | null
  plugin_source: string | null
  pipeline_contacts: { id: string; name: string; email?: string } | null
  pipeline_companies: { id: string; name: string } | null
  pipeline_opportunities: { id: string; title: string } | null
}

interface CompanyDetail extends Company {
  contacts: Contact[]
  opportunities: Opportunity[]
  activities: Activity[]
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
  partner_identified: 'bg-teal/10 text-teal',
  partner_researched: 'bg-teal/20 text-teal',
  partner_outreach: 'bg-gold/10 text-charcoal',
  relationship_building: 'bg-gold/20 text-charcoal',
  active_referrer: 'bg-green/10 text-green',
  partner_dormant: 'bg-gray-light/50 text-charcoal',
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
  partner_identified: 'Identified',
  partner_researched: 'Researched',
  partner_outreach: 'Outreach',
  relationship_building: 'Relationship',
  active_referrer: 'Active Referrer',
  partner_dormant: 'Dormant',
}

const COMPANY_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  partner: { label: 'Partner', color: 'bg-teal/15 text-teal' },
  connector: { label: 'Connector', color: 'bg-gold/15 text-charcoal' },
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

const SOURCE_COLORS: Record<string, string> = {
  referral: 'bg-green/10 text-green',
  website: 'bg-teal/10 text-teal',
  linkedin: 'bg-blue-100 text-blue-800',
  conference: 'bg-gold/20 text-charcoal',
  cold_outreach: 'bg-gray-light text-charcoal',
  inbound: 'bg-crimson/10 text-crimson',
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

export default function PipelineCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'prospect' | 'partner' | 'connector'>('all')

  useEffect(() => {
    apiGet<{ companies: Company[] }>('/api/pipeline/companies')
      .then(data => setCompanies(data.companies))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const typeFiltered = typeFilter === 'all'
    ? companies
    : companies.filter(c => (c.company_type || 'prospect') === typeFilter)

  const filtered = search
    ? typeFiltered.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.industry || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.location || '').toLowerCase().includes(search.toLowerCase())
      )
    : typeFiltered

  async function handleAdd(data: Record<string, unknown>) {
    try {
      const result = await apiPost<Company>('/api/pipeline/companies', data)
      setCompanies(prev => [result, ...prev])
      setShowAddModal(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create company')
    }
  }

  async function handleUpdate(id: string, data: Record<string, unknown>) {
    try {
      const result = await apiPut<Company>(`/api/pipeline/companies/${id}`, data)
      setCompanies(prev => prev.map(c => c.id === id ? result : c))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update company')
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiDelete(`/api/pipeline/companies/${id}`)
      setCompanies(prev => prev.filter(c => c.id !== id))
      setDetailId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete company')
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
          <h1 className="font-display text-2xl font-bold text-charcoal">Companies</h1>
          <p className="text-gray-warm text-sm mt-1">{filtered.length} {typeFilter === 'all' ? '' : typeFilter + ' '}companies</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="px-3 py-2 rounded-lg border border-gray-light bg-white text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30"
          >
            <option value="all">All Types</option>
            <option value="prospect">Prospects</option>
            <option value="partner">Partners</option>
            <option value="connector">Connectors</option>
          </select>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-warm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search companies..."
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
            Add Company
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
          <p className="text-lg font-semibold text-charcoal mb-1">
            {search ? 'No companies match your search' : 'No companies yet'}
          </p>
          <p className="text-gray-warm text-sm mb-4">
            {search ? 'Try a different search term.' : 'Add your first prospect company to get started.'}
          </p>
          {!search && (
            <button
              onClick={() => setShowAddModal(true)}
              className="text-teal text-sm font-semibold hover:underline"
            >
              Add Company
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-light bg-ivory/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider hidden md:table-cell">Industry</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider hidden lg:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider hidden sm:table-cell">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider hidden xl:table-cell">Revenue</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-warm uppercase tracking-wider">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-light">
                {filtered.map(company => (
                  <tr
                    key={company.id}
                    onClick={() => setDetailId(company.id)}
                    className="hover:bg-ivory/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-charcoal">{company.name}</p>
                        {company.company_type && company.company_type !== 'prospect' && COMPANY_TYPE_BADGE[company.company_type] && (
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${COMPANY_TYPE_BADGE[company.company_type].color}`}>
                            {COMPANY_TYPE_BADGE[company.company_type].label}
                          </span>
                        )}
                      </div>
                      {company.website && (
                        <p className="text-xs text-gray-warm truncate max-w-[200px]">{company.website.replace(/^https?:\/\//, '')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal hidden md:table-cell">{company.industry || '—'}</td>
                    <td className="px-4 py-3 text-sm text-charcoal hidden lg:table-cell">{company.location || '—'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {company.source ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[company.source] || 'bg-gray-light text-charcoal'}`}>
                          {company.source.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-warm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-charcoal hidden xl:table-cell">{company.revenue_range || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-warm">{timeAgo(company.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddCompanyModal
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Detail Slide-Over */}
      {detailId && (
        <CompanySlideOver
          companyId={detailId}
          onClose={() => setDetailId(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Company Modal
// ---------------------------------------------------------------------------

function AddCompanyModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: Record<string, unknown>) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [revenueRange, setRevenueRange] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [location, setLocation] = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')
  const [companyType, setCompanyType] = useState('prospect')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const data: Record<string, unknown> = { name, company_type: companyType }
    if (website) data.website = website
    if (industry) data.industry = industry
    if (revenueRange) data.revenue_range = revenueRange
    if (employeeCount) data.employee_count = employeeCount
    if (location) data.location = location
    if (source) data.source = source
    if (notes) data.notes = notes
    await onSubmit(data)
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <h2 className="font-display text-xl font-bold text-charcoal">Add Company</h2>
          <button onClick={onClose} className="text-charcoal/50 hover:text-charcoal">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="border-b border-gray-light" />
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Company Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Acme Corp"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Company Type</label>
            <select
              value={companyType}
              onChange={e => setCompanyType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              <option value="prospect">Prospect</option>
              <option value="partner">Partner</option>
              <option value="connector">Connector</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Website <span className="text-gray-warm font-normal">(Recommended)</span></label>
            <input
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Industry *</label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              >
                <option value="">Select industry...</option>
                <option value="Accounting & Finance">Accounting & Finance</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Automotive">Automotive</option>
                <option value="Construction">Construction</option>
                <option value="Consulting">Consulting</option>
                <option value="E-Commerce">E-Commerce</option>
                <option value="Education">Education</option>
                <option value="Energy & Utilities">Energy & Utilities</option>
                <option value="Engineering">Engineering</option>
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Insurance">Insurance</option>
                <option value="Legal">Legal</option>
                <option value="Logistics & Transportation">Logistics & Transportation</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Marketing & Advertising">Marketing & Advertising</option>
                <option value="Oil & Gas">Oil & Gas</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Retail">Retail</option>
                <option value="SaaS / Technology">SaaS / Technology</option>
                <option value="Staffing & HR">Staffing & HR</option>
                <option value="Wholesale & Distribution">Wholesale & Distribution</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g., Austin, TX"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Revenue Range</label>
              <select
                value={revenueRange}
                onChange={e => setRevenueRange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              >
                <option value="">Select range...</option>
                <option value="Under $1M">Under $1M</option>
                <option value="$1M-$5M">$1M-$5M</option>
                <option value="$5M-$10M">$5M-$10M</option>
                <option value="$10M-$25M">$10M-$25M</option>
                <option value="$25M-$50M">$25M-$50M</option>
                <option value="$50M-$100M">$50M-$100M</option>
                <option value="$100M+">$100M+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1.5">Employees</label>
              <select
                value={employeeCount}
                onChange={e => setEmployeeCount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              >
                <option value="">Select size...</option>
                <option value="1-10">1-10</option>
                <option value="11-25">11-25</option>
                <option value="26-50">26-50</option>
                <option value="51-100">51-100</option>
                <option value="101-250">101-250</option>
                <option value="251-500">251-500</option>
                <option value="500+">500+</option>
              </select>
            </div>
          </div>
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
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Any initial notes about the company..."
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
              ) : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick Actions (clipboard copy buttons)
// ---------------------------------------------------------------------------

function QuickActions({ detail }: { detail: CompanyDetail }) {
  const [toast, setToast] = useState('')

  const primaryContact = detail.contacts.find(c => c.is_decision_maker) || detail.contacts[0]
  const contactName = primaryContact?.name
  const isPartner = (detail.company_type || 'prospect') === 'partner'

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
    setToast(`Copied: ${text.slice(0, 40)}${text.length > 40 ? '...' : ''}`)
    setTimeout(() => setToast(''), 2000)
  }

  const actions = [
    {
      label: 'Research',
      text: `/baxterlabs-advisory:sales-research ${detail.name}`,
      icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
      color: 'border-gray-light hover:border-teal hover:bg-teal/5',
    },
    {
      label: 'Draft Outreach',
      text: contactName ? `/baxterlabs-advisory:sales-outreach Draft outreach to ${contactName} at ${detail.name}` : `/baxterlabs-advisory:sales-outreach Draft outreach to ${detail.name}`,
      icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
      color: 'border-gray-light hover:border-teal hover:bg-teal/5',
    },
    {
      label: 'Call Prep',
      text: `/baxterlabs-advisory:sales-call-prep Prep me for my call with ${detail.name}`,
      icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
      color: 'border-gray-light hover:border-teal hover:bg-teal/5',
    },
    {
      label: 'Enrich',
      text: `/baxterlabs-advisory:sales-enrichment Enrich ${detail.name}`,
      icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z',
      color: 'border-gray-light hover:border-teal hover:bg-teal/5',
    },
  ]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => copyToClipboard(a.text)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium text-charcoal transition-colors ${a.color}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
            </svg>
            {a.label}
          </button>
        ))}
        {isPartner && (
          <button
            onClick={() => copyToClipboard(
              contactName
                ? `/baxterlabs-advisory:sales-outreach Draft partnership outreach to ${contactName} at ${detail.name}`
                : `/baxterlabs-advisory:sales-outreach Draft partnership outreach to ${detail.name}`
            )}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal/30 text-xs font-medium text-teal bg-teal/5 hover:bg-teal/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Draft Partnership Message
          </button>
        )}
      </div>
      {toast && (
        <p className="text-xs text-teal font-medium animate-pulse">{toast}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Log Plugin Activity Inline Form
// ---------------------------------------------------------------------------

const PLUGIN_OPTIONS = [
  { group: 'Sales Plugin', label: 'Account Research', type: 'plugin_research', source: 'sales_plugin_account_research' },
  { group: 'Sales Plugin', label: 'Draft Outreach', type: 'plugin_outreach_draft', source: 'sales_plugin_draft_outreach' },
  { group: 'Sales Plugin', label: 'Call Prep', type: 'plugin_call_prep', source: 'sales_plugin_call_prep' },
  { group: 'Sales Plugin', label: 'Competitive Intel', type: 'plugin_research', source: 'sales_plugin_competitive_intel' },
  { group: 'Marketing Plugin', label: 'Content Creation', type: 'plugin_content', source: 'marketing_plugin_content_creation' },
  { group: 'Marketing Plugin', label: 'Campaign Planning', type: 'note', source: 'marketing_plugin_campaign_planning' },
  { group: 'Enrichment', label: 'Apollo Enrichment', type: 'plugin_enrichment', source: 'apollo_enrichment' },
  { group: 'Advisory', label: 'Phase Execution', type: 'note', source: 'advisory_phase_execution' },
  { group: 'Other', label: 'Other Plugin Activity', type: 'note', source: 'other_plugin_activity' },
]

const PLUGIN_GROUPS = [...new Set(PLUGIN_OPTIONS.map(o => o.group))]

function LogPluginActivityForm({
  companyId,
  companyName,
  onSaved,
  onCancel,
}: {
  companyId: string
  companyName: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [notes, setNotes] = useState('')
  const [nextStep, setNextStep] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const opt = PLUGIN_OPTIONS[selectedIdx]
    setSaving(true)
    setError('')
    try {
      await apiPost('/api/pipeline/activities', {
        type: opt.type,
        plugin_source: opt.source,
        subject: `${opt.group}: ${opt.label} — ${companyName}`,
        body: notes || undefined,
        next_action: nextStep || undefined,
        company_id: companyId,
        occurred_at: new Date().toISOString(),
      })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
          <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          Log Plugin Activity
        </h5>
        <button onClick={onCancel} className="text-charcoal/50 hover:text-charcoal">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && <p className="text-xs text-red-soft">{error}</p>}

      <div>
        <label className="block text-xs font-semibold text-charcoal mb-1">Plugin Type</label>
        <select
          value={selectedIdx}
          onChange={e => setSelectedIdx(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
        >
          {PLUGIN_GROUPS.map(group => (
            <optgroup key={group} label={group}>
              {PLUGIN_OPTIONS.map((opt, i) =>
                opt.group === group ? (
                  <option key={i} value={i}>{opt.label}</option>
                ) : null
              )}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-charcoal mb-1">Key Findings / Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="What did the plugin produce?"
          className="w-full px-3 py-2 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-charcoal mb-1">Next Step <span className="text-gray-warm font-normal">(optional)</span></label>
        <input
          type="text"
          value={nextStep}
          onChange={e => setNextStep(e.target.value)}
          placeholder="e.g., Send outreach email"
          className="w-full px-3 py-2 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
              Saving...
            </span>
          ) : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Research & Intelligence Collapsible Section
// ---------------------------------------------------------------------------

function ResearchIntelSection({ enrichmentData }: { enrichmentData: Record<string, any> }) {
  const [open, setOpen] = useState(false)
  const research = enrichmentData?.research
  const enrichment = enrichmentData?.enrichment

  return (
    <div className="border border-purple-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span className="text-sm font-semibold text-purple-800">Research & Intelligence</span>
          <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-200 text-purple-800">
            {[research && 'Research', enrichment && 'Enrichment'].filter(Boolean).join(' + ')}
          </span>
        </div>
        <svg className={`w-4 h-4 text-purple-600 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-4 bg-white">
          {/* Research results */}
          {research && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h5 className="text-xs font-semibold text-charcoal uppercase tracking-wider">Research</h5>
                <div className="flex items-center gap-2 text-[10px] text-gray-warm">
                  {research.source && <span>Source: {research.source}</span>}
                  {research.timestamp && <span>{new Date(research.timestamp).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="bg-ivory/50 border border-gray-light rounded p-3 max-h-60 overflow-y-auto">
                <p className="text-xs text-charcoal whitespace-pre-wrap">{research.content || JSON.stringify(research, null, 2)}</p>
              </div>
            </div>
          )}

          {/* Enrichment data */}
          {enrichment?.data && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h5 className="text-xs font-semibold text-charcoal uppercase tracking-wider">Enrichment</h5>
                {enrichment.timestamp && (
                  <span className="text-[10px] text-gray-warm">{new Date(enrichment.timestamp).toLocaleDateString()}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {enrichment.data.industry && (
                  <div className="bg-ivory/50 rounded px-2.5 py-1.5">
                    <p className="text-[10px] text-gray-warm">Industry</p>
                    <p className="text-xs font-medium text-charcoal">{enrichment.data.industry}</p>
                  </div>
                )}
                {enrichment.data.employee_count && (
                  <div className="bg-ivory/50 rounded px-2.5 py-1.5">
                    <p className="text-[10px] text-gray-warm">Employees</p>
                    <p className="text-xs font-medium text-charcoal">{enrichment.data.employee_count}</p>
                  </div>
                )}
                {enrichment.data.revenue_range && (
                  <div className="bg-ivory/50 rounded px-2.5 py-1.5">
                    <p className="text-[10px] text-gray-warm">Revenue</p>
                    <p className="text-xs font-medium text-charcoal">{enrichment.data.revenue_range}</p>
                  </div>
                )}
                {enrichment.data.funding && (
                  <div className="bg-ivory/50 rounded px-2.5 py-1.5">
                    <p className="text-[10px] text-gray-warm">Funding</p>
                    <p className="text-xs font-medium text-charcoal">{enrichment.data.funding}</p>
                  </div>
                )}
                {enrichment.data.hq_location && (
                  <div className="bg-ivory/50 rounded px-2.5 py-1.5">
                    <p className="text-[10px] text-gray-warm">HQ Location</p>
                    <p className="text-xs font-medium text-charcoal">{enrichment.data.hq_location}</p>
                  </div>
                )}
                {enrichment.data.tech_stack && (
                  <div className="col-span-2 bg-ivory/50 rounded px-2.5 py-1.5">
                    <p className="text-[10px] text-gray-warm">Tech Stack</p>
                    <p className="text-xs font-medium text-charcoal">{Array.isArray(enrichment.data.tech_stack) ? enrichment.data.tech_stack.join(', ') : enrichment.data.tech_stack}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Company Slide-Over Detail
// ---------------------------------------------------------------------------

function CompanySlideOver({
  companyId,
  onClose,
  onUpdate,
  onDelete,
}: {
  companyId: string
  onClose: () => void
  onUpdate: (id: string, data: Record<string, unknown>) => void
  onDelete: (id: string) => void
}) {
  const [detail, setDetail] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showLogPlugin, setShowLogPlugin] = useState(false)
  const [pluginToast, setPluginToast] = useState('')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editIndustry, setEditIndustry] = useState('')
  const [editRevenueRange, setEditRevenueRange] = useState('')
  const [editEmployeeCount, setEditEmployeeCount] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    setLoading(true)
    apiGet<CompanyDetail>(`/api/pipeline/companies/${companyId}`)
      .then(data => {
        setDetail(data)
        setEditName(data.name)
        setEditWebsite(data.website || '')
        setEditIndustry(data.industry || '')
        setEditRevenueRange(data.revenue_range || '')
        setEditEmployeeCount(data.employee_count || '')
        setEditLocation(data.location || '')
        setEditSource(data.source || '')
        setEditNotes(data.notes || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  async function handleSave() {
    if (!detail) return
    setSaving(true)
    const updates: Record<string, unknown> = {}
    if (editName !== detail.name) updates.name = editName
    if (editWebsite !== (detail.website || '')) updates.website = editWebsite || null
    if (editIndustry !== (detail.industry || '')) updates.industry = editIndustry || null
    if (editRevenueRange !== (detail.revenue_range || '')) updates.revenue_range = editRevenueRange || null
    if (editEmployeeCount !== (detail.employee_count || '')) updates.employee_count = editEmployeeCount || null
    if (editLocation !== (detail.location || '')) updates.location = editLocation || null
    if (editSource !== (detail.source || '')) updates.source = editSource || null
    if (editNotes !== (detail.notes || '')) updates.notes = editNotes || null

    if (Object.keys(updates).length > 0) {
      await onUpdate(companyId, updates)
      setDetail(prev => prev ? { ...prev, ...updates } as CompanyDetail : prev)
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
          <h2 className="font-display text-lg font-bold text-charcoal truncate">Company Detail</h2>
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
                    <label className="block text-sm font-semibold text-charcoal mb-1.5">Company Name *</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal mb-1.5">Website <span className="text-gray-warm font-normal">(Recommended)</span></label>
                    <input type="url" value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-1.5">Industry *</label>
                      <select value={editIndustry} onChange={e => setEditIndustry(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
                        <option value="">Select industry...</option>
                        <option value="Accounting & Finance">Accounting & Finance</option>
                        <option value="Agriculture">Agriculture</option>
                        <option value="Automotive">Automotive</option>
                        <option value="Construction">Construction</option>
                        <option value="Consulting">Consulting</option>
                        <option value="E-Commerce">E-Commerce</option>
                        <option value="Education">Education</option>
                        <option value="Energy & Utilities">Energy & Utilities</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Food & Beverage">Food & Beverage</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Hospitality">Hospitality</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Legal">Legal</option>
                        <option value="Logistics & Transportation">Logistics & Transportation</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Marketing & Advertising">Marketing & Advertising</option>
                        <option value="Oil & Gas">Oil & Gas</option>
                        <option value="Professional Services">Professional Services</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Retail">Retail</option>
                        <option value="SaaS / Technology">SaaS / Technology</option>
                        <option value="Staffing & HR">Staffing & HR</option>
                        <option value="Wholesale & Distribution">Wholesale & Distribution</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-1.5">Location</label>
                      <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-1.5">Revenue Range</label>
                      <select value={editRevenueRange} onChange={e => setEditRevenueRange(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
                        <option value="">Select range...</option>
                        <option value="Under $1M">Under $1M</option>
                        <option value="$1M-$5M">$1M-$5M</option>
                        <option value="$5M-$10M">$5M-$10M</option>
                        <option value="$10M-$25M">$10M-$25M</option>
                        <option value="$25M-$50M">$25M-$50M</option>
                        <option value="$50M-$100M">$50M-$100M</option>
                        <option value="$100M+">$100M+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-charcoal mb-1.5">Employees</label>
                      <select value={editEmployeeCount} onChange={e => setEditEmployeeCount(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
                        <option value="">Select size...</option>
                        <option value="1-10">1-10</option>
                        <option value="11-25">11-25</option>
                        <option value="26-50">26-50</option>
                        <option value="51-100">51-100</option>
                        <option value="101-250">101-250</option>
                        <option value="251-500">251-500</option>
                        <option value="500+">500+</option>
                      </select>
                    </div>
                  </div>
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
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-charcoal">{detail.name}</h3>
                      {detail.company_type && detail.company_type !== 'prospect' && COMPANY_TYPE_BADGE[detail.company_type] && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${COMPANY_TYPE_BADGE[detail.company_type].color}`}>
                          {COMPANY_TYPE_BADGE[detail.company_type].label}
                        </span>
                      )}
                    </div>
                    {detail.source && (
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mt-2 ${SOURCE_COLORS[detail.source] || 'bg-gray-light text-charcoal'}`}>
                        {detail.source.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <QuickActions detail={detail} />

                  {/* Fields */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">Website</p>
                      {detail.website ? (
                        <a href={detail.website} target="_blank" rel="noopener noreferrer" className="font-medium text-teal hover:underline truncate block">{detail.website.replace(/^https?:\/\//, '')}</a>
                      ) : (
                        <p className="font-medium text-charcoal">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">Industry</p>
                      <p className="font-medium text-charcoal">{detail.industry || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">Location</p>
                      <p className="font-medium text-charcoal">{detail.location || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">Revenue Range</p>
                      <p className="font-medium text-charcoal">{detail.revenue_range || '—'}</p>
                    </div>
                    <div>
                      <p className="text-gray-warm text-xs mb-0.5">Employees</p>
                      <p className="font-medium text-charcoal">{detail.employee_count || '—'}</p>
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

                  {/* Research & Intelligence */}
                  {(detail.enrichment_data?.research || detail.enrichment_data?.enrichment) && (
                    <ResearchIntelSection enrichmentData={detail.enrichment_data} />
                  )}

                  {/* Contacts */}
                  <div>
                    <h4 className="text-sm font-semibold text-charcoal mb-2">
                      Contacts ({detail.contacts.length})
                    </h4>
                    {detail.contacts.length === 0 ? (
                      <p className="text-xs text-gray-warm">No contacts linked to this company</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.contacts.map(contact => (
                          <div key={contact.id} className="flex items-center gap-3 bg-ivory/50 rounded-lg px-3 py-2">
                            <div className="w-8 h-8 rounded-full bg-teal/10 text-teal flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {contact.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-charcoal truncate">
                                {contact.name}
                                {contact.is_decision_maker && (
                                  <span className="ml-1.5 text-xs text-gold font-semibold">DM</span>
                                )}
                              </p>
                              {contact.title && <p className="text-xs text-gray-warm truncate">{contact.title}</p>}
                            </div>
                            {contact.email && (
                              <a href={`mailto:${contact.email}`} className="text-xs text-teal hover:underline flex-shrink-0">{contact.email}</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Opportunities */}
                  <div>
                    <h4 className="text-sm font-semibold text-charcoal mb-2">
                      Opportunities ({detail.opportunities.length})
                    </h4>
                    {detail.opportunities.length === 0 ? (
                      <p className="text-xs text-gray-warm">No opportunities</p>
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

                  {/* Log Plugin Activity */}
                  <div>
                    {showLogPlugin ? (
                      <LogPluginActivityForm
                        companyId={companyId}
                        companyName={detail.name}
                        onSaved={() => {
                          setShowLogPlugin(false)
                          setPluginToast('Plugin activity saved')
                          setTimeout(() => setPluginToast(''), 2500)
                          apiGet<CompanyDetail>(`/api/pipeline/companies/${companyId}`).then(setDetail).catch(() => {})
                        }}
                        onCancel={() => setShowLogPlugin(false)}
                      />
                    ) : (
                      <button
                        onClick={() => setShowLogPlugin(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                        Log Plugin Activity
                      </button>
                    )}
                    {pluginToast && (
                      <p className="text-xs text-teal font-medium mt-1.5 animate-pulse">{pluginToast}</p>
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
                        {detail.activities.slice(0, 10).map(act => {
                          const isOutreach = act.type === 'outreach_draft' || act.type === 'plugin_outreach_draft'
                          const contactEmail = act.pipeline_contacts?.email || (act.outcome?.match(/email:\s*(\S+@\S+)/i)?.[1]) || null
                          return (
                            <div key={act.id} className="text-xs">
                              <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 text-gray-warm flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d={ACTIVITY_TYPE_ICONS[act.type] || ACTIVITY_TYPE_ICONS.note} />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-charcoal font-medium truncate">{act.subject}</p>
                                    {act.plugin_source && (
                                      <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 flex-shrink-0">
                                        Plugin
                                      </span>
                                    )}
                                  </div>
                                  {act.pipeline_contacts && (
                                    <p className="text-gray-warm mt-0.5">{act.pipeline_contacts.name}{act.pipeline_contacts.email && ` (${act.pipeline_contacts.email})`}</p>
                                  )}
                                  {act.outcome && <p className="text-gray-warm truncate">{act.outcome}</p>}
                                  {isOutreach && act.body && (
                                    <div className="mt-1.5 bg-ivory/50 border border-gray-light rounded p-2">
                                      {contactEmail && <p className="font-medium text-charcoal mb-1">To: {contactEmail}</p>}
                                      <p className="text-charcoal whitespace-pre-wrap line-clamp-4">{act.body}</p>
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <button onClick={() => navigator.clipboard.writeText(act.body || '')} className="text-teal hover:underline font-medium">Copy Draft</button>
                                        {contactEmail && (
                                          <>
                                            <span className="text-gray-light">|</span>
                                            <button onClick={() => navigator.clipboard.writeText(contactEmail)} className="text-teal hover:underline font-medium">Copy Email</button>
                                            <span className="text-gray-light">|</span>
                                            <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(act.subject)}&body=${encodeURIComponent(act.body || '')}`} className="text-teal hover:underline font-medium">Open in Gmail</a>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <span className="text-gray-warm flex-shrink-0">{timeAgo(act.occurred_at)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="border-t border-gray-light pt-4">
                    {confirmDelete ? (
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-red-soft flex-1">Delete this company and unlink all contacts?</p>
                        <button onClick={() => setConfirmDelete(false)} className="text-xs text-charcoal hover:underline">Cancel</button>
                        <button onClick={() => onDelete(companyId)} className="text-xs text-white bg-red-soft px-3 py-1 rounded-lg hover:bg-red-soft/90">Delete</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="text-xs text-red-soft hover:underline"
                      >
                        Delete company
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-warm text-center py-8">Company not found</p>
          )}
        </div>
      </div>
    </>
  )
}
