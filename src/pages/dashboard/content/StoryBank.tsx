import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api'
import SEO from '../../../components/SEO'

interface Story {
  id: string
  category: string
  raw_note: string
  hook_draft: string | null
  dollar_connection: string | null
  slay_outline: { S?: string; L?: string; A?: string; Y?: string } | null
  used_in_post: boolean
  used_in_post_id: string | null
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  'Founder Journey',
  'Operational Observation',
  'Client Pattern',
  'Industry Data',
  'Personal Lesson',
  'Surprising Finding',
]

const CATEGORY_COLORS: Record<string, string> = {
  'Founder Journey': 'bg-[#005454]/10 text-[#005454] border-[#005454]/20',
  'Operational Observation': 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/30',
  'Client Pattern': 'bg-[#66151C]/10 text-[#66151C] border-[#66151C]/20',
  'Industry Data': 'bg-blue-100 text-blue-800 border-blue-200',
  'Personal Lesson': 'bg-purple-100 text-purple-800 border-purple-200',
  'Surprising Finding': 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

const EMPTY_FORM = {
  category: '',
  raw_note: '',
  hook_draft: '',
  dollar_connection: '',
  slay_s: '',
  slay_l: '',
  slay_a: '',
  slay_y: '',
  used_in_post: false,
}

export default function StoryBank() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [filterUsed, setFilterUsed] = useState<'' | 'used' | 'unused'>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchStories = async () => {
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set('category', filterCategory)
      if (filterUsed === 'used') params.set('used_in_post', 'true')
      if (filterUsed === 'unused') params.set('used_in_post', 'false')
      const qs = params.toString()
      const data = await apiGet<Story[]>(`/api/story-bank${qs ? `?${qs}` : ''}`)
      setStories(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStories() }, [filterCategory, filterUsed])

  const openAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (s: Story) => {
    setEditingId(s.id)
    setForm({
      category: s.category,
      raw_note: s.raw_note,
      hook_draft: s.hook_draft || '',
      dollar_connection: s.dollar_connection || '',
      slay_s: s.slay_outline?.S || '',
      slay_l: s.slay_outline?.L || '',
      slay_a: s.slay_outline?.A || '',
      slay_y: s.slay_outline?.Y || '',
      used_in_post: s.used_in_post,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.category || !form.raw_note) return
    setSaving(true)
    try {
      const slay_outline = (form.slay_s || form.slay_l || form.slay_a || form.slay_y)
        ? { S: form.slay_s, L: form.slay_l, A: form.slay_a, Y: form.slay_y }
        : undefined
      const payload: Record<string, unknown> = {
        category: form.category,
        raw_note: form.raw_note,
        hook_draft: form.hook_draft || undefined,
        dollar_connection: form.dollar_connection || undefined,
        slay_outline,
        used_in_post: form.used_in_post,
      }
      if (editingId) {
        await apiPut(`/api/story-bank/${editingId}`, payload)
      } else {
        await apiPost('/api/story-bank', payload)
      }
      setModalOpen(false)
      fetchStories()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/story-bank/${id}`)
      setDeleteConfirm(null)
      fetchStories()
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <SEO title="Story Bank | BaxterLabs Advisory — Dashboard" description="Capture and organize stories for content creation." />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-[#66151C]">Story Bank</h1>
        <button
          onClick={openAdd}
          className="bg-[#005454] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#005454]/90 transition-colors"
        >
          + Add Story
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {(['', 'unused', 'used'] as const).map(val => (
            <button
              key={val}
              onClick={() => setFilterUsed(val)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                filterUsed === val
                  ? 'bg-[#005454] text-white'
                  : 'bg-white text-[#2D3436] hover:bg-gray-50'
              }`}
            >
              {val === '' ? 'All' : val === 'used' ? 'Used' : 'Unused'}
            </button>
          ))}
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="text-center py-12 text-[#2D3436]/60">Loading stories...</div>
      ) : stories.length === 0 ? (
        <div className="text-center py-12 text-[#2D3436]/60">No stories found. Add your first story to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {stories.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[s.category] || 'bg-gray-100 text-gray-800'}`}>
                  {s.category}
                </span>
                {s.used_in_post && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Used</span>
                )}
              </div>

              {s.hook_draft && (
                <p className="font-display text-base font-semibold text-[#2D3436] leading-snug">{s.hook_draft}</p>
              )}

              <div
                className={`text-sm text-[#2D3436]/80 leading-relaxed ${expandedNote !== s.id ? 'line-clamp-3' : ''} cursor-pointer`}
                onClick={() => setExpandedNote(expandedNote === s.id ? null : s.id)}
              >
                {s.raw_note}
              </div>

              {s.dollar_connection && (
                <p className="text-sm text-[#005454] font-medium leading-relaxed border-l-2 border-[#005454]/30 pl-3">
                  {s.dollar_connection}
                </p>
              )}

              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
                <button
                  onClick={() => openEdit(s)}
                  className="text-xs font-medium text-[#005454] hover:text-[#005454]/80 px-2 py-1 rounded hover:bg-[#005454]/5 transition-colors"
                >
                  Edit
                </button>
                {deleteConfirm === s.id ? (
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-[#2D3436]/60">Delete?</span>
                    <button onClick={() => handleDelete(s.id)} className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1">Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-xs font-medium text-[#2D3436]/60 hover:text-[#2D3436] px-2 py-1">No</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(s.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors ml-auto"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="font-display text-xl font-bold text-[#66151C] mb-5">
                {editingId ? 'Edit Story' : 'Add Story'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1">Raw Note *</label>
                  <textarea
                    value={form.raw_note}
                    onChange={e => setForm(f => ({ ...f, raw_note: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1">Hook Draft</label>
                  <input
                    value={form.hook_draft}
                    onChange={e => setForm(f => ({ ...f, hook_draft: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1">Dollar Connection</label>
                  <input
                    value={form.dollar_connection}
                    onChange={e => setForm(f => ({ ...f, dollar_connection: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-2">SLAY Outline</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['S', 'L', 'A', 'Y'] as const).map(letter => (
                      <div key={letter}>
                        <label className="block text-xs font-semibold text-[#005454] mb-0.5">{letter}</label>
                        <input
                          value={form[`slay_${letter.toLowerCase()}` as keyof typeof form] as string}
                          onChange={e => setForm(f => ({ ...f, [`slay_${letter.toLowerCase()}`]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.used_in_post}
                    onChange={e => setForm(f => ({ ...f, used_in_post: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-[#2D3436]">Mark as Used</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[#2D3436]/60 hover:text-[#2D3436] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.category || !form.raw_note}
                  className="bg-[#005454] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#005454]/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add Story'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
