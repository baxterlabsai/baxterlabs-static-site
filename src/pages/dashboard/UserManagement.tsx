import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiDelete } from '../../lib/api'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import SEO from '../../components/SEO'

// ---------- Types ----------

interface User {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  last_sign_in_at: string | null
}

// ---------- Helpers ----------

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// ---------- Skeleton ----------

function TableSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
      {/* Header skeleton */}
      <div className="border-b border-gray-light bg-ivory/50 px-4 py-3 flex gap-6">
        {[140, 180, 70, 100, 60].map((w, i) => (
          <div key={i} className="h-4 bg-gray-light rounded animate-pulse" style={{ width: w }} />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: 3 }).map((_, row) => (
        <div key={row} className="border-b border-gray-light last:border-0 px-4 py-4 flex gap-6 items-center">
          <div className="h-4 bg-gray-light rounded animate-pulse w-32" />
          <div className="h-4 bg-gray-light rounded animate-pulse w-44" />
          <div className="h-4 bg-gray-light rounded animate-pulse w-16" />
          <div className="h-4 bg-gray-light rounded animate-pulse w-20" />
          <div className="h-4 bg-gray-light rounded animate-pulse w-16" />
        </div>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-4 md:hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-light p-4 space-y-3">
          <div className="h-5 bg-gray-light rounded animate-pulse w-36" />
          <div className="h-3 bg-gray-light rounded animate-pulse w-48" />
          <div className="flex gap-3">
            <div className="h-3 bg-gray-light rounded animate-pulse w-16" />
            <div className="h-3 bg-gray-light rounded animate-pulse w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------- Main component ----------

export default function UserManagement() {
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Invite modal
  const [showInvite, setShowInvite] = useState(false)
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('partner')
  const [inviting, setInviting] = useState(false)

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<User | null>(null)
  const [removing, setRemoving] = useState(false)

  // Get current user
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setCurrentUserId(session?.user?.id ?? null)
    })()
  }, [])

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiGet<User[]>('/api/users')
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Invite submit
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      await apiPost('/api/users/invite', {
        email: inviteEmail,
        full_name: inviteFullName,
        role: inviteRole,
      })
      toast('Invitation sent to ' + inviteEmail, 'success')
      setShowInvite(false)
      setInviteFullName('')
      setInviteEmail('')
      setInviteRole('partner')
      loadUsers()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send invite', 'error')
    } finally {
      setInviting(false)
    }
  }

  // Remove submit
  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await apiDelete('/api/users/' + removeTarget.id)
      toast('User removed', 'success')
      setRemoveTarget(null)
      loadUsers()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to remove user', 'error')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div>
      <SEO title="Team Management | BaxterLabs Advisory" description="Manage team members for the BaxterLabs Advisory dashboard." />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-charcoal">Team Management</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-crimson text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-crimson/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Invite Team Member
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-soft/10 border border-red-soft/30 rounded-lg">
          <p className="text-red-soft text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <>
          <div className="hidden md:block">
            <TableSkeleton />
          </div>
          <CardSkeleton />
        </>
      )}

      {/* Empty */}
      {!loading && !error && users.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-light p-12 text-center">
          <svg className="mx-auto w-12 h-12 text-gray-warm mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-lg font-semibold text-charcoal mb-1">No team members yet</p>
          <p className="text-gray-warm text-sm">Invite your first team member to get started.</p>
        </div>
      )}

      {/* Table — desktop */}
      {!loading && users.length > 0 && (
        <div className="hidden md:block">
          <div className="bg-white rounded-lg border border-gray-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-light bg-ivory/50">
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Last Sign In</th>
                    <th className="text-left px-4 py-3 font-semibold text-charcoal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-gray-light last:border-0 hover:bg-ivory/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-charcoal">{user.full_name || '--'}</td>
                      <td className="px-4 py-3 text-charcoal/70 text-sm">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-teal/10 text-teal px-2 py-0.5 rounded text-xs font-semibold uppercase">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-charcoal/70 text-sm">{timeAgo(user.last_sign_in_at)}</td>
                      <td className="px-4 py-3">
                        {user.id !== currentUserId && (
                          <button
                            onClick={() => setRemoveTarget(user)}
                            className="text-red-soft text-sm hover:underline"
                          >
                            Remove
                          </button>
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

      {/* Cards — mobile */}
      {!loading && users.length > 0 && (
        <div className="md:hidden space-y-4">
          {users.map(user => (
            <div key={user.id} className="bg-white rounded-lg border border-gray-light p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-charcoal truncate">{user.full_name || '--'}</h3>
                  <p className="text-charcoal/70 text-sm mt-0.5">{user.email}</p>
                </div>
                <span className="inline-block bg-teal/10 text-teal px-2 py-0.5 rounded text-xs font-semibold uppercase flex-shrink-0">
                  {user.role}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-charcoal/70 text-xs">Last sign in: {timeAgo(user.last_sign_in_at)}</span>
                {user.id !== currentUserId && (
                  <button
                    onClick={() => setRemoveTarget(user)}
                    className="text-red-soft text-sm hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Invite Modal ---------- */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-lg shadow-lg">
            <form onSubmit={handleInvite}>
              <div className="p-6">
                <h2 className="font-display text-xl font-bold text-charcoal mb-6">Invite Team Member</h2>

                {/* Full Name */}
                <div className="mb-4">
                  <label htmlFor="invite-name" className="block text-sm font-medium text-charcoal mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="invite-name"
                    type="text"
                    required
                    value={inviteFullName}
                    onChange={e => setInviteFullName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-light rounded-lg text-sm text-charcoal placeholder:text-gray-warm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                    placeholder="Jane Smith"
                  />
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label htmlFor="invite-email" className="block text-sm font-medium text-charcoal mb-1.5">
                    Email
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-light rounded-lg text-sm text-charcoal placeholder:text-gray-warm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                    placeholder="jane@example.com"
                  />
                </div>

                {/* Role */}
                <div className="mb-6">
                  <label htmlFor="invite-role" className="block text-sm font-medium text-charcoal mb-1.5">
                    Role
                  </label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-light rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-colors"
                  >
                    <option value="partner">Partner</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-light px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowInvite(false)
                    setInviteFullName('')
                    setInviteEmail('')
                    setInviteRole('partner')
                  }}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-charcoal hover:bg-ivory transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="bg-crimson text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Remove Confirmation ---------- */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-lg shadow-lg p-6">
            <h3 className="font-display text-lg font-bold text-charcoal mb-2">Remove Team Member</h3>
            <p className="text-charcoal/70 text-sm mb-6">
              Remove <span className="font-semibold text-charcoal">{removeTarget.full_name}</span> from the team? They will lose access to the dashboard.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-charcoal hover:bg-ivory transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={removing}
                className="bg-crimson text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
