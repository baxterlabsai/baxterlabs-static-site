import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Contact {
  id: string
  name: string
  title: string | null
  company_id: string | null
}

interface Opportunity {
  id: string
  title: string
  stage: string
  pipeline_companies: { id: string; name: string } | null
}

interface Task {
  id: string
  contact_id: string | null
  opportunity_id: string | null
  title: string
  due_date: string | null
  priority: string
  status: string
  completed_at: string | null
  assigned_to: string | null
  created_at: string
  created_by: string | null
  pipeline_contacts: { id: string; name: string } | null
  pipeline_opportunities: { id: string; title: string } | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITIES = [
  { key: 'high', label: 'High', dot: 'bg-crimson', text: 'text-crimson' },
  { key: 'normal', label: 'Normal', dot: 'bg-gold', text: 'text-gold' },
  { key: 'low', label: 'Low', dot: 'bg-gray-warm', text: 'text-gray-warm' },
]

const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map(p => [p.key, p]))

const STATUSES = [
  { key: 'pending', label: 'Pending' },
  { key: 'complete', label: 'Complete' },
  { key: 'skipped', label: 'Skipped' },
]

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function endOfWeek(): string {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (7 - day))
  return d.toISOString().split('T')[0]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}


// ---------------------------------------------------------------------------
// Grouping helper
// ---------------------------------------------------------------------------

interface TaskGroup {
  key: string
  label: string
  headerClass: string
  dotClass: string
  tasks: Task[]
  defaultCollapsed: boolean
}

