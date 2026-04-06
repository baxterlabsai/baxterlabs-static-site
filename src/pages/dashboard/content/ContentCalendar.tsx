import { useEffect, useState, useMemo } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api'
import { useToast } from '../../../components/Toast'
import { useRealtimeRefresh } from '../../../hooks/useRealtimeRefresh'
import SEO from '../../../components/SEO'

interface Post {
  id: string
  type: string
  title: string
  body: string | null
  status: string
  platform: string | null
  scheduled_date: string | null
  published_date: string | null
  impressions: number | null
  engagement_rate: number | null
  comments: number | null
  likes: number | null
  quality_score: number | null
  score_notes: string | null
  seo_title: string | null
  seo_description: string | null
  featured_image_url: string | null
  blog_slug: string | null
  published: boolean
  source_post_id: string | null
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/*  POST_TYPES — Added 'video_script' on 2026-04-06 handoff           */
/*  DO NOT REMOVE 'video_script' — Cowork "Video Script Prep"         */
/*  scheduled task (Tuesdays) writes content_posts rows with           */
/*  type='video_script'. Removing it hides those posts from calendar.  */
/*  Color: purple #7C3AED (distinct from blue=linkedin, green=blog).   */
/* ------------------------------------------------------------------ */
const POST_TYPES = ['linkedin', 'blog', 'video_script']
const POST_STATUSES = ['idea', 'draft', 'review', 'scheduled', 'published', 'archived']
const POST_PLATFORMS = ['linkedin', 'blog', 'both']

const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-gray-100 text-gray-700',
  draft: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-purple-100 text-purple-800',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-200 text-gray-500',
}

const TYPE_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-500',
  blog: 'bg-emerald-500',
  video_script: 'bg-purple-500',
}

const EMPTY_FORM = {
  type: 'linkedin',
  title: '',
  body: '',
  status: 'draft',
  platform: '',
  scheduled_date: '',
  published_date: '',
  impressions: '',
  engagement_rate: '',
  comments: '',
  likes: '',
  quality_score: '',
  score_notes: '',
  seo_title: '',
  seo_description: '',
  featured_image_url: '',
  blog_slug: '',
}

