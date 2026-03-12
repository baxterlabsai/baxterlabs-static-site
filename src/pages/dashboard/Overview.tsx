import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import SEO from '../../components/SEO'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PipelineStats {
  stage_counts: Record<string, number>
  total_pipeline_value: number
  total_opportunities: number
}

interface PipelineTask {
  id: string
  title: string
  task_type: string
  due_date: string | null
  status: string
  priority: string
  pipeline_companies: { id: string; name: string } | null
  pipeline_contacts: { id: string; name: string } | null
  pipeline_opportunities: { id: string; title: string; stage?: string } | null
}

interface Engagement {
  id: string
  status: string
  phase: number
  phase_started_at: string | null
  created_at: string
  clients: {
    company_name: string
    primary_contact_name: string
  }
}

interface ContentPerformance {
  published_this_month: number
  stories_available: number
  month_label: string
}

interface ContentPost {
  id: string
  title: string
  status: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type FilterTab = 'all' | 'pipeline' | 'engagements' | 'content'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function daysOverdue(dueDate: string | null): number | null {
  if (!dueDate) return null
  const diff = Math.floor(
    (Date.now() - new Date(dueDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
  )
  return diff > 0 ? diff : null
}

function daysInPhase(phaseStartedAt: string | null, createdAt: string): number {
  const ref = phaseStartedAt || createdAt
  return Math.max(0, Math.floor(
    (Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24)
  ))
}

function phaseLabel(phase: number, status: string): string {
  if (status === 'intake') return 'Intake'
  if (status === 'discovery_done') return 'Discovery done'
  if (status === 'agreement_pending') return 'Agreement pending'
  if (status === 'agreement_signed') return 'Agreement signed'
  if (status === 'documents_pending') return 'Documents pending'
  if (status === 'documents_received') return 'Documents received'
  if (status === 'debrief') return 'Debrief'
  if (status.startsWith('wave_')) return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  if (status === 'closed') return 'Closed'
  if (phase >= 1 && phase <= 6) return `Phase ${phase}`
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Overview() {
  const [firstName, setFirstName] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  // Pipeline
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null)
  const [pipelineTasks, setPipelineTasks] = useState<PipelineTask[]>([])

  // Engagements
  const [engagements, setEngagements] = useState<Engagement[]>([])

  // Content
  const [contentPerf, setContentPerf] = useState<ContentPerformance | null>(null)
  const [draftPosts, setDraftPosts] = useState<ContentPost[]>([])
  const [scheduledCount, setScheduledCount] = useState(0)

  const [loading, setLoading] = useState(true)

  // Get user first name
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata
        const fullName = meta?.full_name || session.user.email || ''
        setFirstName(fullName.split(' ')[0] || 'there')
      }
    })
  }, [])

  // Fetch all data
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [stats, tasks, engs, content, drafts, scheduled] = await Promise.all([
        apiGet<PipelineStats>('/api/pipeline/stats').catch(() => null),
        apiGet<{ tasks: PipelineTask[]; count: number }>('/api/pipeline/tasks?status=pending').catch(() => null),
        apiGet<{ engagements: Engagement[] }>('/api/engagements').catch(() => null),
        apiGet<ContentPerformance>('/api/content/performance').catch(() => null),
        apiGet<ContentPost[]>('/api/content-posts?status=draft').catch(() => null),
        apiGet<ContentPost[]>('/api/content-posts?status=scheduled').catch(() => null),
      ])

      if (stats) setPipelineStats(stats)

      // Filter to actionable task types, sort by due_date
      if (tasks?.tasks) {
        const actionable = tasks.tasks
          .filter(t => ['follow_up', 'email', 'linkedin_dm', 'linkedin_audio', 'linkedin_comment',
            'linkedin_inmail', 'phone_warm', 'phone_cold', 'referral_intro',
            'lead_gen', 'prep', 'video_call', 'review_draft'].includes(t.task_type))
          .sort((a, b) => {
            if (!a.due_date) return 1
            if (!b.due_date) return -1
            return a.due_date.localeCompare(b.due_date)
          })
          .slice(0, 3)
        setPipelineTasks(actionable)
      }

      if (engs?.engagements) {
        const active = engs.engagements.filter(
          e => !['completed', 'archived', 'closed'].includes(e.status)
        )
        setEngagements(active)
      }

      if (content) setContentPerf(content)
      if (drafts) setDraftPosts(drafts)
      if (scheduled) setScheduledCount(scheduled.length)

      setLoading(false)
    }
    load()
  }, [])

  const show = (section: FilterTab) => activeTab === 'all' || activeTab === section

  // Pipeline metric helpers
  const sc = pipelineStats?.stage_counts || {}
  const prospectCount = (sc.identified || 0) + (sc.contacted || 0) + (sc.discovery_scheduled || 0) + (sc.discovery_complete || 0)

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'engagements', label: 'Engagements' },
    { key: 'content', label: 'Content' },
  ]

  return (
    <>
      <SEO title="Dashboard — BaxterLabs" description="BaxterLabs advisory workflow hub" />

      {/* Top bar */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-5">
          <h1 className="text-2xl font-display font-bold text-charcoal">
            {getGreeting()}, {firstName}
          </h1>
          <span className="text-sm text-charcoal/50">{formatDate()}</span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-gray-light">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-crimson text-charcoal'
                  : 'border-transparent text-charcoal/50 hover:text-charcoal hover:border-charcoal/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-charcoal/40 text-sm">Loading...</div>
      ) : (
        <div className="space-y-6">

          {/* ============================================================ */}
          {/*  PIPELINE SECTION                                            */}
          {/* ============================================================ */}
          {show('pipeline') && (
            <section className="bg-white rounded-xl border border-gray-light p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#378ADD' }} />
                  <div>
                    <h2 className="text-lg font-display font-semibold text-charcoal">Pipeline</h2>
                    <p className="text-xs text-charcoal/50">
                      {prospectCount} prospect{prospectCount !== 1 ? 's' : ''}
                      {pipelineStats && pipelineStats.total_pipeline_value > 0 && (
                        <> &middot; {fmtCurrency(pipelineStats.total_pipeline_value)} pipeline value</>
                      )}
                    </p>
                  </div>
                </div>
                <Link to="/dashboard/pipeline" className="text-xs font-medium text-teal hover:underline">
                  Open board &rarr;
                </Link>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Identified', count: sc.identified || 0 },
                  { label: 'Contacted', count: sc.contacted || 0 },
                  { label: 'Discovery', count: (sc.discovery_scheduled || 0) + (sc.discovery_complete || 0) },
                  { label: 'Won', count: sc.won || 0 },
                ].map(m => (
                  <div key={m.label} className="text-center py-3 bg-ivory rounded-lg">
                    <div className="text-xl font-bold text-charcoal">{m.count}</div>
                    <div className="text-[11px] text-charcoal/50 font-medium">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Next actions */}
              {pipelineTasks.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold text-charcoal/40 uppercase tracking-wider mb-2">Next actions</h3>
                  <div className="divide-y divide-gray-light">
                    {pipelineTasks.map(task => {
                      const overdue = daysOverdue(task.due_date)
                      return (
                        <div key={task.id} className="flex items-center justify-between py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-charcoal truncate">{task.title}</p>
                            {task.pipeline_companies && (
                              <p className="text-xs text-charcoal/40 truncate">{task.pipeline_companies.name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                            {overdue && (
                              <span className="text-[11px] font-medium text-red-500">
                                {overdue}d overdue
                              </span>
                            )}
                            <Link
                              to="/dashboard/pipeline/tasks"
                              className="text-xs font-medium text-teal hover:underline whitespace-nowrap"
                            >
                              Open &rarr;
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-charcoal/40 italic">Run lead gen tasks to build your pipeline</p>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/*  ENGAGEMENTS SECTION                                         */}
          {/* ============================================================ */}
          {show('engagements') && (
            <section className="bg-white rounded-xl border border-gray-light p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#BA7517' }} />
                  <div>
                    <h2 className="text-lg font-display font-semibold text-charcoal">Engagements</h2>
                    <p className="text-xs text-charcoal/50">
                      {engagements.length} active
                    </p>
                  </div>
                </div>
                <Link to="/dashboard/clients" className="text-xs font-medium text-teal hover:underline">
                  View all &rarr;
                </Link>
              </div>

              {/* List */}
              {engagements.length > 0 ? (
                <div className="divide-y divide-gray-light">
                  {engagements.map(eng => {
                    const days = daysInPhase(eng.phase_started_at, eng.created_at)
                    return (
                      <Link
                        key={eng.id}
                        to={`/dashboard/engagement/${eng.id}`}
                        className="flex items-center justify-between py-3 hover:bg-ivory -mx-2 px-2 rounded-lg transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-charcoal truncate">
                            {eng.clients?.company_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-charcoal/40">
                            {phaseLabel(eng.phase, eng.status)}
                          </p>
                        </div>
                        <span className="text-xs text-charcoal/40 flex-shrink-0 ml-3">
                          {days}d in phase
                        </span>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-charcoal/40 italic">
                  No active engagements &mdash; pipeline activity converts here
                </p>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/*  CONTENT SECTION                                             */}
          {/* ============================================================ */}
          {show('content') && (
            <section className="bg-white rounded-xl border border-gray-light p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#639922' }} />
                  <div>
                    <h2 className="text-lg font-display font-semibold text-charcoal">Content</h2>
                    <p className="text-xs text-charcoal/50">
                      {contentPerf?.published_this_month || 0} published this month
                      {contentPerf && contentPerf.stories_available > 0 && (
                        <> &middot; {contentPerf.stories_available} stories available</>
                      )}
                    </p>
                  </div>
                </div>
                <Link to="/dashboard/content/blog" className="text-xs font-medium text-teal hover:underline">
                  Content calendar &rarr;
                </Link>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: 'Published this month', count: contentPerf?.published_this_month || 0 },
                  { label: 'Story bank', count: contentPerf?.stories_available || 0 },
                  { label: 'Scheduled', count: scheduledCount },
                ].map(m => (
                  <div key={m.label} className="text-center py-3 bg-ivory rounded-lg">
                    <div className="text-xl font-bold text-charcoal">{m.count}</div>
                    <div className="text-[11px] text-charcoal/50 font-medium">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Next action — most recent draft */}
              {draftPosts.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold text-charcoal/40 uppercase tracking-wider mb-2">Awaiting review</h3>
                  <div className="flex items-center justify-between py-2.5">
                    <p className="text-sm text-charcoal truncate min-w-0 flex-1">
                      {draftPosts[0].title || 'Untitled draft'}
                    </p>
                    <Link
                      to={`/dashboard/content/blog/${draftPosts[0].id}`}
                      className="text-xs font-medium text-teal hover:underline flex-shrink-0 ml-3"
                    >
                      Review &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-charcoal/40 italic">No drafts awaiting review</p>
              )}
            </section>
          )}

        </div>
      )}
    </>
  )
}
