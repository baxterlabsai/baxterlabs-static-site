import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiUpload, apiPost } from '../../../lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContactPreview {
  name: string
  title: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  lead_tier: string | null
  is_decision_maker: boolean
}

interface CompanyGroup {
  company: {
    name: string
    website: string | null
    industry: string | null
    revenue_range: string | null
    employee_count: string | null
    location: string | null
  }
  contacts: ContactPreview[]
  existing_company_id: string | null
  is_duplicate: boolean
}

interface ParseResult {
  rows_parsed: number
  companies: number
  new_companies: number
  duplicate_companies: number
  contacts: number
  warnings: string[]
  preview: CompanyGroup[]
}

interface ImportResult {
  created_companies: number
  created_contacts: number
  created_opportunities: number
  skipped_duplicates: number
  errors: string[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_LABEL: Record<string, string> = {
  tier_1: 'T1',
  tier_2: 'T2',
  tier_3: 'T3',
}

const CSV_TEMPLATE = `company_name,website,industry,revenue_range,employee_count,location,contact_name,contact_title,contact_email,contact_phone,contact_linkedin_url,lead_tier,is_decision_maker
Acme Corp,https://acme.com,Technology,$10M-$50M,50-200,New York NY,Jane Smith,VP Engineering,jane@acme.com,555-0101,,tier_1,true
Acme Corp,https://acme.com,Technology,$10M-$50M,50-200,New York NY,Bob Jones,CTO,bob@acme.com,555-0102,,tier_2,false
Beta Industries,https://beta.io,Manufacturing,$5M-$10M,20-50,Chicago IL,,,,,,
Gamma LLC,https://gamma.co,Finance,$50M+,200+,San Francisco CA,Alice Green,CFO,alice@gamma.co,,,tier_1,true`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BulkImport() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  // Step 1: Upload & Parse
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)

  // Step 2: Confirm & Import
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const [error, setError] = useState('')

  // Excluded groups (user can uncheck duplicates or unwanted rows)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setParseResult(null)
    setImportResult(null)
    setExcluded(new Set())
    setParsing(true)

