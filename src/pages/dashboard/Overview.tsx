import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, apiPut } from '../../lib/api'

interface ContentPerformance {
  published_this_month: number
  avg_engagement_rate: number | null
  total_impressions: number | null
  stories_available: number
  top_post: {
    id: string
    title: string
    engagement_rate: number
    impressions: number | null
    published_date: string | null
  } | null
  month_label: string
}
import { TaskFormModal } from './pipeline/Tasks'

interface Engagement {
  id: string
  status: string
  phase: number
  fee: number | null
  start_date: string | null
  target_end_date: string | null
  created_at: string
  clients: {
    company_name: string
    primary_contact_name: string
  }
}

interface RevenueSummary {
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  total_overdue: number
  invoice_count: number
  deposit_count: number
  final_count: number
}

interface FollowUp {
  id: string
  engagement_id: string
  touchpoint: string
  scheduled_date: string
  status: string
  snoozed_until: string | null
  subject_template: string
  body_template: string
  actual_subject: string | null
  actual_body: string | null
  clients: {
    id: string
    company_name: string
    primary_contact_name: string
    primary_contact_email: string
  } | null
  engagements: {
    id: string
    partner_lead: string | null
    fee: number | null
    status: string
  } | null
}

interface PipelineStats {
  stage_counts: Record<string, number>
  total_pipeline_value: number
  total_opportunities: number
  tasks_due_today: number
  tasks_overdue: number
  recent_activities: Array<{
    id: string
    type: string
    subject: string
    occurred_at: string
    pipeline_contacts: { id: string; name: string } | null
    pipeline_companies: { id: string; name: string } | null
  }>
}

interface DraftActivity {
  id: string
  type: string
  subject: string
  body: string | null
  outreach_channel: string | null
  created_at: string
  pipeline_contacts: { id: string; name: string; email?: string } | null
  pipeline_companies: { id: string; name: string } | null
  pipeline_opportunities: { id: string; title: string } | null
}

interface PipelineAnalytics {
  weekly_scorecard: {
    total_activities: number
    by_type: Record<string, number>
    by_channel: Record<string, number>
    new_companies: number
    new_contacts: number
    stage_transitions: number
  }
  stage_funnel: Record<string, { count: number; value: number }>
  transition_summary: Record<string, number>
  activity_trends: Record<string, number>
}

interface PipelineFollowUp {
  id: string
  source: 'task' | 'activity'
  title: string
  due_date: string | null
  is_overdue: boolean
  priority: string
  contact: { id: string; name: string } | null
  company: { id: string; name: string } | null
  opportunity: { id: string; title: string; stage: string } | null
}

interface CockpitTask {
  id: string
  task_type: string
  title: string
  description: string | null
  company_id: string | null
  contact_id: string | null
  due_date: string | null
  priority: string
  status: string
  pipeline_companies: { id: string; name: string } | null
  pipeline_contacts: { id: string; name: string; email?: string } | null
  pipeline_opportunities: { id: string; title: string; stage?: string } | null
}

interface CockpitData {
  overdue: CockpitTask[]
  due_today: CockpitTask[]
  due_tomorrow: CockpitTask[]
  due_this_week: CockpitTask[]
  no_date: CockpitTask[]
  summary: {
    overdue_count: number
    today_count: number
    tomorrow_count: number
    week_count: number
    by_type: Record<string, number>
  }
}

interface CockpitCompany {
  id: string
  name: string
}

interface CockpitContact {
  id: string
  name: string
  title: string | null
  company_id: string | null
}

const COCKPIT_TYPE_LABELS: Record<string, string> = {
  email: 'Email',
  linkedin_dm: 'LinkedIn DM',
  linkedin_audio: 'LinkedIn Audio',
  linkedin_comment: 'LinkedIn Comment',
  linkedin_inmail: 'LinkedIn InMail',
  phone_warm: 'Warm Call',
  phone_cold: 'Cold Call',
  referral_intro: 'Referral Intro',
  in_person: 'In-Person',
  conference: 'Conference',
  video_call: 'Video Call',
  review_draft: 'Review Draft',
  prep: 'Prep',
  follow_up: 'Follow-Up',
  admin: 'Admin',
  other: 'Other',
}

const COCKPIT_TYPE_BADGE: Record<string, string> = {
  email: 'bg-blue-100 text-blue-700',
  linkedin_dm: 'bg-blue-100 text-blue-700',
  linkedin_audio: 'bg-blue-100 text-blue-700',
  linkedin_comment: 'bg-blue-100 text-blue-700',
  linkedin_inmail: 'bg-blue-100 text-blue-700',
  phone_warm: 'bg-sky-100 text-sky-700',
  phone_cold: 'bg-sky-100 text-sky-700',
  referral_intro: 'bg-indigo-100 text-indigo-700',
  in_person: 'bg-violet-100 text-violet-700',
  conference: 'bg-violet-100 text-violet-700',
  video_call: 'bg-gray-100 text-gray-700',
  review_draft: 'bg-gray-100 text-gray-700',
  prep: 'bg-amber-100 text-amber-700',
  follow_up: 'bg-gray-100 text-gray-700',
  admin: 'bg-gray-100 text-gray-700',
  other: 'bg-gray-100 text-gray-700',
}