function engagementBadge(rate: number | null) {
  if (rate === null || rate === undefined) return null
  if (rate > 3) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[#2D6A4F]/10 text-[#2D6A4F]">{rate}%</span>
  if (rate >= 1) return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[#D4A843]/10 text-[#D4A843]">{rate}%</span>
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-[#C0392B]/10 text-[#C0392B]">{rate}%</span>
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function ContentCalendar() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailPost, setDetailPost] = useState<Post | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [statsRows, setStatsRows] = useState<Array<{ id: string; title: string; impressions: string; likes: string; comments: string }>>([])
  const [statsSaving, setStatsSaving] = useState(false)
  const { toast } = useToast()

  // Calendar state
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams()
      if (filterType) params.set('type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      const qs = params.toString()
      const data = await apiGet<Post[]>(`/api/content-posts${qs ? `?${qs}` : ''}`)
      setPosts(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPosts() }, [filterType, filterStatus])

  useRealtimeRefresh('content-calendar', fetchPosts, ['content_posts'])

  const postsByDate = useMemo(() => {
    const map: Record<string, Post[]> = {}
    posts.forEach(p => {
      const dateStr = p.scheduled_date || p.published_date
      if (dateStr) {
        const key = dateStr.slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push(p)
      }
    })
    return map
  }, [posts])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (p: Post) => {
    setEditingId(p.id)
    setForm({
      type: p.type,
      title: p.title,
      body: p.body || '',
      status: p.status,
      platform: p.platform || '',
      scheduled_date: p.scheduled_date ? p.scheduled_date.slice(0, 16) : '',
      published_date: p.published_date ? p.published_date.slice(0, 16) : '',
      impressions: p.impressions?.toString() || '',
      engagement_rate: p.engagement_rate?.toString() || '',
      comments: p.comments?.toString() || '',
      likes: p.likes?.toString() || '',
      quality_score: p.quality_score?.toString() || '',
      score_notes: p.score_notes || '',
      seo_title: p.seo_title || '',
      seo_description: p.seo_description || '',
      featured_image_url: p.featured_image_url || '',
      blog_slug: p.blog_slug || '',
    })
    setDetailPost(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.type) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        title: form.title,
        body: form.body || undefined,
        status: form.status,
        platform: form.platform || undefined,
        scheduled_date: form.scheduled_date || undefined,
        published_date: form.published_date || undefined,
        impressions: form.impressions ? parseInt(form.impressions) : undefined,
        engagement_rate: form.engagement_rate ? parseFloat(form.engagement_rate) : undefined,
        comments: form.comments ? parseInt(form.comments) : undefined,
        likes: form.likes ? parseInt(form.likes) : undefined,
        quality_score: form.quality_score ? parseInt(form.quality_score) : undefined,
        score_notes: form.score_notes || undefined,
        seo_title: form.seo_title || undefined,
        seo_description: form.seo_description || undefined,
        featured_image_url: form.featured_image_url || undefined,
        blog_slug: form.blog_slug || undefined,
      }
      if (editingId) {
        await apiPut(`/api/content-posts/${editingId}`, payload)
      } else {
        await apiPost('/api/content-posts', payload)
      }
      setModalOpen(false)
      fetchPosts()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (postId: string, newStatus: string) => {
    try {
      await apiPut(`/api/content-posts/${postId}`, { status: newStatus })
      if (detailPost && detailPost.id === postId) {
        setDetailPost({ ...detailPost, status: newStatus })
      }
      fetchPosts()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/content-posts/${id}`)
      setDeleteConfirm(null)
      setDetailPost(null)
      fetchPosts()
    } catch {
      // ignore
    }
  }

  // Calendar rendering
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfWeek(calYear, calMonth)
  const monthLabel = new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
    setSelectedDay(null)
  }

  const openStats = () => {
    const published = posts.filter(p => p.status === 'published')
    setStatsRows(published.map(p => ({
      id: p.id,
      title: p.title,
      impressions: p.impressions?.toString() || '',
      likes: p.likes?.toString() || '',
      comments: p.comments?.toString() || '',
    })))
    setStatsOpen(true)
  }

  const saveStats = async () => {
    setStatsSaving(true)
    try {
      for (const row of statsRows) {
        const impressions = row.impressions ? parseInt(row.impressions) : undefined
        const likes = row.likes ? parseInt(row.likes) : undefined
        const comments = row.comments ? parseInt(row.comments) : undefined
        await apiPut(`/api/content-posts/${row.id}`, {
          impressions,
          likes,
          comments,
        })
      }
      await apiPost('/api/content/metrics-rollup', {})
      setStatsOpen(false)
      toast('Stats updated and engagement rates recalculated', 'success')
      fetchPosts()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save stats', 'error')
    } finally {
      setStatsSaving(false)
    }
  }

  const selectedDatePosts = selectedDay
    ? postsByDate[`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`] || []
    : []

  return (
    <div>
      <SEO title="Content Calendar | BaxterLabs Advisory — Dashboard" description="Plan and schedule content across platforms." />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-[#66151C]">Content Calendar</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-[#005454] text-white' : 'bg-white text-[#2D3436] hover:bg-gray-50'}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'list' ? 'bg-[#005454] text-white' : 'bg-white text-[#2D3436] hover:bg-gray-50'}`}
            >
              List
            </button>
          </div>
          <button
            onClick={openStats}
            className="border border-[#005454] text-[#005454] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#005454]/5 transition-colors"
          >
            Update Stats
          </button>
          <button
            onClick={openCreate}
            className="bg-[#005454] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#005454]/90 transition-colors"
          >
            + New Post
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Types</option>
          {POST_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          {POST_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#2D3436]/60">Loading posts...</div>
      ) : view === 'calendar' ? (
        /* Calendar View */
        <div className="flex gap-6">
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg text-[#2D3436]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="font-display font-semibold text-[#2D3436]">{monthLabel}</span>
                <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg text-[#2D3436]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-7 text-center text-xs font-medium text-[#2D3436]/50 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="h-16" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayPosts = postsByDate[dateKey] || []
                  const isSelected = selectedDay === day
                  const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear()
                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={`h-16 p-1 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#005454]/10 ring-1 ring-[#005454]' :
                        isToday ? 'bg-[#FAF8F2]' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`text-xs font-medium ${isToday ? 'text-[#005454] font-bold' : 'text-[#2D3436]'}`}>{day}</span>
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {dayPosts.slice(0, 3).map(p => (
                          <div key={p.id} className={`w-2 h-2 rounded-full ${TYPE_COLORS[p.type] || 'bg-gray-400'}`} title={p.title} />
                        ))}
                        {dayPosts.length > 3 && <span className="text-[9px] text-[#2D3436]/50">+{dayPosts.length - 3}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-[#2D3436]/50">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> LinkedIn</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Blog</div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          {selectedDay !== null && (
            <div className="w-80 bg-white rounded-xl border border-gray-200 p-4 self-start">
              <h3 className="font-display font-semibold text-[#2D3436] mb-3">
                {new Date(calYear, calMonth, selectedDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              {selectedDatePosts.length === 0 ? (
                <p className="text-sm text-[#2D3436]/50">No posts scheduled</p>
              ) : (
                <div className="space-y-3">
                  {selectedDatePosts.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setDetailPost(p)}
                      className="p-3 rounded-lg border border-gray-100 hover:border-[#005454]/30 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[p.type]}`} />
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                      </div>
                      <p className="text-sm font-medium text-[#2D3436] line-clamp-2">{p.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAF8F2] border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-[#2D3436]">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2D3436]">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2D3436]">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2D3436]">Scheduled</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#2D3436]">Published</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#2D3436]">Impressions</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#2D3436]">Engagement</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#2D3436]">Score</th>
                </tr>
              </thead>
              <tbody>
                {posts.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-[#2D3436]/50">No posts found</td></tr>
                ) : posts.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setDetailPost(p)}
                    className="border-b border-gray-100 hover:bg-[#FAF8F2] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#2D3436] max-w-[200px] truncate">{p.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white ${TYPE_COLORS[p.type]}`}>{p.type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-[#2D3436]/70">{p.scheduled_date ? new Date(p.scheduled_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-[#2D3436]/70">{p.published_date ? new Date(p.published_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-right text-[#2D3436]/70">{p.impressions?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{engagementBadge(p.engagement_rate) ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-[#2D3436]/70">{p.quality_score ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {detailPost && !modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetailPost(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold text-white ${TYPE_COLORS[detailPost.type]}`}>{detailPost.type.replace(/_/g, ' ')}</span>
                    <select
                      value={detailPost.status}
                      onChange={e => handleStatusChange(detailPost.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[detailPost.status]}`}
                    >
                      {POST_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                  <h2 className="font-display text-xl font-bold text-[#2D3436]">{detailPost.title}</h2>
                </div>
                <button onClick={() => setDetailPost(null)} className="text-[#2D3436]/40 hover:text-[#2D3436] p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {detailPost.body && (
                <div className="bg-[#FAF8F2] rounded-lg p-4 mb-4 text-sm text-[#2D3436] whitespace-pre-wrap leading-relaxed">{detailPost.body}</div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                {detailPost.platform && <div><span className="text-[#2D3436]/50">Platform:</span> <span className="font-medium">{detailPost.platform}</span></div>}
                {detailPost.scheduled_date && <div><span className="text-[#2D3436]/50">Scheduled:</span> <span className="font-medium">{new Date(detailPost.scheduled_date).toLocaleString()}</span></div>}
                {detailPost.published_date && <div><span className="text-[#2D3436]/50">Published:</span> <span className="font-medium">{new Date(detailPost.published_date).toLocaleString()}</span></div>}
                {detailPost.blog_slug && <div><span className="text-[#2D3436]/50">Slug:</span> <span className="font-medium font-mono text-xs">{detailPost.blog_slug}</span></div>}
              </div>

              {/* Performance Data */}
              {(detailPost.impressions || detailPost.engagement_rate || detailPost.quality_score) && (
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <h3 className="text-sm font-semibold text-[#2D3436] mb-2">Performance</h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-[#FAF8F2] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-[#2D3436]">{detailPost.impressions?.toLocaleString() ?? '—'}</div>
                      <div className="text-xs text-[#2D3436]/50">Impressions</div>
                    </div>
                    <div className="bg-[#FAF8F2] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold">{engagementBadge(detailPost.engagement_rate) ?? '—'}</div>
                      <div className="text-xs text-[#2D3436]/50">Engagement</div>
                    </div>
                    <div className="bg-[#FAF8F2] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-[#2D3436]">{detailPost.likes ?? '—'}</div>
                      <div className="text-xs text-[#2D3436]/50">Likes</div>
                    </div>
                    <div className="bg-[#FAF8F2] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-[#2D3436]">{detailPost.quality_score ?? '—'}/8</div>
                      <div className="text-xs text-[#2D3436]/50">Quality</div>
                    </div>
                  </div>
                </div>
              )}

              {detailPost.score_notes && (
                <div className="text-sm text-[#2D3436]/70 mb-4"><span className="font-medium">Score Notes:</span> {detailPost.score_notes}</div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                {deleteConfirm === detailPost.id ? (
                  <div className="flex items-center gap-2 mr-auto">
                    <span className="text-sm text-[#2D3436]/60">Delete this post?</span>
                    <button onClick={() => handleDelete(detailPost.id)} className="text-sm font-medium text-red-600 hover:text-red-700 px-2 py-1">Yes</button>
                    <button onClick={() => setDeleteConfirm(null)} className="text-sm font-medium text-[#2D3436]/60 hover:text-[#2D3436] px-2 py-1">No</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(detailPost.id)} className="text-sm font-medium text-red-500 hover:text-red-600 mr-auto">Delete</button>
                )}
                <button onClick={() => openEdit(detailPost)} className="bg-[#005454] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#005454]/90 transition-colors">
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Stats Modal */}
      {statsOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setStatsOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="font-display text-xl font-bold text-[#66151C] mb-1">Update Post Performance Stats</h2>
              <p className="text-sm text-[#2D3436]/60 mb-5">Enter the latest impression and engagement data for your published posts.</p>
              {statsRows.length === 0 ? (
                <p className="text-sm text-[#2D3436]/50 text-center py-8">No published posts to update.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#FAF8F2] border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-semibold text-[#2D3436]">Post</th>
                        <th className="text-right px-3 py-2 font-semibold text-[#2D3436] w-24">Impressions</th>
                        <th className="text-right px-3 py-2 font-semibold text-[#2D3436] w-20">Likes</th>
                        <th className="text-right px-3 py-2 font-semibold text-[#2D3436] w-24">Comments</th>
                        <th className="text-right px-3 py-2 font-semibold text-[#2D3436] w-24">Eng. Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsRows.map((row, i) => {
                        const imp = parseInt(row.impressions) || 0
                        const lik = parseInt(row.likes) || 0
                        const com = parseInt(row.comments) || 0
                        const rate = imp > 0 ? ((lik + com) / imp * 100).toFixed(1) : '—'
                        return (
                          <tr key={row.id} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-[#2D3436] max-w-[200px] truncate">{row.title.length > 40 ? row.title.slice(0, 40) + '...' : row.title}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={row.impressions}
                                onChange={e => setStatsRows(prev => prev.map((r, j) => j === i ? { ...r, impressions: e.target.value } : r))}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={row.likes}
                                onChange={e => setStatsRows(prev => prev.map((r, j) => j === i ? { ...r, likes: e.target.value } : r))}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={row.comments}
                                onChange={e => setStatsRows(prev => prev.map((r, j) => j === i ? { ...r, comments: e.target.value } : r))}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className={`text-sm font-medium ${
                                rate === '—' ? 'text-[#2D3436]/50' :
                                parseFloat(rate) > 3 ? 'text-[#2D6A4F]' :
                                parseFloat(rate) >= 1 ? 'text-[#D4A843]' : 'text-[#C0392B]'
                              }`}>
                                {rate === '—' ? rate : `${rate}%`}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setStatsOpen(false)} className="px-4 py-2 text-sm font-medium text-[#2D3436]/60 hover:text-[#2D3436] transition-colors">Cancel</button>
                <button
                  onClick={saveStats}
                  disabled={statsSaving || statsRows.length === 0}
                  className="bg-[#005454] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#005454]/90 transition-colors disabled:opacity-50"
                >
                  {statsSaving ? 'Saving...' : 'Save All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="font-display text-xl font-bold text-[#66151C] mb-5">
                {editingId ? 'Edit Post' : 'New Post'}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Type *</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {POST_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      {POST_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1">Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1">Body</label>
                  <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Platform</label>
                    <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">None</option>
                      {POST_PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Blog Slug</label>
                    <input value={form.blog_slug} onChange={e => setForm(f => ({ ...f, blog_slug: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Scheduled Date</label>
                    <input type="datetime-local" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Published Date</label>
                    <input type="datetime-local" value={form.published_date} onChange={e => setForm(f => ({ ...f, published_date: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Impressions</label>
                    <input type="number" value={form.impressions} onChange={e => setForm(f => ({ ...f, impressions: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Eng. Rate %</label>
                    <input type="number" step="0.01" value={form.engagement_rate} onChange={e => setForm(f => ({ ...f, engagement_rate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Likes</label>
                    <input type="number" value={form.likes} onChange={e => setForm(f => ({ ...f, likes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#2D3436] mb-1">Quality (0-8)</label>
                    <input type="number" min="0" max="8" value={form.quality_score} onChange={e => setForm(f => ({ ...f, quality_score: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1">SEO Title</label>
                  <input value={form.seo_title} onChange={e => setForm(f => ({ ...f, seo_title: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1">SEO Description</label>
                  <textarea value={form.seo_description} onChange={e => setForm(f => ({ ...f, seo_description: e.target.value }))} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D3436] mb-1">Score Notes</label>
                  <input value={form.score_notes} onChange={e => setForm(f => ({ ...f, score_notes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[#2D3436]/60 hover:text-[#2D3436] transition-colors">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title || !form.type}
                  className="bg-[#005454] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#005454]/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
