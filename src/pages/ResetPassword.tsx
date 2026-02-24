import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { isPasswordValid } from '../utils/passwordValidation'
import PasswordRequirements from '../components/PasswordRequirements'
import PasswordInput from '../components/PasswordInput'

export default function ResetPassword() {
  const [ready, setReady] = useState(false)
  const [sessionError, setSessionError] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // Also check if session already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    // Timeout: if not ready after 5 seconds, show error
    const timeout = setTimeout(() => {
      setReady((prev) => {
        if (!prev) setSessionError(true)
        return prev
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isPasswordValid(newPassword)) return

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setShowSuccess(true)
    setLoading(false)
  }

  const handleContinueToSignIn = async () => {
    await supabase.auth.signOut()
    navigate('/dashboard/login')
  }

  // Determine which state to show
  const showPasswordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const showPasswordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-crimson">BaxterLabs</h1>
          <p className="text-gold text-sm mt-1">Advisory Dashboard</p>
        </div>

        {/* Success state */}
        {showSuccess ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-light p-8 text-center">
            {/* Green checkmark icon */}
            <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14">
                <circle cx="24" cy="24" r="24" fill="#005454" opacity="0.12" />
                <circle cx="24" cy="24" r="18" fill="#005454" opacity="0.2" />
                <path
                  d="M16 24.5L21.5 30L32 19"
                  stroke="#005454"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="font-display text-xl font-bold text-charcoal mb-2">Password Reset Successfully</h2>
            <p className="text-sm text-charcoal/70 mb-6">
              Your password has been updated. You can now sign in with your new password.
            </p>

            <button
              onClick={handleContinueToSignIn}
              className="w-full h-12 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90 flex items-center justify-center"
            >
              Continue to Sign In
            </button>
          </div>
        ) : sessionError ? (
          /* Error state */
          <div className="bg-white rounded-lg shadow-sm border border-gray-light p-8 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-14 h-14">
                <circle cx="24" cy="24" r="24" fill="#66151C" opacity="0.12" />
                <circle cx="24" cy="24" r="18" fill="#66151C" opacity="0.2" />
                <path
                  d="M18 18L30 30M30 18L18 30"
                  stroke="#66151C"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h2 className="font-display text-xl font-bold text-charcoal mb-2">Invalid or Expired Reset Link</h2>
            <p className="text-sm text-charcoal/70 mb-6">
              This link may have expired or already been used.
            </p>

            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full h-12 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90 flex items-center justify-center mb-4"
            >
              Request a New Reset Link
            </button>

            <Link
              to="/dashboard/login"
              className="text-teal hover:underline text-sm"
            >
              Back to Sign In
            </Link>
          </div>
        ) : !ready ? (
          /* Loading state */
          <div className="bg-white rounded-lg shadow-sm border border-gray-light p-8 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 animate-spin text-teal" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm text-charcoal/70">Validating your reset link...</p>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-light p-8">
            <h2 className="font-display text-xl font-bold text-charcoal mb-6 text-center">
              Set New Password
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-soft/10 border border-red-soft/30 rounded-lg">
                <p className="text-red-soft text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <PasswordInput
                  label="New Password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Enter new password"
                  id="new-password"
                />
                <div className="mt-3">
                  <PasswordRequirements password={newPassword} />
                </div>
              </div>

              <div>
                <PasswordInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm new password"
                  id="confirm-password"
                />
                {showPasswordsMatch && (
                  <p className="mt-1.5 text-xs text-teal flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                      <path d="M4 8.5L7 11.5L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Passwords match
                  </p>
                )}
                {showPasswordsMismatch && (
                  <p className="mt-1.5 text-xs text-red-soft flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                      <path d="M5 5L11 11M11 5L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Passwords do not match
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid(newPassword) || newPassword !== confirmPassword}
              className="mt-6 w-full h-12 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