const STATUS_COLORS: Record<string, string> = {
  intake: 'bg-gray-light text-charcoal',
  discovery_done: 'bg-blue-100 text-blue-800',
  agreement_pending: 'bg-amber/20 text-amber',
  agreement_signed: 'bg-amber/20 text-amber',
  documents_pending: 'bg-orange-100 text-orange-800',
  documents_received: 'bg-orange-100 text-orange-800',
  phase_1: 'bg-green/10 text-green',
  phase_2: 'bg-green/10 text-green',
  phase_3: 'bg-green/10 text-green',
  phase_4: 'bg-green/10 text-green',
  phase_5: 'bg-green/10 text-green',
  phase_6: 'bg-green/10 text-green',
  debrief: 'bg-purple-100 text-purple-800',
  wave_1_released: 'bg-purple-100 text-purple-800',
  wave_2_released: 'bg-purple-100 text-purple-800',
  closed: 'bg-charcoal/10 text-charcoal',
}

const STAGE_BADGE_COLORS: Record<string, string> = {
  identified: 'bg-gray-light text-charcoal',
  contacted: 'bg-blue-100 text-blue-800',
  discovery_scheduled: 'bg-teal/10 text-teal',
  discovery_complete: 'bg-teal/20 text-teal',
  proposal_sent: 'bg-gold/20 text-charcoal',
  negotiation: 'bg-gold/30 text-charcoal',
  won: 'bg-green/10 text-green',
}