    try {
      const form = new FormData()
      form.append('file', file)
      const result = await apiUpload<ParseResult>('/api/pipeline/bulk-import/parse-csv', form)
      setParseResult(result)
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV')
    } finally {
      setParsing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleImport = async () => {
    if (!parseResult) return
    setError('')
    setImporting(true)

    try {
      const groups = parseResult.preview.filter((_, i) => !excluded.has(i))
      const result = await apiPost<ImportResult>('/api/pipeline/bulk-import', { groups })
      setImportResult(result)
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const toggleExclude = (idx: number) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prospect_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const includedCount = parseResult
    ? parseResult.preview.length - excluded.size
    : 0

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-warm mb-1">
            <Link to="/dashboard/pipeline/companies" className="hover:text-teal transition-colors">
              Companies
            </Link>
            <span>/</span>
            <span className="text-charcoal font-medium">Import Prospects</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Bulk Prospect Import</h1>
          <p className="text-gray-warm text-sm mt-1">
            Upload a CSV to create companies, contacts, and opportunities in bulk.
          </p>
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

      {/* Import Complete */}
      {importResult && (
        <div className="bg-white border border-gray-light rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-charcoal">Import Complete</h2>
              <p className="text-gray-warm text-sm">Your prospects have been added to the pipeline.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-ivory rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-teal">{importResult.created_companies}</div>
              <div className="text-xs text-gray-warm">Companies</div>
            </div>
            <div className="bg-ivory rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-teal">{importResult.created_contacts}</div>
              <div className="text-xs text-gray-warm">Contacts</div>
            </div>
            <div className="bg-ivory rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-teal">{importResult.created_opportunities}</div>
              <div className="text-xs text-gray-warm">Opportunities</div>
            </div>
            <div className="bg-ivory rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-charcoal/60">{importResult.skipped_duplicates}</div>
              <div className="text-xs text-gray-warm">Duplicates Skipped</div>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <div className="bg-red-soft/5 border border-red-soft/20 rounded-lg p-3 mb-4">
              <p className="text-red-soft text-sm font-semibold mb-1">Errors ({importResult.errors.length})</p>
              {importResult.errors.map((e, i) => (
                <p key={i} className="text-red-soft/80 text-xs">{e}</p>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard/pipeline/companies')}
              className="px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 transition-colors"
            >
              View Companies
            </button>
            <button
              onClick={() => {
                setParseResult(null)
                setImportResult(null)
                setExcluded(new Set())
              }}
              className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors"
            >
              Import More
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {!importResult && !parseResult && (
        <div className="bg-white border border-gray-light rounded-lg p-6">
          <h2 className="font-display text-lg font-bold text-charcoal mb-2">Step 1: Upload CSV</h2>
          <p className="text-gray-warm text-sm mb-4">
            Upload a CSV file with prospect data. Multiple contacts per company are supported —
            just repeat the company name on each row. Rows without a <code className="bg-ivory px-1 rounded text-xs">contact_name</code> create company-only records.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <label className="flex items-center gap-2 px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {parsing ? 'Parsing...' : 'Choose CSV File'}
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={parsing}
              />
            </label>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Template
            </button>
          </div>

          <div className="bg-ivory rounded-lg p-4">
            <p className="text-xs font-semibold text-charcoal mb-2">Required columns</p>
            <code className="text-xs text-teal">company_name</code>
            <p className="text-xs font-semibold text-charcoal mt-3 mb-2">Optional columns</p>
            <div className="flex flex-wrap gap-1">
              {['website', 'industry', 'revenue_range', 'employee_count', 'location',
                'contact_name', 'contact_title', 'contact_email', 'contact_phone',
                'contact_linkedin_url', 'lead_tier', 'is_decision_maker'].map(col => (
                <code key={col} className="text-xs text-charcoal/70 bg-white px-1.5 py-0.5 rounded">{col}</code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Confirm */}
      {!importResult && parseResult && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="bg-white border border-gray-light rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-warm">Rows parsed:</span>{' '}
                <span className="font-semibold text-charcoal">{parseResult.rows_parsed}</span>
              </div>
              <div>
                <span className="text-gray-warm">Companies:</span>{' '}
                <span className="font-semibold text-charcoal">{parseResult.companies}</span>
                {parseResult.duplicate_companies > 0 && (
                  <span className="text-gold ml-1">({parseResult.duplicate_companies} existing)</span>
                )}
              </div>
              <div>
                <span className="text-gray-warm">Contacts:</span>{' '}
                <span className="font-semibold text-charcoal">{parseResult.contacts}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setParseResult(null)
                  setExcluded(new Set())
                }}
                className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors"
              >
                Re-upload
              </button>
              <button
                onClick={handleImport}
                disabled={importing || includedCount === 0}
                className="px-4 py-2 bg-crimson text-white text-sm font-semibold rounded-lg hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Importing...
                  </span>
                ) : (
                  `Import ${includedCount} ${includedCount === 1 ? 'Company' : 'Companies'}`
                )}
              </button>
            </div>
          </div>

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <div className="bg-gold/10 border border-gold/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-charcoal mb-1">Warnings</p>
              {parseResult.warnings.map((w, i) => (
                <p key={i} className="text-xs text-charcoal/70">{w}</p>
              ))}
            </div>
          )}

          {/* Preview table */}
          <div className="bg-white border border-gray-light rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-ivory border-b border-gray-light">
                    <th className="px-4 py-3 text-left font-semibold text-charcoal w-8">
                      <input
                        type="checkbox"
                        checked={excluded.size === 0}
                        onChange={() => {
                          if (excluded.size === 0) {
                            setExcluded(new Set(parseResult.preview.map((_, i) => i)))
                          } else {
                            setExcluded(new Set())
                          }
                        }}
                        className="rounded border-gray-light"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-charcoal">Company</th>
                    <th className="px-4 py-3 text-left font-semibold text-charcoal">Details</th>
                    <th className="px-4 py-3 text-left font-semibold text-charcoal">Contacts</th>
                    <th className="px-4 py-3 text-left font-semibold text-charcoal w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-light">
                  {parseResult.preview.map((group, idx) => (
                    <tr
                      key={idx}
                      className={`${excluded.has(idx) ? 'opacity-40 bg-gray-light/20' : 'hover:bg-ivory/50'} transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={!excluded.has(idx)}
                          onChange={() => toggleExclude(idx)}
                          className="rounded border-gray-light"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-charcoal">{group.company.name}</div>
                        {group.company.website && (
                          <div className="text-xs text-gray-warm">{group.company.website}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-charcoal/70">
                        {[group.company.industry, group.company.location, group.company.revenue_range]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {group.contacts.length === 0 ? (
                          <span className="text-xs text-gray-warm italic">No contacts</span>
                        ) : (
                          <div className="space-y-1">
                            {group.contacts.map((c, ci) => (
                              <div key={ci} className="text-xs">
                                <span className="font-medium text-charcoal">{c.name}</span>
                                {c.title && <span className="text-gray-warm ml-1">({c.title})</span>}
                                {c.lead_tier && (
                                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gold/10 text-charcoal">
                                    {TIER_LABEL[c.lead_tier] || c.lead_tier}
                                  </span>
                                )}
                                {c.is_decision_maker && (
                                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-crimson/10 text-crimson">
                                    DM
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {group.is_duplicate ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-gold/10 text-gold">
                            Existing
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-teal/10 text-teal">
                            New
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
