import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { toast } = useToast()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('partner')
  const [editMode, setEditMode] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)

  // Load session data when modal opens
  useEffect(() => {
    if (!isOpen) {
      setEditMode(false)
      return
    }

    setSessionLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata || {}
        setFullName(meta.full_name || session.user.email || '')
        setEmail(session.user.email || '')
        setRole(meta.role || 'partner')
        setEditedName(meta.full_name || '')
      }
      setSessionLoading(false)
    })
  }, [isOpen])

  function handleClose() {
    setEditMode(false)
    onClose()
  }

  function handleEdit() {
    setEditedName(fullName === email ? '' : fullName)
    setEditMode(true)
  }

  function handleCancelEdit() {
    setEditMode(false)
    setEditedName(fullName === email ? '' : fullName)
  }

  async function handleSave() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: editedName.trim() },
      })

      if (error) {
        toast(error.message, 'error')
        setLoading(false)
        return
      }

      toast('Profile updated', 'success')
      setFullName(editedName.trim() || email)
      setEditMode(false)
    } catch {
      toast('An unexpected error occurred. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-display text-xl font-bold text-charcoal">Profile</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-charcoal/50 hover:text-charcoal transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Separator */}
        <div className="border-b border-gray-light" />

        {/* Body */}
        <div className="px-6 py-5">
          {sessionLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-3 border-crimson border-t-transparent rounded-full" />
            </div>
          ) : editMode ? (
            /* Edit mode */
            <div className="space-y-4">
              {/* Full Name — editable */}
              <div>
                <label htmlFor="profile-name" className="block text-sm font-semibold text-charcoal mb-1.5">
                  Full Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal text-sm"
                />
              </div>

              {/* Email — read-only */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-ivory text-charcoal/50 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-charcoal/40 mt-1">Email cannot be changed</p>
              </div>

              {/* Role — read-only badge */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">
                  Role
                </label>
                <span className="inline-block bg-teal/10 text-teal px-2 py-0.5 rounded text-xs font-semibold uppercase">
                  {role}
                </span>
              </div>

              {/* Edit mode actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-crimson rounded-lg hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Saving...
                    </span>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Full Name</label>
                <p className="text-sm text-charcoal">{fullName}</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Email</label>
                <p className="text-sm text-charcoal">{email}</p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1">Role</label>
                <span className="inline-block bg-teal/10 text-teal px-2 py-0.5 rounded text-xs font-semibold uppercase">
                  {role}
                </span>
              </div>

              {/* Edit button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleEdit}
                  className="text-teal text-sm font-semibold underline hover:text-teal/80 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