const STAGE_LABELS: Record<string, string> = {
  identified: 'Identified',
  contacted: 'Contacted',
  discovery_scheduled: 'Discovery',
  discovery_complete: 'Disc. Complete',
  proposal_sent: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
}

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  video_call: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
  phone_call: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
  email: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
  dm: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  linkedin: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244',
  meeting: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772',
  note: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
  referral: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function daysRemaining(endDate: string | null): string {
  if (!endDate) return '—'
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Overdue'
  return `${diff}d`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

type SortField = 'company' | 'status' | 'phase' | 'fee' | 'created'
type SortDir = 'asc' | 'desc'

export default function Overview() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null)
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [expandedFollowUp, setExpandedFollowUp] = useState<string | null>(null)
  const [editedSubjects, setEditedSubjects] = useState<Record<string, string>>({})
  const [editedBodies, setEditedBodies] = useState<Record<string, string>>({})
  const [followUpActionLoading, setFollowUpActionLoading] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<DraftActivity[]>([])
  const [draftActionLoading, setDraftActionLoading] = useState<string | null>(null)
  const [pipelineFollowUps, setPipelineFollowUps] = useState<PipelineFollowUp[]>([])
  const [pipelineFollowUpOverdue, setPipelineFollowUpOverdue] = useState(0)
  const [analytics, setAnalytics] = useState<PipelineAnalytics | null>(null)
  const [cockpit, setCockpit] = useState<CockpitData | null>(null)
  const [cockpitCompanies, setCockpitCompanies] = useState<CockpitCompany[]>([])
  const [cockpitContacts, setCockpitContacts] = useState<CockpitContact[]>([])
  const [showCockpitAddTask, setShowCockpitAddTask] = useState(false)
  const [cockpitTomorrowOpen, setCockpitTomorrowOpen] = useState(false)
  const [contentPerf, setContentPerf] = useState<ContentPerformance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortField, setSortField] = useState<SortField>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const navigate = useNavigate()

  async function loadCockpit() {
    const data = await apiGet<CockpitData>('/api/pipeline/tasks/cockpit').catch(() => null)
    if (data) setCockpit(data)
  }

  async function cockpitDone(taskId: string) {
    if (!cockpit) return
    // Optimistic: remove from all buckets
    setCockpit(prev => {
      if (!prev) return prev
      const remove = (arr: CockpitTask[]) => arr.filter(t => t.id !== taskId)
      return { ...prev, overdue: remove(prev.overdue), due_today: remove(prev.due_today), due_tomorrow: remove(prev.due_tomorrow), due_this_week: remove(prev.due_this_week), no_date: remove(prev.no_date) }
    })
    try {
      await apiPut(`/api/pipeline/tasks/${taskId}`, { status: 'complete' })
    } catch {
      loadCockpit()
    }
  }

  async function cockpitSnooze(taskId: string) {
    if (!cockpit) return
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    // Optimistic: move task to tomorrow bucket
    setCockpit(prev => {
      if (!prev) return prev
      let task: CockpitTask | undefined
      const remove = (arr: CockpitTask[]) => {
        const idx = arr.findIndex(t => t.id === taskId)
        if (idx >= 0) { task = { ...arr[idx], due_date: tomorrowStr }; return [...arr.slice(0, idx), ...arr.slice(idx + 1)] }
        return arr
      }
      const newOverdue = remove(prev.overdue)
      const newToday = remove(prev.due_today)
      const newTomorrow = [...prev.due_tomorrow]
      if (task) newTomorrow.push(task)
      return { ...prev, overdue: newOverdue, due_today: newToday, due_tomorrow: newTomorrow }
    })
    try {
      await apiPut(`/api/pipeline/tasks/${taskId}`, { due_date: tomorrowStr })
    } catch {
      loadCockpit()
    }
  }

  async function cockpitAddTask(data: Record<string, unknown>) {
    await apiPost('/api/pipeline/tasks', data)
    setShowCockpitAddTask(false)
    loadCockpit()
  }

  useEffect(() => {
    Promise.all([
      apiGet<{ engagements: Engagement[] }>('/api/engagements'),
      apiGet<PipelineStats>('/api/pipeline/stats').catch(() => null),
      apiGet<RevenueSummary>('/api/invoices/revenue-summary').catch(() => null),
      apiGet<{ follow_ups: FollowUp[] }>('/api/follow-ups?upcoming_only=true').catch(() => null),
      apiGet<{ drafts: DraftActivity[] }>('/api/pipeline/activities/drafts').catch(() => null),
      apiGet<{ items: PipelineFollowUp[]; overdue_count: number }>('/api/pipeline/follow-up-queue').catch(() => null),
      apiGet<PipelineAnalytics>('/api/pipeline/analytics').catch(() => null),
      apiGet<CockpitData>('/api/pipeline/tasks/cockpit').catch(() => null),
      apiGet<{ companies: CockpitCompany[] }>('/api/pipeline/companies').catch(() => null),
      apiGet<{ contacts: CockpitContact[] }>('/api/pipeline/contacts').catch(() => null),
      apiGet<ContentPerformance>('/api/content/performance').catch(() => null),
    ])
      .then(([engData, statsData, revenueData, followUpData, draftsData, pipelineFuData, analyticsData, cockpitData, companiesData, contactsData, contentPerfData]) => {
        setEngagements(engData.engagements)
        if (statsData) setPipelineStats(statsData)
        if (revenueData) setRevenueSummary(revenueData)
        if (followUpData) setFollowUps(followUpData.follow_ups)
        if (draftsData) setDrafts(draftsData.drafts)
        if (pipelineFuData) {
          setPipelineFollowUps(pipelineFuData.items)
          setPipelineFollowUpOverdue(pipelineFuData.overdue_count)
        }
        if (analyticsData) setAnalytics(analyticsData)
        if (cockpitData) setCockpit(cockpitData)
        if (companiesData) setCockpitCompanies(companiesData.companies)
        if (contactsData) setCockpitContacts(contactsData.contacts)
        if (contentPerfData) setContentPerf(contentPerfData)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...engagements].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortField) {
      case 'company': return dir * (a.clients?.company_name || '').localeCompare(b.clients?.company_name || '')
      case 'status': return dir * a.status.localeCompare(b.status)
      case 'phase': return dir * (a.phase - b.phase)
      case 'fee': return dir * ((a.fee || 0) - (b.fee || 0))
      case 'created': return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      default: return 0
    }
  })

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 text-gray-warm/50">{sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-crimson border-t-transparent rounded-full" />
      </div>
    )
  }

  const formatCockpitDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div>
      {/* Today's Work Cockpit */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-charcoal">Today's Work</h2>
          <button onClick={() => setShowCockpitAddTask(true)} className="flex items-center gap-1.5 text-teal text-sm font-semibold hover:underline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Task
          </button>
        </div>

        {cockpit && (cockpit.summary.overdue_count > 0 || cockpit.summary.today_count > 0) ? (
          <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
            {/* Summary bar */}
            <div className="px-4 py-3 bg-ivory/50 border-b border-gray-light">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {cockpit.summary.overdue_count > 0 && (
                  <span className="flex items-center gap-1.5 font-semibold text-crimson">
                    <span className="w-2 h-2 rounded-full bg-crimson" />
                    {cockpit.summary.overdue_count} overdue
                  </span>
                )}
                {cockpit.summary.today_count > 0 && (
                  <span className="flex items-center gap-1.5 font-semibold text-gold">
                    <span className="w-2 h-2 rounded-full bg-gold" />
                    {cockpit.summary.today_count} due today
                  </span>
                )}
                {Object.keys(cockpit.summary.by_type).length > 0 && (
                  <span className="text-gray-warm text-xs ml-2">
                    {Object.entries(cockpit.summary.by_type).map(([type, count], i) => (
                      <span key={type}>
                        {i > 0 && ' · '}
                        {count} {COCKPIT_TYPE_LABELS[type] || type}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>

            {/* Overdue section */}
            {cockpit.overdue.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-crimson/5 border-b border-gray-light">
                  <span className="text-xs font-semibold text-crimson uppercase tracking-wider">Overdue</span>
                </div>
                <div className="divide-y divide-gray-light">
                  {cockpit.overdue.map(task => (
                    <CockpitTaskRow key={task.id} task={task} onDone={() => cockpitDone(task.id)} onSnooze={() => cockpitSnooze(task.id)} formatDate={formatCockpitDate} navigate={navigate} variant="overdue" />
                  ))}
                </div>
              </div>
            )}

            {/* Due Today section */}
            {cockpit.due_today.length > 0 && (
              <div>
                <div className="px-4 py-1.5 bg-gold/5 border-b border-gray-light">
                  <span className="text-xs font-semibold text-gold uppercase tracking-wider">Due Today</span>
                </div>
                <div className="divide-y divide-gray-light">
                  {cockpit.due_today.map(task => (
                    <CockpitTaskRow key={task.id} task={task} onDone={() => cockpitDone(task.id)} onSnooze={() => cockpitSnooze(task.id)} formatDate={formatCockpitDate} navigate={navigate} variant="today" />
                  ))}
                </div>
              </div>
            )}

            {/* Tomorrow preview (collapsed) */}
            {cockpit.due_tomorrow.length > 0 && (
              <div>
                <button onClick={() => setCockpitTomorrowOpen(!cockpitTomorrowOpen)} className="w-full px-4 py-2 flex items-center gap-2 text-xs text-gray-warm hover:bg-gray-50 transition-colors border-t border-gray-light">
                  <svg className={`w-3 h-3 transition-transform ${cockpitTomorrowOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                  <span className="font-semibold">{cockpit.due_tomorrow.length} task{cockpit.due_tomorrow.length !== 1 ? 's' : ''} due tomorrow</span>
                </button>
                {cockpitTomorrowOpen && (
                  <div className="divide-y divide-gray-light">
                    {cockpit.due_tomorrow.map(task => (
                      <CockpitTaskRow key={task.id} task={task} onDone={() => cockpitDone(task.id)} onSnooze={() => cockpitSnooze(task.id)} formatDate={formatCockpitDate} navigate={navigate} variant="future" />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-light p-6 text-center">
            <p className="text-gray-warm text-sm">No tasks due today. Check the <Link to="/dashboard/pipeline/tasks" className="text-teal font-semibold hover:underline">Tasks page</Link> to plan ahead.</p>
          </div>
        )}
      </div>

      {/* Add Task Modal from cockpit */}
      {showCockpitAddTask && (
        <TaskFormModal
          title="Add Task"
          companies={cockpitCompanies}
          contacts={cockpitContacts}
          onSave={cockpitAddTask}
          onClose={() => setShowCockpitAddTask(false)}
        />
      )}

      {/* Pipeline Snapshot */}
      {pipelineStats && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-charcoal">Pipeline</h2>
            <Link to="/dashboard/pipeline" className="text-teal text-sm font-semibold hover:underline flex items-center gap-1">
              View Board
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          <div className="bg-white rounded-lg border border-gray-light p-5">
            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-warm">Pipeline Value</p>
                <p className="text-lg font-bold text-charcoal">
                  ${pipelineStats.total_pipeline_value.toLocaleString()}
                </p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Opportunities</p>
                <p className="text-lg font-bold text-charcoal">{pipelineStats.total_opportunities}</p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Tasks Due Today</p>
                <p className="text-lg font-bold text-charcoal">{pipelineStats.tasks_due_today}</p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Overdue Tasks</p>
                <p className={`text-lg font-bold ${pipelineStats.tasks_overdue > 0 ? 'text-red-soft' : 'text-charcoal'}`}>
                  {pipelineStats.tasks_overdue}
                  {pipelineStats.tasks_overdue > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-2 h-2 rounded-full bg-red-soft" />
                  )}
                </p>
              </div>
            </div>

            {/* Stage pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(STAGE_LABELS).map(([key, label]) => {
                const count = pipelineStats.stage_counts[key] || 0
                return (
                  <span key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${STAGE_BADGE_COLORS[key] || 'bg-gray-light text-charcoal'}`}>
                    {label}: {count}
                  </span>
                )
              })}
            </div>

            {/* Recent activities mini-feed */}
            {pipelineStats.recent_activities.length > 0 && (
              <div className="border-t border-gray-light pt-3">
                <p className="text-xs font-semibold text-gray-warm mb-2">Recent Activity</p>
                <div className="space-y-2">
                  {pipelineStats.recent_activities.slice(0, 5).map(act => (
                    <div key={act.id} className="flex items-start gap-2 text-xs">
                      <svg className="w-4 h-4 text-gray-warm flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={ACTIVITY_TYPE_ICONS[act.type] || ACTIVITY_TYPE_ICONS.note} />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <span className="text-charcoal font-medium">{act.subject}</span>
                        {act.pipeline_contacts?.name && (
                          <span className="text-gray-warm"> — {act.pipeline_contacts.name}</span>
                        )}
                      </div>
                      <span className="text-gray-warm flex-shrink-0">{timeAgo(act.occurred_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pipeline Analytics — Weekly Scorecard */}
      {analytics && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-charcoal">Weekly Scorecard</h2>
            <span className="text-xs text-gray-warm">Last 7 days</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-lg border border-gray-light p-4 text-center">
              <div className="text-2xl font-bold text-teal">{analytics.weekly_scorecard.total_activities}</div>
              <div className="text-xs text-gray-warm mt-1">Activities</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-light p-4 text-center">
              <div className="text-2xl font-bold text-charcoal">{analytics.weekly_scorecard.new_companies}</div>
              <div className="text-xs text-gray-warm mt-1">New Companies</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-light p-4 text-center">
              <div className="text-2xl font-bold text-charcoal">{analytics.weekly_scorecard.new_contacts}</div>
              <div className="text-xs text-gray-warm mt-1">New Contacts</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-light p-4 text-center">
              <div className="text-2xl font-bold text-gold">{analytics.weekly_scorecard.stage_transitions}</div>
              <div className="text-xs text-gray-warm mt-1">Stage Moves</div>
            </div>
            {Object.keys(analytics.weekly_scorecard.by_channel).length > 0 && (
              <div className="bg-white rounded-lg border border-gray-light p-4 col-span-2">
                <div className="text-xs text-gray-warm mb-2">By Channel</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analytics.weekly_scorecard.by_channel).map(([ch, count]) => (
                    <span key={ch} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-teal/10 text-teal">
                      {ch}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stage Funnel */}
          {Object.keys(analytics.stage_funnel).length > 0 && (
            <div className="mt-4 bg-white rounded-lg border border-gray-light p-4">
              <p className="text-sm font-semibold text-charcoal mb-3">Stage Funnel</p>
              <div className="space-y-2">
                {['identified', 'contacted', 'discovery_scheduled', 'discovery_complete', 'negotiation', 'agreement_sent', 'won']
                  .filter(s => analytics.stage_funnel[s])
                  .map(stage => {
                    const data = analytics.stage_funnel[stage]
                    const maxCount = Math.max(...Object.values(analytics.stage_funnel).map(d => d.count), 1)
                    const pct = (data.count / maxCount) * 100
                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <span className="text-xs text-charcoal w-28 text-right truncate">{stage.replace(/_/g, ' ')}</span>
                        <div className="flex-1 bg-ivory rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full bg-teal/30 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max(pct, 8)}%` }}
                          >
                            <span className="text-[10px] font-bold text-teal">{data.count}</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-warm w-20 text-right">
                          ${Math.round(data.value).toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Activity Trends (sparkline-style) */}
          {Object.keys(analytics.activity_trends).length > 0 && (
            <div className="mt-4 bg-white rounded-lg border border-gray-light p-4">
              <p className="text-sm font-semibold text-charcoal mb-3">Activity Trend (30 days)</p>
              <div className="flex items-end gap-px h-16">
                {(() => {
                  const entries = Object.entries(analytics.activity_trends).sort(([a], [b]) => a.localeCompare(b))
                  const max = Math.max(...entries.map(([, v]) => v), 1)
                  return entries.map(([day, count]) => (
                    <div
                      key={day}
                      className="flex-1 bg-teal/40 rounded-t hover:bg-teal/60 transition-colors cursor-default"
                      style={{ height: `${(count / max) * 100}%`, minHeight: '2px' }}
                      title={`${day}: ${count} activities`}
                    />
                  ))
                })()}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-gray-warm">{Object.keys(analytics.activity_trends).sort()[0]}</span>
                <span className="text-[10px] text-gray-warm">{Object.keys(analytics.activity_trends).sort().slice(-1)[0]}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content Performance */}
      {contentPerf && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-crimson">Content Performance</h2>
              <p className="text-xs text-gray-warm mt-0.5">{contentPerf.month_label}</p>
            </div>
            <Link to="/dashboard/content/calendar" className="text-teal text-sm font-semibold hover:underline flex items-center gap-1">
              Content Calendar
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg border border-gray-light p-4 text-center">
              <div className="text-2xl font-bold text-charcoal">{contentPerf.published_this_month}</div>
              <div className="text-xs text-gray-warm mt-1">Published This Month</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-light p-4 text-center">
              <div className={`text-2xl font-bold ${
                contentPerf.avg_engagement_rate === null ? 'text-charcoal' :
                contentPerf.avg_engagement_rate > 3 ? 'text-[#2D6A4F]' :
                contentPerf.avg_engagement_rate >= 1 ? 'text-[#D4A843]' : 'text-[#C0392B]'
              }`}>
                {contentPerf.avg_engagement_rate !== null ? `${contentPerf.avg_engagement_rate}%` : '—'}
              </div>
              <div className="text-xs text-gray-warm mt-1">Avg Engagement Rate</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-light p-4 text-center">
              <div className="text-2xl font-bold text-charcoal">
                {contentPerf.total_impressions !== null ? contentPerf.total_impressions.toLocaleString() : '—'}
              </div>
              <div className="text-xs text-gray-warm mt-1">Impressions This Month</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-light p-4 text-center">
              <div className="text-2xl font-bold text-charcoal">{contentPerf.stories_available}</div>
              <div className="text-xs text-gray-warm mt-1">Stories Available</div>
            </div>
          </div>

          {contentPerf.top_post ? (
            <div className="bg-white rounded-lg border border-gray-light p-4">
              <p className="text-xs font-semibold text-gray-warm mb-2">Top Post This Month</p>
              <div className="flex items-center justify-between">
                <Link
                  to="/dashboard/content/calendar"
                  className="text-sm font-medium text-charcoal hover:text-teal transition-colors truncate max-w-[60%]"
                >
                  {contentPerf.top_post.title.length > 60
                    ? contentPerf.top_post.title.slice(0, 60) + '...'
                    : contentPerf.top_post.title}
                </Link>
                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded-full font-semibold ${
                    contentPerf.top_post.engagement_rate > 3 ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]' :
                    contentPerf.top_post.engagement_rate >= 1 ? 'bg-[#D4A843]/10 text-[#D4A843]' :
                    'bg-[#C0392B]/10 text-[#C0392B]'
                  }`}>
                    {contentPerf.top_post.engagement_rate}%
                  </span>
                  {contentPerf.top_post.impressions != null && (
                    <span className="text-gray-warm">{contentPerf.top_post.impressions.toLocaleString()} impressions</span>
                  )}
                  {contentPerf.top_post.published_date && (
                    <span className="text-gray-warm">{new Date(contentPerf.top_post.published_date).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-light p-4 text-center">
              <p className="text-sm text-gray-warm">
                Content performance data will appear here after your first posts are published. Your Story Bank has {contentPerf.stories_available} {contentPerf.stories_available === 1 ? 'entry' : 'entries'} ready to use.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Draft Queue */}
      {drafts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-charcoal flex items-center gap-2">
              Outreach Draft Queue
              <span className="bg-gold text-charcoal text-xs font-bold px-2 py-0.5 rounded-full">{drafts.length}</span>
            </h2>
            <Link to="/dashboard/pipeline/activities" className="text-teal text-sm font-semibold hover:underline flex items-center gap-1">
              All Activities
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
          <div className="space-y-3">
            {drafts.map(draft => (
              <div key={draft.id} className="bg-white rounded-lg border border-gray-light p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-charcoal text-sm">{draft.subject}</span>
                      {draft.outreach_channel && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal/10 text-teal uppercase">
                          {draft.outreach_channel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-warm mb-2">
                      {draft.pipeline_contacts?.name && (
                        <span>{draft.pipeline_contacts.name}</span>
                      )}
                      {draft.pipeline_contacts?.name && draft.pipeline_companies?.name && (
                        <span>&middot;</span>
                      )}
                      {draft.pipeline_companies?.name && (
                        <span>{draft.pipeline_companies.name}</span>
                      )}
                      <span>&middot;</span>
                      <span>{timeAgo(draft.created_at)}</span>
                    </div>
                    {draft.body && (
                      <p className="text-xs text-charcoal/70 line-clamp-2">{draft.body}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={async () => {
                        setDraftActionLoading(draft.id + '_send')
                        try {
                          await apiPut(`/api/pipeline/activities/${draft.id}`, { status: 'sent' })
                          setDrafts(prev => prev.filter(d => d.id !== draft.id))
                        } catch { /* ignore */ }
                        setDraftActionLoading(null)
                      }}
                      disabled={draftActionLoading === draft.id + '_send'}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-teal rounded-lg hover:bg-teal/90 transition-colors disabled:opacity-50"
                    >
                      {draftActionLoading === draft.id + '_send' ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={async () => {
                        setDraftActionLoading(draft.id + '_discard')
                        try {
                          await apiPut(`/api/pipeline/activities/${draft.id}`, { status: 'discarded' })
                          setDrafts(prev => prev.filter(d => d.id !== draft.id))
                        } catch { /* ignore */ }
                        setDraftActionLoading(null)
                      }}
                      disabled={draftActionLoading === draft.id + '_discard'}
                      className="px-3 py-1.5 text-xs font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors disabled:opacity-50"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Summary */}
      {revenueSummary && revenueSummary.invoice_count > 0 && (
        <div className="mb-8">
          <h2 className="font-display text-xl font-bold text-charcoal mb-4">Revenue</h2>
          <div className="bg-white rounded-lg border border-gray-light p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs text-gray-warm">Total Invoiced</p>
                <p className="text-lg font-bold text-charcoal">${revenueSummary.total_invoiced.toLocaleString()}</p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Collected</p>
                <p className="text-lg font-bold text-teal">${revenueSummary.total_paid.toLocaleString()}</p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Outstanding</p>
                <p className="text-lg font-bold text-charcoal">${revenueSummary.total_outstanding.toLocaleString()}</p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Overdue</p>
                <p className={`text-lg font-bold ${revenueSummary.total_overdue > 0 ? 'text-red-soft' : 'text-charcoal'}`}>
                  ${revenueSummary.total_overdue.toLocaleString()}
                  {revenueSummary.total_overdue > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-2 h-2 rounded-full bg-red-soft" />
                  )}
                </p>
              </div>
              <div className="w-px h-8 bg-gray-light hidden sm:block" />
              <div>
                <p className="text-xs text-gray-warm">Invoices</p>
                <p className="text-lg font-bold text-charcoal">{revenueSummary.invoice_count}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Engagement Follow-Up Queue */}
      {pipelineFollowUps.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-charcoal flex items-center gap-2">
              Pipeline Follow-Ups
              <span className="bg-gold text-charcoal text-xs font-bold px-2 py-0.5 rounded-full">{pipelineFollowUps.length}</span>
              {pipelineFollowUpOverdue > 0 && (
                <span className="bg-red-soft text-white text-xs font-bold px-2 py-0.5 rounded-full">{pipelineFollowUpOverdue} overdue</span>
              )}
            </h2>
            <Link to="/dashboard/pipeline/tasks" className="text-teal text-sm font-semibold hover:underline flex items-center gap-1">
              All Tasks
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
          <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
            <div className="divide-y divide-gray-light">
              {pipelineFollowUps.slice(0, 10).map(item => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const due = item.due_date ? new Date(item.due_date + 'T00:00:00') : null
                const diffDays = due ? Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null

                return (
                  <div key={`${item.source}-${item.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-ivory/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        item.is_overdue ? 'bg-red-soft' :
                        item.priority === 'high' ? 'bg-gold' :
                        'bg-teal'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-charcoal truncate">{item.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-warm">
                          {item.contact?.name && <span>{item.contact.name}</span>}
                          {item.contact?.name && item.company?.name && <span>&middot;</span>}
                          {item.company?.name && <span>{item.company.name}</span>}
                          {item.opportunity && (
                            <>
                              <span>&middot;</span>
                              <span className="text-teal">{item.opportunity.stage.replace(/_/g, ' ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.source === 'task' ? 'bg-teal/10 text-teal' : 'bg-gold/10 text-charcoal'
                      }`}>
                        {item.source === 'task' ? 'Task' : 'Follow-up'}
                      </span>
                      {diffDays !== null && (
                        <span className={`text-xs font-medium whitespace-nowrap ${
                          item.is_overdue ? 'text-red-soft' : diffDays <= 2 ? 'text-gold' : 'text-gray-warm'
                        }`}>
                          {item.is_overdue ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? 'Today' : `${diffDays}d`}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Follow-Up Queue */}
      {followUps.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-charcoal flex items-center gap-2">
              Follow-Up Queue
              <span className="bg-gold text-charcoal text-xs font-bold px-2 py-0.5 rounded-full">{followUps.length}</span>
            </h2>
          </div>
          <div className="space-y-3">
            {followUps.map(fu => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const scheduled = new Date(fu.scheduled_date + 'T00:00:00')
              const diffDays = Math.ceil((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const isOverdue = diffDays < 0
              const isExpanded = expandedFollowUp === fu.id
              const touchpointLabels: Record<string, string> = { '30_day': '30-Day', '60_day': '60-Day', '90_day': '90-Day' }
              const touchpointColors: Record<string, string> = { '30_day': 'bg-blue-100 text-blue-800', '60_day': 'bg-amber/20 text-charcoal', '90_day': 'bg-teal/10 text-teal' }
              const clientEmail = fu.clients?.primary_contact_email || ''

              // Render template variables inline
              const vars: Record<string, string> = {
                contact_name: fu.clients?.primary_contact_name || 'there',
                company_name: fu.clients?.company_name || 'your company',
                partner_name: fu.engagements?.partner_lead || 'George DeVries',
                metric_1_from_diagnostic: '[Key metric 1 — edit before sending]',
                metric_2_from_diagnostic: '[Key metric 2 — edit before sending]',
              }
              const renderTpl = (tpl: string) => {
                let r = tpl
                for (const [k, v] of Object.entries(vars)) r = r.replaceAll(`{${k}}`, v)
                return r
              }
              const renderedSubject = editedSubjects[fu.id] ?? fu.actual_subject ?? renderTpl(fu.subject_template)
              const renderedBody = editedBodies[fu.id] ?? fu.actual_body ?? renderTpl(fu.body_template)

              return (
                <div key={fu.id} className={`bg-white rounded-lg border ${isOverdue ? 'border-red-soft/40' : 'border-gray-light'} overflow-hidden`}>
                  {/* Collapsed header */}
                  <button
                    onClick={() => setExpandedFollowUp(isExpanded ? null : fu.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-ivory/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-charcoal">{fu.clients?.company_name || '—'}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${touchpointColors[fu.touchpoint] || 'bg-gray-light text-charcoal'}`}>
                        {touchpointLabels[fu.touchpoint] || fu.touchpoint}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${isOverdue ? 'text-red-soft' : diffDays <= 3 ? 'text-amber' : 'text-gray-warm'}`}>
                        {isOverdue ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? 'Due today' : `Due in ${diffDays}d`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-warm transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-gray-light px-4 py-4">
                      <div className="mb-3">
                        <label className="text-xs font-semibold text-gray-warm uppercase tracking-wider">Subject</label>
                        <input
                          type="text"
                          value={renderedSubject}
                          onChange={e => setEditedSubjects(prev => ({ ...prev, [fu.id]: e.target.value }))}
                          className="mt-1 w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-gray-warm uppercase tracking-wider">Body</label>
                        <textarea
                          value={renderedBody}
                          onChange={e => setEditedBodies(prev => ({ ...prev, [fu.id]: e.target.value }))}
                          rows={10}
                          className="mt-1 w-full px-3 py-2 border border-gray-light rounded-lg text-sm text-charcoal font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal/30"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={followUpActionLoading === fu.id}
                          onClick={async () => {
                            setFollowUpActionLoading(fu.id)
                            try {
                              await apiPatch(`/api/follow-ups/${fu.id}`, { action: 'send', actual_subject: renderedSubject, actual_body: renderedBody })
                              // Open mailto
                              const mailtoUrl = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(renderedSubject)}&body=${encodeURIComponent(renderedBody)}`
                              window.open(mailtoUrl, '_blank')
                              setFollowUps(prev => prev.filter(f => f.id !== fu.id))
                              setExpandedFollowUp(null)
                            } catch {}
                            setFollowUpActionLoading(null)
                          }}
                          className="px-4 py-2 bg-teal text-white text-sm font-semibold rounded-lg hover:bg-teal/90 disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                          Send
                        </button>
                        <button
                          disabled={followUpActionLoading === fu.id}
                          onClick={async () => {
                            setFollowUpActionLoading(fu.id)
                            try {
                              await apiPatch(`/api/follow-ups/${fu.id}`, { action: 'snooze', snooze_days: 7 })
                              setFollowUps(prev => prev.filter(f => f.id !== fu.id))
                              setExpandedFollowUp(null)
                            } catch {}
                            setFollowUpActionLoading(null)
                          }}
                          className="px-4 py-2 bg-gray-light text-charcoal text-sm font-semibold rounded-lg hover:bg-gray-light/80 disabled:opacity-50"
                        >
                          Snooze 7 Days
                        </button>
                        <button
                          disabled={followUpActionLoading === fu.id}
                          onClick={async () => {
                            if (!confirm('Skip this touchpoint? It won\'t appear again.')) return
                            setFollowUpActionLoading(fu.id)
                            try {
                              await apiPatch(`/api/follow-ups/${fu.id}`, { action: 'skip' })
                              setFollowUps(prev => prev.filter(f => f.id !== fu.id))
                              setExpandedFollowUp(null)
                            } catch {}
                            setFollowUpActionLoading(null)
                          }}
                          className="px-4 py-2 text-red-soft text-sm font-semibold hover:bg-red-soft/10 rounded-lg disabled:opacity-50"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Engagements */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Engagements</h1>
        <p className="text-gray-warm text-sm mt-1">All active and past engagements</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg">
          <p className="text-red-soft text-sm">{error}</p>
        </div>
      )}

      {engagements.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
          <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-lg font-semibold text-charcoal mb-1">No engagements yet</p>
          <p className="text-gray-warm text-sm">New intakes will appear here automatically.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-light bg-ivory/50">
                  <th className="text-left px-4 py-3 font-semibold text-charcoal cursor-pointer select-none" onClick={() => toggleSort('company')}>
                    Client<SortIcon field="company" />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-charcoal cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    Status<SortIcon field="status" />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-charcoal cursor-pointer select-none" onClick={() => toggleSort('phase')}>
                    Phase<SortIcon field="phase" />
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-charcoal hidden md:table-cell">Days Left</th>
                  <th className="text-right px-4 py-3 font-semibold text-charcoal cursor-pointer select-none" onClick={() => toggleSort('fee')}>
                    Fee<SortIcon field="fee" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(eng => (
                  <tr
                    key={eng.id}
                    onClick={() => navigate(`/dashboard/engagement/${eng.id}`)}
                    className="border-b border-gray-light last:border-0 hover:bg-ivory/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-charcoal">{eng.clients?.company_name || '—'}</p>
                      <p className="text-gray-warm text-xs">{eng.clients?.primary_contact_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[eng.status] || 'bg-gray-light text-charcoal'}`}>
                        {statusLabel(eng.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-charcoal">{eng.phase || '—'}</td>
                    <td className="px-4 py-3 text-charcoal hidden md:table-cell">{daysRemaining(eng.target_end_date)}</td>
                    <td className="px-4 py-3 text-right text-charcoal font-medium">
                      {eng.fee ? `$${eng.fee.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}


// ---------------------------------------------------------------------------
// Cockpit Task Row
// ---------------------------------------------------------------------------

function CockpitTaskRow({ task, onDone, onSnooze, formatDate, navigate, variant }: {
  task: CockpitTask
  onDone: () => void
  onSnooze: () => void
  formatDate: (d: string | null) => string
  navigate: (path: string) => void
  variant: 'overdue' | 'today' | 'future'
}) {
  const typeLabel = COCKPIT_TYPE_LABELS[task.task_type] || task.task_type
  const typeBadge = COCKPIT_TYPE_BADGE[task.task_type] || 'bg-gray-100 text-gray-700'

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group ${variant === 'overdue' ? 'border-l-3 border-l-crimson' : ''}`}>
      {/* Type badge */}
      <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${typeBadge}`}>
        {typeLabel}
      </span>

      {/* High priority indicator */}
      {task.priority === 'high' && (
        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-crimson" title="High priority" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-charcoal truncate block">{task.title}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          {task.pipeline_companies && (
            <button
              onClick={() => navigate('/dashboard/pipeline/companies')}
              className="text-xs text-gray-warm hover:text-teal truncate transition-colors"
            >
              {task.pipeline_companies.name}
            </button>
          )}
          {task.pipeline_contacts && (
            <>
              {task.pipeline_companies && <span className="text-xs text-gray-warm">&middot;</span>}
              <span className="text-xs text-gray-warm truncate">{task.pipeline_contacts.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Due date */}
      {variant === 'overdue' && task.due_date && (
        <span className="flex-shrink-0 text-xs font-medium text-crimson">
          {formatDate(task.due_date)}
        </span>
      )}

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onDone} className="p-1 text-gray-warm hover:text-teal transition-colors" title="Done">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </button>
        <button onClick={onSnooze} className="p-1 text-gray-warm hover:text-gold transition-colors" title="Snooze to tomorrow">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
