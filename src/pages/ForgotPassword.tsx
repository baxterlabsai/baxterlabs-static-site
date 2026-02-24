import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    // Always show success regardless of error (prevent email enumeration)
    if (error) {
      console.error('Reset password error:', error.message)
    }

    setShowSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-crimson">BaxterLabs</h1>
          <p className="text-gold text-sm mt-1">Advisory Dashboard</p>
        </div>

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

            <h2 className="font-display text-xl font-bold text-charcoal mb-2">Check Your Email</h2>
            <p className="text-sm text-charcoal/70 mb-4">
              If an account with <span className="font-semibold">{email}</span> exists, we've sent password reset instructions.
            </p>
            <p className="text-xs text-charcoal/50 mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>

            <Link
              to="/dashboard/login"
              className="text-teal hover:underline text-sm font-semibold"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-light p-8">
            <h2 className="font-display text-xl font-bold text-charcoal mb-2 text-center">
              Reset Your Password
            </h2>
            <p className="text-sm text-charcoal/60 text-center mb-6">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-charcoal mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-light bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal text-sm"
                  placeholder="george@baxterlabs.ai"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full h-12 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <div className="mt-4 text-center">
              <Link
                to="/dashboard/login"
                className="text-teal hover:underline text-sm"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
