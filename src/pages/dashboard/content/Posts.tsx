import { useEffect, useState, useRef, useCallback } from 'react'
import { apiGet, apiPatch, apiPost } from '../../../lib/api'
import { useRealtimeRefresh } from '../../../hooks/useRealtimeRefresh'
import MarkdownContent from '../../../components/MarkdownContent'

interface QueueItem {
  source_type: string
  source_id: string
  title: string
  subtitle: string | null
  created_at: string
}

interface UnsplashResult {
  id: string
  url: string
  thumb: string
  description: string | null
  photographer: string
  photographer_url: string
  download_url: string
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
  const [imageQuery, setImageQuery] = useState('')
  const [imageResults, setImageResults] = useState<UnsplashResult[]>([])
  const [imageSearching, setImageSearching] = useState(false)
  const imageSuggestFired = useRef<string | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [dismissingDraftId, setDismissingDraftId] = useState<string | null>(null)

  const reloadQueue = useCallback(() => {
    apiGet<QueueItem[]>('/api/content/queue')
      .then(setQueue)
      .catch(() => {})
  }, [])

  useEffect(() => { reloadQueue() }, [reloadQueue])

  useRealtimeRefresh('content-queue', reloadQueue, ['content_news', 'story_bank', 'content_posts'])

  async function copyCommand(sourceType: string, sourceId: string) {
    const skill = (sourceType === 'news' || sourceType === 'content_news')
      ? 'news-commentary'
      : 'content-draft'
    await navigator.clipboard.writeText(`/baxterlabs-content:${skill} ${sourceId}`)
    setCopiedId(sourceId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function dismissQueueItem(sourceType: string, sourceId: string) {
    await apiPatch('/api/content/queue/dismiss', { source_type: sourceType, source_id: sourceId })
    setDismissingId(null)
  }

  const reload = useCallback(() => {
    apiGet<Post[]>('/api/content/posts')
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  useRealtimeRefresh('content-posts', reload, ['content_posts'])

  const filtered = activeTab === 'all'
    ? posts.filter(p => p.status !== 'archived')
    : posts.filter(p => p.status === activeTab)

  const selected = posts.find(p => p.id === selectedId) ?? null

  function handleSelectPost(id: string) {
    setSelectedId(id)
    setImageResults([])
    setImageQuery('')
    imageSuggestFired.current = null
  }

  // AI-powered image search suggestion when post is selected
  useEffect(() => {
    if (!selected || !selected.title || !selected.body) return
    if (imageSuggestFired.current === selected.id) return
    imageSuggestFired.current = selected.id
    apiPost<{ query: string }>('/api/content/suggest-image-query', {
      title: selected.title,
      body: selected.body.slice(0, 150),
    }).then(data => {
      if (data.query) {
        setImageQuery(data.query)
        setImageSearching(true)
        apiGet<{ results: UnsplashResult[]; total: number }>(
          `/api/content/image-search?q=${encodeURIComponent(data.query)}&limit=3`
        ).then(r => setImageResults(r.results)).catch(() => {}).finally(() => setImageSearching(false))
      }
    }).catch(() => {
      // Fallback to simple heuristic if AI fails
      if (!selected) return
      const fallback = selected.source_type === 'story_bank' ? 'professional services office'
        : (selected.source_type === 'news' || selected.source_type === 'content_news') ? 'business finance'
        : 'professional services'
      setImageQuery(fallback)
    })
  }, [selected?.id])

  async function searchImages() {
    if (!imageQuery.trim()) return
    setImageSearching(true)
    try {
      const data = await apiGet<{ results: UnsplashResult[]; total: number }>(
        `/api/content/image-search?q=${encodeURIComponent(imageQuery.trim())}&limit=3`
      )
      setImageResults(data.results)
    } catch { /* ignore */ }
    setImageSearching(false)
  }

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

          {/* Queue section */}
          <div className="mb-4 bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <p className="text-xs font-semibold text-charcoal">Queue</p>
              {queue.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal/10 text-teal">
                  {queue.length}
                </span>
              )}
            </div>
            {queue.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-charcoal/40">No candidates queued. Flag a news article on the News page or queue a Story Bank entry to start a draft here.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {queue.map(item => (
                  <div key={item.source_id} className="px-4 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.source_type === 'news'
                            ? 'bg-teal/10 text-teal'
                            : 'bg-[#C9A84C]/10 text-[#C9A84C]'
                        }`}>
                          {item.source_type === 'news' ? 'News' : 'Story Bank'}
                        </span>
                        {item.subtitle && (
                          <span className="text-[10px] text-charcoal/40 truncate">{item.subtitle}</span>
                        )}
                      </div>
                      <p className="text-sm text-charcoal truncate">{item.title}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => copyCommand(item.source_type, item.source_id)}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold text-white transition-colors"
                        style={{ backgroundColor: copiedId === item.source_id ? '#2D3436' : '#005454' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        {copiedId === item.source_id ? 'Copied!' : 'Copy command'}
                      </button>
                      {dismissingId === item.source_id ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="text-charcoal/50">Dismiss?</span>
                          <button
                            onClick={() => dismissQueueItem(item.source_type, item.source_id)}
                            className="font-semibold text-red-600 hover:text-red-700 transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDismissingId(null)}
                            className="font-semibold text-charcoal/40 hover:text-charcoal/60 transition-colors"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDismissingId(item.source_id)}
                          className="text-xs text-charcoal/40 hover:text-red-600 transition-colors"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                  onClick={() => handleSelectPost(post.id)}
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
                    {post.title || (() => {
                      const body = (post.body || '').trim()
                      if (!body) return '(untitled)'
                      if (body.length <= 60) return body
                      const cut = body.lastIndexOf(' ', 60)
                      return (cut > 20 ? body.slice(0, cut) : body.slice(0, 60)) + '...'
                    })()}
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

                {/* Image */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-charcoal/60 mb-2">Image</p>

                  {/* Selected image display */}
                  {selected.featured_image_url && (
                    <div className="mb-2">
                      <img
                        src={selected.featured_image_url}
                        alt="Selected"
                        className="w-full h-24 object-cover rounded-lg mb-1"
                      />
                      <button
                        onClick={() => {
                          setPosts(prev => prev.map(p => p.id === selected.id ? { ...p, featured_image_url: null } : p))
                          patchStatus(selected.id, { featured_image_url: null })
                        }}
                        className="text-[10px] font-medium text-red-soft hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Search input */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={imageQuery}
                      onChange={e => setImageQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchImages()}
                      placeholder="Search images..."
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-charcoal"
                    />
                    <button
                      onClick={searchImages}
                      disabled={imageSearching || !imageQuery.trim()}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-teal text-white hover:bg-teal/90 transition-colors disabled:opacity-50"
                    >
                      {imageSearching ? '...' : 'Search'}
                    </button>
                  </div>

                  {/* Search results */}
                  {imageResults.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {imageResults.map(img => (
                        <button
                          key={img.id}
                          onClick={() => {
                            setPosts(prev => prev.map(p => p.id === selected.id ? { ...p, featured_image_url: img.url } : p))
                            patchStatus(selected.id, { featured_image_url: img.url })
                            apiPost('/api/content/image-download-trigger', { download_url: img.download_url }).catch(() => {})
                          }}
                          className={`flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                            selected.featured_image_url === img.url
                              ? 'ring-2 ring-teal ring-offset-1'
                              : 'ring-1 ring-gray-200 hover:ring-gray-300'
                          }`}
                        >
                          <img
                            src={img.thumb}
                            alt={img.description || 'Unsplash photo'}
                            className="w-[120px] h-auto object-cover"
                          />
                          <p className="text-[9px] text-charcoal/40 px-1 py-0.5 truncate w-[120px]">
                            {img.photographer}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="border-t border-gray-100 pt-3">
                  {selected.status === 'draft' && (
                    <div className="space-y-2">
                      <button
                        disabled={patching}
                        onClick={() => patchStatus(selected.id, { status: 'approved' })}
                        className="w-full py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#378ADD' }}
                      >
                        {patching ? 'Updating…' : 'Approve'}
                      </button>
                      <div className="flex justify-center">
                        {dismissingDraftId === selected.id ? (
                          <span className="inline-flex items-center gap-2 text-xs">
                            <span className="text-charcoal/50">Dismiss draft?</span>
                            <button
                              onClick={async () => {
                                const id = selected.id
                                await patchStatus(id, { status: 'archived' })
                                setDismissingDraftId(null)
                                setSelectedId(null)
                              }}
                              className="font-semibold text-red-600 hover:text-red-700 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDismissingDraftId(null)}
                              className="font-semibold text-charcoal/40 hover:text-charcoal/60 transition-colors"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDismissingDraftId(selected.id)}
                            className="text-xs text-charcoal/40 hover:text-red-600 transition-colors"
                          >
                            Dismiss draft
                          </button>
                        )}
                      </div>
                    </div>
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