function groupTasks(tasks: Task[]): TaskGroup[] {
  const today = todayStr()
  const weekEnd = endOfWeek()

  const overdue: Task[] = []
  const dueToday: Task[] = []
  const thisWeek: Task[] = []
  const later: Task[] = []
  const noDate: Task[] = []
  const completed: Task[] = []

  for (const t of tasks) {
    if (t.status === 'complete' || t.status === 'skipped') {
      completed.push(t)
    } else if (!t.due_date) {
      noDate.push(t)
    } else if (t.due_date < today) {
      overdue.push(t)
    } else if (t.due_date === today) {
      dueToday.push(t)
    } else if (t.due_date <= weekEnd) {
      thisWeek.push(t)
    } else {
      later.push(t)
    }
  }

  const groups: TaskGroup[] = []
  if (overdue.length)   groups.push({ key: 'overdue', label: 'Overdue', headerClass: 'text-crimson', dotClass: 'bg-crimson', tasks: overdue, defaultCollapsed: false })
  if (dueToday.length)  groups.push({ key: 'today', label: 'Due Today', headerClass: 'text-gold', dotClass: 'bg-gold', tasks: dueToday, defaultCollapsed: false })
  if (thisWeek.length)  groups.push({ key: 'week', label: 'This Week', headerClass: 'text-charcoal', dotClass: 'bg-teal', tasks: thisWeek, defaultCollapsed: false })
  if (later.length)     groups.push({ key: 'later', label: 'Later', headerClass: 'text-charcoal', dotClass: 'bg-gray-warm', tasks: later, defaultCollapsed: false })
  if (noDate.length)    groups.push({ key: 'nodate', label: 'No Due Date', headerClass: 'text-gray-warm', dotClass: 'bg-gray-warm', tasks: noDate, defaultCollapsed: false })
  if (completed.length) groups.push({ key: 'completed', label: 'Completed', headerClass: 'text-gray-warm', dotClass: 'bg-gray-warm', tasks: completed, defaultCollapsed: true })

  return groups
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PipelineTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'completed'>('active')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [deleteTask, setDeleteTask] = useState<Task | null>(null)

  // Collapsed sections
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['completed']))

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [taskData, contactData, oppData] = await Promise.all([
        apiGet<{ tasks: Task[] }>('/api/pipeline/tasks'),
        apiGet<{ contacts: Contact[] }>('/api/pipeline/contacts'),
        apiGet<{ opportunities: Opportunity[] }>('/api/pipeline/opportunities'),
      ])
      setTasks(taskData.tasks)
      setContacts(contactData.contacts)
      setOpportunities(oppData.opportunities)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  // Client-side filtering
  const filtered = tasks.filter(t => {
    if (statusFilter === 'active' && (t.status === 'complete' || t.status === 'skipped')) return false
    if (statusFilter === 'completed' && t.status === 'pending') return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!t.title.toLowerCase().includes(q) && !(t.pipeline_contacts?.name || '').toLowerCase().includes(q) && !(t.pipeline_opportunities?.title || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const groups = groupTasks(filtered)

  function toggleCollapse(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Quick-complete: optimistic toggle
  async function toggleComplete(task: Task) {
    const newStatus = task.status === 'pending' ? 'complete' : 'pending'
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completed_at: newStatus === 'complete' ? new Date().toISOString() : null } : t))
    try {
      await apiPut(`/api/pipeline/tasks/${task.id}`, { status: newStatus })
    } catch {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === task.id ? task : t))
    }
  }

  async function handleAddTask(data: Record<string, unknown>) {
    try {
      const created = await apiPost<Task>('/api/pipeline/tasks', data)
      // Re-fetch to get joined relations
      const refreshed = await apiGet<{ tasks: Task[] }>('/api/pipeline/tasks')
      setTasks(refreshed.tasks)
      setShowAddModal(false)
      return created
    } catch (err: unknown) {
      throw err
    }
  }

  async function handleUpdateTask(taskId: string, data: Record<string, unknown>) {
    try {
      await apiPut(`/api/pipeline/tasks/${taskId}`, data)
      const refreshed = await apiGet<{ tasks: Task[] }>('/api/pipeline/tasks')
      setTasks(refreshed.tasks)
      setEditTask(null)
    } catch (err: unknown) {
      throw err
    }
  }

  async function handleDeleteTask(taskId: string) {
    try {
      await apiDelete(`/api/pipeline/tasks/${taskId}`)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setDeleteTask(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }

  // Count stats
  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const overdueCount = tasks.filter(t => t.status === 'pending' && t.due_date && t.due_date < todayStr()).length
  const dueTodayCount = tasks.filter(t => t.status === 'pending' && t.due_date === todayStr()).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-teal" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">Tasks</h1>
          <p className="text-gray-warm text-sm mt-1">
            {pendingCount} active{overdueCount > 0 && <span className="text-crimson font-semibold"> &middot; {overdueCount} overdue</span>}
            {dueTodayCount > 0 && <span className="text-gold font-semibold"> &middot; {dueTodayCount} due today</span>}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-teal text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal/90 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Task
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-crimson/10 border border-crimson/20 rounded-lg text-crimson text-sm">{error}</div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Status pills */}
        <div className="flex rounded-lg border border-gray-light overflow-hidden">
          {(['active', 'all', 'completed'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${statusFilter === s ? 'bg-teal text-white' : 'bg-white text-charcoal hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Priority pills */}
        <div className="flex rounded-lg border border-gray-light overflow-hidden">
          <button onClick={() => setPriorityFilter('all')} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${priorityFilter === 'all' ? 'bg-teal text-white' : 'bg-white text-charcoal hover:bg-gray-50'}`}>
            All
          </button>
          {PRIORITIES.map(p => (
            <button key={p.key} onClick={() => setPriorityFilter(p.key)} className={`px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${priorityFilter === p.key ? 'bg-teal text-white' : 'bg-white text-charcoal hover:bg-gray-50'}`}>
              <span className={`w-2 h-2 rounded-full ${p.dot}`} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-warm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 border border-gray-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
        </div>
      </div>

      {/* Task groups */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
          <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-semibold text-charcoal mb-1">No tasks found</p>
          <p className="text-gray-warm text-sm">{tasks.length === 0 ? 'Create your first task to get started.' : 'Try adjusting your filters.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <div key={group.key} className="bg-white rounded-lg border border-gray-light overflow-hidden">
              {/* Group header */}
              <button onClick={() => toggleCollapse(group.key)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <svg className={`w-4 h-4 text-gray-warm transition-transform ${collapsed.has(group.key) ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <span className={`w-2 h-2 rounded-full ${group.dotClass}`} />
                <span className={`text-sm font-semibold ${group.headerClass}`}>{group.label}</span>
                <span className="text-xs text-gray-warm">{group.tasks.length}</span>
              </button>

              {/* Task items */}
              {!collapsed.has(group.key) && (
                <div className="border-t border-gray-light divide-y divide-gray-light">
                  {group.tasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleComplete(task)}
                      onEdit={() => setEditTask(task)}
                      onDelete={() => setDeleteTask(task)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <TaskFormModal
          title="Add Task"
          contacts={contacts}
          opportunities={opportunities}
          onSave={handleAddTask}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Task Modal */}
      {editTask && (
        <TaskFormModal
          title="Edit Task"
          task={editTask}
          contacts={contacts}
          opportunities={opportunities}
          showStatus
          onSave={data => handleUpdateTask(editTask.id, data)}
          onClose={() => setEditTask(null)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTask(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-charcoal mb-2">Delete Task</h3>
            <p className="text-gray-warm text-sm mb-6">Are you sure you want to permanently delete <span className="font-semibold text-charcoal">"{deleteTask.title}"</span>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTask(null)} className="px-4 py-2 border border-gray-light rounded-lg text-sm font-semibold text-charcoal hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => handleDeleteTask(deleteTask.id)} className="px-4 py-2 bg-crimson text-white rounded-lg text-sm font-semibold hover:bg-crimson/90 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// TaskRow Component
// ---------------------------------------------------------------------------

function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const isComplete = task.status === 'complete' || task.status === 'skipped'
  const priority = PRIORITY_MAP[task.priority] || PRIORITY_MAP['normal']
  const isOverdue = !isComplete && task.due_date && task.due_date < todayStr()

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
      {/* Checkbox */}
      <button onClick={onToggle} className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isComplete ? 'bg-teal border-teal' : 'border-gray-warm hover:border-teal'}`}>
        {isComplete && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </button>

      {/* Priority dot */}
      <span className={`flex-shrink-0 w-2 h-2 rounded-full ${priority.dot}`} title={priority.label} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isComplete ? 'line-through text-gray-warm' : 'text-charcoal'}`}>{task.title}</span>
          {task.status === 'skipped' && (
            <span className="text-xs bg-gray-light text-gray-warm px-1.5 py-0.5 rounded">Skipped</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {task.pipeline_contacts && (
            <span className="text-xs text-gray-warm truncate">{task.pipeline_contacts.name}</span>
          )}
          {task.pipeline_contacts && task.pipeline_opportunities && (
            <span className="text-xs text-gray-warm">&middot;</span>
          )}
          {task.pipeline_opportunities && (
            <span className="text-xs text-teal truncate">{task.pipeline_opportunities.title}</span>
          )}
        </div>
      </div>

      {/* Due date */}
      {task.due_date && (
        <span className={`flex-shrink-0 text-xs font-medium ${isOverdue ? 'text-crimson' : isComplete ? 'text-gray-warm' : 'text-charcoal'}`}>
          {formatDate(task.due_date)}
        </span>
      )}

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 text-gray-warm hover:text-teal transition-colors" title="Edit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
          </svg>
        </button>
        <button onClick={onDelete} className="p-1 text-gray-warm hover:text-crimson transition-colors" title="Delete">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TaskFormModal Component
// ---------------------------------------------------------------------------

function TaskFormModal({ title, task, contacts, opportunities, showStatus, onSave, onClose }: {
  title: string
  task?: Task
  contacts: Contact[]
  opportunities: Opportunity[]
  showStatus?: boolean
  onSave: (data: Record<string, unknown>) => Promise<unknown>
  onClose: () => void
}) {
  const [formTitle, setFormTitle] = useState(task?.title || '')
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [priority, setPriority] = useState(task?.priority || 'normal')
  const [status, setStatus] = useState(task?.status || 'pending')
  const [contactId, setContactId] = useState(task?.contact_id || '')
  const [opportunityId, setOpportunityId] = useState(task?.opportunity_id || '')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || '')
  const [contactSearch, setContactSearch] = useState(task?.pipeline_contacts?.name || '')
  const [showContactDropdown, setShowContactDropdown] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase())).slice(0, 8)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim()) { setFormError('Title is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const data: Record<string, unknown> = { title: formTitle.trim() }
      if (dueDate) data.due_date = dueDate
      data.priority = priority
      if (contactId) data.contact_id = contactId
      if (opportunityId) data.opportunity_id = opportunityId
      if (assignedTo.trim()) data.assigned_to = assignedTo.trim()
      if (showStatus) data.status = status
      // For edit: clear nullable fields explicitly
      if (task) {
        if (!contactId && task.contact_id) data.contact_id = null
        if (!opportunityId && task.opportunity_id) data.opportunity_id = null
        if (!dueDate && task.due_date) data.due_date = null
        if (!assignedTo.trim() && task.assigned_to) data.assigned_to = null
      }
      await onSave(data)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-light">
          <h2 className="font-display text-lg font-bold text-charcoal">{title}</h2>
          <button onClick={onClose} className="text-gray-warm hover:text-charcoal transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-crimson/10 border border-crimson/20 rounded-lg text-crimson text-sm">{formError}</div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Title *</label>
            <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Follow up with..." className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" autoFocus />
          </div>

          {/* Due date + Priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">Priority</label>
              <div className="flex rounded-lg border border-gray-light overflow-hidden">
                {PRIORITIES.map(p => (
                  <button key={p.key} type="button" onClick={() => setPriority(p.key)} className={`flex-1 px-2 py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${priority === p.key ? 'bg-teal text-white' : 'bg-white text-charcoal hover:bg-gray-50'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priority === p.key ? 'bg-white' : p.dot}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status (edit only) */}
          {showStatus && (
            <div>
              <label className="block text-sm font-semibold text-charcoal mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
                {STATUSES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Contact typeahead */}
          <div className="relative">
            <label className="block text-sm font-semibold text-charcoal mb-1">Contact</label>
            <input
              type="text"
              value={contactSearch}
              onChange={e => { setContactSearch(e.target.value); setContactId(''); setShowContactDropdown(true) }}
              onFocus={() => setShowContactDropdown(true)}
              onBlur={() => setTimeout(() => setShowContactDropdown(false), 200)}
              placeholder="Search contacts..."
              className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
            {contactId && (
              <button type="button" onClick={() => { setContactId(''); setContactSearch('') }} className="absolute right-2 top-8 text-gray-warm hover:text-charcoal">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {showContactDropdown && contactSearch && !contactId && filteredContacts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-light rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredContacts.map(c => (
                  <button key={c.id} type="button" onMouseDown={() => { setContactId(c.id); setContactSearch(c.name); setShowContactDropdown(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors">
                    <span className="font-medium text-charcoal">{c.name}</span>
                    {c.title && <span className="text-gray-warm ml-1">— {c.title}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Opportunity */}
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Opportunity</label>
            <select value={opportunityId} onChange={e => setOpportunityId(e.target.value)} className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal">
              <option value="">None</option>
              {opportunities.map(o => (
                <option key={o.id} value={o.id}>{o.title}{o.pipeline_companies ? ` (${o.pipeline_companies.name})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Assigned to */}
          <div>
            <label className="block text-sm font-semibold text-charcoal mb-1">Assigned To</label>
            <input type="text" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Name or email" className="w-full px-3 py-2 border border-gray-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-light rounded-lg text-sm font-semibold text-charcoal hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-teal text-white rounded-lg text-sm font-semibold hover:bg-teal/90 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
