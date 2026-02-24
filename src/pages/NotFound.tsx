import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      <header className="bg-crimson">
        <div className="flex items-center justify-center py-5">
          <Link to="/">
            <img src="/images/baxterlabs-logo-white-text.png" alt="BaxterLabs Advisory" className="h-10" />
          </Link>
        </div>
      </header>
      <div className="h-[3px] bg-gold" />

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-6xl font-display font-bold text-crimson mb-4">404</p>
          <h1 className="font-display text-2xl font-bold text-charcoal mb-3">Page Not Found</h1>
          <p className="text-gray-warm text-sm mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-crimson text-white font-semibold rounded-lg hover:bg-crimson/90 text-sm"
            >
              Back to Home
            </Link>
            <Link
              to="/dashboard"
              className="px-6 py-3 bg-teal text-white font-semibold rounded-lg hover:bg-teal/90 text-sm"
            >
              Partner Dashboard
            </Link>
          </div>
        </div>
      </div>

      <footer className="bg-teal py-6 px-4 text-center">
        <p className="text-white/70 text-xs">&copy; 2026 BaxterLabs Advisory</p>
      </footer>
    </div>
  )
}
