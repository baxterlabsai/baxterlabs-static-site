import { useEffect, useState } from 'react'
import { apiGet, apiPatch } from '../../../lib/api'
import MarkdownContent from '../../../components/MarkdownContent'

interface ImageCandidate {
  imageUrl: string
  thumbnailUrl: string
  title: string
  origin: string
  contentUrl: string
}

interface Post {
  id: string
  type: string
  title: string | null
  body: string | null
  status: string
  source_type: string | null
  source_id: string | null
  scheduled_date: string | null
  published_date: string | null
  featured_image_url: string | null
  image_candidates: ImageCandidate[] | null
  created_at: string
}

const STATUS_TABS = ['all', 'draft', 'approved', 'scheduled', 'published'] as const

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  approved: '#378ADD',
  scheduled: '#BA7517',
  published: '#639922',
  archived: '#9CA3AF',
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [patching, setPatching] = useState(false)

  useEffect(() => {
    apiGet<Post[]>('/api/content/posts')
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeTab === 'all'
    ? posts
    : posts.filter(p => p.status === activeTab)

  const selected = posts.find(p => p.id === selectedId) ?? null

  async function patchStatus(id: string, body: Record<string, string | null>) {
    setPatching(true)
    try {
      const updated = await apiPatch<Post>(`/api/content/posts/${id}`, body)
      setPosts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    } catch { /* ignore */ }
    setPatching(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal font-display">Posts</h1>
          <p className="text-sm text-charcoal/60 mt-1">Review, approve, and schedule content posts</p>
        </div>
      </div>

      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 220px)' }}>
        {/* Left column — post list (65%) */}
        <div className="w-[65%] flex flex-col min-w-0">
          {/* Status tabs */}
          <div className="flex gap-1 mb-4 bg-white rounded-lg p-1 border border-gray-200">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-teal text-white'
                    : 'text-charcoal/60 hover:text-charcoal hover:bg-ivory'
                }`}
              >
                {tab}
                {tab !== 'all' && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    {posts.filter(p => p.status === tab).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* New draft hint */}
          <div className="mb-4 bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-xs text-charcoal/50 mb-1.5 font-medium">Create a new draft</p>
            <code className="text-xs bg-charcoal/5 text-charcoal/80 px-2 py-1 rounded font-mono">
              /baxterlabs-content:content-draft &lt;topic or UUID&gt;
            </code>
          </div>

          {/* Post list */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-charcoal/40 text-sm">No posts match this filter.</p>
              </div>
            ) : (
              filtered.map(post => (
                <button
                  key={post.id}
                  onClick={() => setSelectedId(post.id)}
                  className={`w-full text-left bg-white rounded-lg border p-4 transition-colors ${
                    selectedId === post.id
                      ? 'border-teal ring-1 ring-teal/30'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: STATUS_COLORS[post.status] || '#6B7280' }}
                    >
                      {post.status}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-charcoal/8 text-charcoal/60">
                      {post.type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-charcoal truncate">
                    {post.title || '(untitled)'}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-charcoal/40">
                    <span>{(post.body || '').length} chars</span>
                    <span>{timeAgo(post.created_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right column — detail panel (35%) */}
        <div className="w-[35%] min-w-0">
          <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-0">
            {!selected ? (
              <div className="py-16 text-center">
                <svg className="w-10 h-10 mx-auto text-charcoal/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm text-charcoal/40">Select a post to review</p>
              </div>
            ) : (
              <div>
                {/* Status badge + type */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: STATUS_COLORS[selected.status] || '#6B7280' }}
                  >
                    {selected.status}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-charcoal/8 text-charcoal/60">
                    {selected.type}
                  </span>
                </div>

                {/* Title */}
                {selected.title && (
                  <h2 className="text-lg font-bold text-charcoal mb-3 font-display">{selected.title}</h2>
                )}

                {/* Source info */}
                {(selected.source_type || selected.source_id) && (
                  <div className="text-xs text-charcoal/50 mb-3 space-y-0.5">
                    {selected.source_type && <p>Source: {selected.source_type}</p>}
                    {selected.source_id && <p className="font-mono text-[10px]">ID: {selected.source_id}</p>}
                  </div>
                )}

                {/* Body as markdown */}
                <div className="border-t border-gray-100 pt-3 mb-4 max-h-[50vh] overflow-y-auto">
                  {selected.body ? (
                    <MarkdownContent content={selected.body} className="text-sm" />
                  ) : (
                    <p className="text-sm text-charcoal/30 italic">No body content</p>
                  )}
                </div>

                {/* Scheduled date display */}
                {selected.status === 'scheduled' && selected.scheduled_date && (
                  <p className="text-xs text-charcoal/50 mb-3">
                    Scheduled: {new Date(selected.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}

                {/* Image candidates */}
                {selected.image_candidates && selected.image_candidates.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-charcoal/60 mb-2">Image candidates</p>
                    <div className="flex gap-2">
                      {selected.image_candidates.slice(0, 3).map(img => (
                        <button
                          key={img.imageUrl}
                          onClick={() => {
                            setPosts(prev => prev.map(p => p.id === selected.id ? { ...p, featured_image_url: img.imageUrl } : p))
                            patchStatus(selected.id, { featured_image_url: img.imageUrl })
                          }}
                          className={`flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                            selected.featured_image_url === img.imageUrl
                              ? 'ring-2 ring-teal ring-offset-1'
                              : 'ring-1 ring-gray-200 hover:ring-gray-300'
                          }`}
                        >
                          <img
                            src={img.thumbnailUrl}
                            alt={img.title}
                            className="w-[120px] h-auto object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : selected.featured_image_url ? (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-charcoal/60 mb-2">Image candidates</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-charcoal/50 font-mono truncate flex-1">{selected.featured_image_url}</p>
                      <button
                        onClick={() => {
                          setPosts(prev => prev.map(p => p.id === selected.id ? { ...p, featured_image_url: null } : p))
                          patchStatus(selected.id, { featured_image_url: null })
                        }}
                        className="text-[10px] font-medium text-red-soft hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Action buttons */}
                <div className="border-t border-gray-100 pt-3">
                  {selected.status === 'draft' && (
                    <button
                      disabled={patching}
                      onClick={() => patchStatus(selected.id, { status: 'approved' })}
                      className="w-full py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#378ADD' }}
                    >
                      {patching ? 'Updating…' : 'Approve'}
                    </button>
                  )}

                  {selected.status === 'approved' && (
                    <div className="space-y-2">
                      <input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-charcoal"
                      />
                      <button
                        disabled={patching || !scheduleDate}
                        onClick={() => patchStatus(selected.id, {
                          status: 'scheduled',
                          scheduled_date: new Date(scheduleDate).toISOString(),
                        })}
                        className="w-full py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#BA7517' }}
                      >
                        {patching ? 'Updating…' : 'Schedule'}
                      </button>
                    </div>
                  )}

                  {selected.status === 'scheduled' && (
                    <button
                      disabled={patching}
                      onClick={() => patchStatus(selected.id, { status: 'published' })}
                      className="w-full py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#639922' }}
                    >
                      {patching ? 'Updating…' : 'Mark published'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
