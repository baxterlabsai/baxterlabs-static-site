import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost, apiPut } from '../../../lib/api'
import { useToast } from '../../../components/Toast'

interface Post {
  id: string
  type: string
  title: string
  body: string | null
  status: string
  platform: string | null
  scheduled_date: string | null
  published_date: string | null
  published: boolean
  blog_slug: string | null
  seo_title: string | null
  seo_description: string | null
  featured_image_url: string | null
  source_post_id: string | null
  created_at: string
}

interface LinkedInPost {
  id: string
  title: string
}

const STATUSES = ['draft', 'scheduled', 'published', 'archived']

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

function wordCount(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

// Simple markdown to HTML for preview
function renderMarkdown(md: string): string {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-[#2D3436] mt-4 mb-2 font-display">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-[#2D3436] mt-6 mb-3 font-display">$1</h2>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#005454] underline">$1</a>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-[#005454]/30 pl-4 italic text-[#2D3436]/70 my-3">$1</blockquote>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed">')

  // Unordered lists
  html = html.replace(/(?:^|\n)((?:- .+\n?)+)/g, (_match, list: string) => {
    const items = list.trim().split('\n').map((line: string) =>
      `<li class="ml-4 list-disc">${line.replace(/^- /, '')}</li>`
    ).join('')
    return `<ul class="my-3 space-y-1">${items}</ul>`
  })

  // Ordered lists
  html = html.replace(/(?:^|\n)((?:\d+\. .+\n?)+)/g, (_match, list: string) => {
    const items = list.trim().split('\n').map((line: string) =>
      `<li class="ml-4 list-decimal">${line.replace(/^\d+\. /, '')}</li>`
    ).join('')
    return `<ol class="my-3 space-y-1">${items}</ol>`
  })

  return `<p class="mb-3 leading-relaxed">${html}</p>`
}

export default function BlogEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isNew = id === 'new'

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('draft')
  const [scheduledDate, setScheduledDate] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [featuredImageUrl, setFeaturedImageUrl] = useState('')
  const [sourcePostId, setSourcePostId] = useState('')
  const [published, setPublished] = useState(false)
  const [publishedDate, setPublishedDate] = useState('')

  const [linkedInPosts, setLinkedInPosts] = useState<LinkedInPost[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [publishConfirm, setPublishConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load existing post
  useEffect(() => {
    if (!isNew && id) {
      apiGet<Post>(`/api/content-posts/${id}`)
        .then(p => {
          setTitle(p.title)
          setBody(p.body || '')
          setStatus(p.status)
          setScheduledDate(p.scheduled_date ? p.scheduled_date.slice(0, 16) : '')
          setSeoTitle(p.seo_title || '')
          setSeoDescription(p.seo_description || '')
          setSlug(p.blog_slug || '')
          setSlugManuallyEdited(!!p.blog_slug)
          setFeaturedImageUrl(p.featured_image_url || '')
          setSourcePostId(p.source_post_id || '')
          setPublished(p.published)
          setPublishedDate(p.published_date || '')
        })
        .catch(() => navigate('/dashboard/content/blog'))
        .finally(() => setLoading(false))
    }
  }, [id, isNew, navigate])

  // Load LinkedIn posts for source dropdown
  useEffect(() => {
    apiGet<LinkedInPost[]>('/api/content-posts?type=linkedin')
      .then(setLinkedInPosts)
      .catch(() => {})
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title))
    }
  }, [title, slugManuallyEdited])

  const handleSlugChange = (val: string) => {
    setSlugManuallyEdited(true)
    setSlug(val)
  }

  const handleSave = async () => {
    if (!title) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        type: 'blog',
        title,
        body: body || undefined,
        status,
        platform: 'blog',
        scheduled_date: scheduledDate || undefined,
        seo_title: seoTitle || undefined,
        seo_description: seoDescription || undefined,
        blog_slug: slug || undefined,
        featured_image_url: featuredImageUrl || undefined,
        source_post_id: sourcePostId || undefined,
        published,
        published_date: publishedDate || undefined,
      }
      if (isNew) {
        const result = await apiPost<Post>('/api/content-posts', payload)
        navigate(`/dashboard/content/blog/${result.id}`, { replace: true })
      } else {
        await apiPut(`/api/content-posts/${id}`, payload)
      }
      toast('Draft saved', 'success')
    } catch (err) {
      console.error('Save failed:', err)
      toast(err instanceof Error ? err.message : 'Failed to save post', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    setPublishConfirm(false)
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const payload: Record<string, unknown> = {
        type: 'blog',
        title,
        body: body || undefined,
        status: 'published',
        platform: 'blog',
        blog_slug: slug || undefined,
        seo_title: seoTitle || undefined,
        seo_description: seoDescription || undefined,
        featured_image_url: featuredImageUrl || undefined,
        source_post_id: sourcePostId || undefined,
        published: true,
        published_date: now,
      }
      if (isNew) {
        const result = await apiPost<Post>('/api/content-posts', payload)
        navigate(`/dashboard/content/blog/${result.id}`, { replace: true })
      } else {
        await apiPut(`/api/content-posts/${id}`, payload)
      }
      setPublished(true)
      setPublishedDate(now)
      setStatus('published')
      toast('Post published', 'success')
    } catch (err) {
      console.error('Publish failed:', err)
      toast(err instanceof Error ? err.message : 'Failed to publish post', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUnpublish = async () => {
    setSaving(true)
    try {
      await apiPut(`/api/content-posts/${id}`, { published: false, status: 'draft' })
      setPublished(false)
      setStatus('draft')
      toast('Post unpublished', 'success')
    } catch (err) {
      console.error('Unpublish failed:', err)
      toast(err instanceof Error ? err.message : 'Failed to unpublish post', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Toolbar actions
  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = body.slice(start, end)
    const newText = body.slice(0, start) + before + selected + after + body.slice(end)
    setBody(newText)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }, [body])

  const toolbarButtons = [
    { label: 'B', title: 'Bold', action: () => insertMarkdown('**', '**') },
    { label: 'I', title: 'Italic', action: () => insertMarkdown('*', '*') },
    { label: 'H2', title: 'Heading 2', action: () => insertMarkdown('\n## ') },
    { label: 'H3', title: 'Heading 3', action: () => insertMarkdown('\n### ') },
    { label: '\u2022', title: 'Bullet List', action: () => insertMarkdown('\n- ') },
    { label: '1.', title: 'Numbered List', action: () => insertMarkdown('\n1. ') },
    { label: '\uD83D\uDD17', title: 'Link', action: () => insertMarkdown('[', '](url)') },
    { label: '\u201C', title: 'Quote', action: () => insertMarkdown('\n> ') },
  ]

  if (loading) {
    return <div className="text-center py-12 text-[#2D3436]/60">Loading...</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/content/blog')}
            className="text-[#2D3436]/50 hover:text-[#2D3436] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-display text-2xl font-bold text-[#66151C]">
            {isNew ? 'New Blog Post' : 'Edit Blog Post'}
          </h1>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left: Editor */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title..."
            className="w-full text-2xl font-display font-bold text-[#2D3436] border-0 border-b-2 border-gray-200 focus:border-[#005454] focus:outline-none pb-3 mb-4 bg-transparent placeholder:text-[#2D3436]/30"
          />

          {/* Toolbar + Preview Toggle */}
          <div className="flex items-center justify-between bg-white rounded-t-xl border border-gray-200 border-b-0 px-3 py-2">
            <div className="flex items-center gap-1">
              {toolbarButtons.map(btn => (
                <button
                  key={btn.title}
                  onClick={btn.action}
                  title={btn.title}
                  className="w-8 h-8 flex items-center justify-center rounded text-sm font-semibold text-[#2D3436] hover:bg-[#005454]/10 hover:text-[#005454] transition-colors"
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                showPreview ? 'bg-[#005454] text-white' : 'bg-gray-100 text-[#2D3436] hover:bg-gray-200'
              }`}
            >
              {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>

          {/* Editor / Preview */}
          {showPreview ? (
            <div
              className="bg-white border border-gray-200 rounded-b-xl p-6 min-h-[500px] prose max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your post in markdown..."
              className="w-full bg-white border border-gray-200 rounded-b-xl p-4 min-h-[500px] text-sm text-[#2D3436] font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-[#005454]"
            />
          )}

          {/* Word count */}
          <div className="mt-2 text-xs text-[#2D3436]/50">
            {wordCount(body).toLocaleString()} words
          </div>
        </div>

        {/* Right: Settings Panel */}
        <div className="w-[280px] flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5 sticky top-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Scheduled Date */}
            {status === 'scheduled' && (
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1">Scheduled Date</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}

            {/* SEO Title */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">
                SEO Title <span className={`font-normal ${seoTitle.length > 60 ? 'text-red-500' : 'text-[#2D3436]/40'}`}>({seoTitle.length}/60)</span>
              </label>
              <input
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value.slice(0, 60))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* SEO Description */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">
                SEO Description <span className={`font-normal ${seoDescription.length > 155 ? 'text-red-500' : 'text-[#2D3436]/40'}`}>({seoDescription.length}/155)</span>
              </label>
              <textarea
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value.slice(0, 155))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* Blog Slug */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Blog Slug</label>
              <input
                value={slug}
                onChange={e => handleSlugChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
              />
              <p className="mt-1 text-xs text-[#2D3436]/40 break-all">baxterlabs.ai/blog/{slug || '...'}</p>
            </div>

            {/* Featured Image URL */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Featured Image URL</label>
              <input
                value={featuredImageUrl}
                onChange={e => setFeaturedImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {/* Source LinkedIn Post */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1">Source LinkedIn Post</label>
              <select
                value={sourcePostId}
                onChange={e => setSourcePostId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {linkedInPosts.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <button
                onClick={handleSave}
                disabled={saving || !title}
                className="w-full bg-[#005454] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#005454]/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>

              {published ? (
                <button
                  onClick={handleUnpublish}
                  disabled={saving}
                  className="w-full border border-red-300 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Unpublish
                </button>
              ) : (
                <button
                  onClick={() => setPublishConfirm(true)}
                  disabled={saving || !title || !body}
                  className="w-full bg-[#66151C] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#66151C]/90 transition-colors disabled:opacity-50"
                >
                  Publish
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Publish Confirmation Dialog */}
      {publishConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPublishConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-[#2D3436] mb-2">Publish Post?</h3>
            <p className="text-sm text-[#2D3436]/70 mb-5">
              This will make the post live on baxterlabs.ai. Are you sure?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPublishConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-[#2D3436]/60 hover:text-[#2D3436] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                className="bg-[#66151C] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#66151C]/90 transition-colors"
              >
                Yes, Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
