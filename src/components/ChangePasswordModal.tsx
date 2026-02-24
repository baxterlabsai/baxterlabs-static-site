import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { isPasswordValid } from '../utils/passwordValidation'
import PasswordRequirements from './PasswordRequirements'
import PasswordInput from './PasswordInput'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { toast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset all form state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      setLoading(false)
    }
  }, [isOpen])

  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword
  const passwordsMismatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword

  const isDisabled =
    !currentPassword ||
    !newPassword ||
    !confirmPassword ||
    !isPasswordValid(newPassword) ||
    newPassword !== confirmPassword ||
    loading

  function handleClose() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setLoading(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Step 1: Get current session email
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) {
        setError('No active session found. Please log in again.')
        setLoading(false)
        return
      }

      // Step 2: Re-authenticate to verify current password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      })
      if (authError) {
        setError('Current password is incorrect')
        setLoading(false)
        return
      }

      // Step 3: Validate
      if (!isPasswordValid(newPassword)) {
        setLoading(false)
        return
      }

      if (newPassword === currentPassword) {
        setError('New password must be different from current password')
        setLoading(false)
        return
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      // Step 4: Update via Supabase
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      // Step 5: Success
      toast('Password changed successfully', 'success')
      handleClose()
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="font-display text-xl font-bold text-charcoal">Change Password</h2>
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
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Enter your current password"
            id="current-password"
          />

          <div className="space-y-3">
            <PasswordInput
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="Enter a new password"
              id="new-password"
            />
            <PasswordRequirements password={newPassword} />
          </div>

          <div className="space-y-2">
            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter your new password"
              id="confirm-password"
            />
            {passwordsMatch && (
              <p className="flex items-center gap-1 text-xs text-teal font-medium">
                <span>{'\u2713'}</span>
                <span>Passwords match</span>
              </p>
            )}
            {passwordsMismatch && (
              <p className="text-xs text-crimson font-medium">
                Passwords do not match
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-soft/10 border border-red-soft/30 rounded-lg px-4 py-3">
              <p className="text-sm text-crimson">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-charcoal border border-gray-light rounded-lg hover:bg-ivory transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDisabled}
              className="px-4 py-2 text-sm font-semibold text-white bg-crimson rounded-lg hover:bg-crimson/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
