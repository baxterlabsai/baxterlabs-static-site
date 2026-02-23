import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/about', label: 'About' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img
              src="/baxterlabs-logo.png"
              alt="BaxterLabs Advisory"
              className="h-[55px] w-auto"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-base font-medium transition-colors hover:text-teal ${
                  pathname === link.to ? 'text-teal' : 'text-charcoal'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center px-6 h-12 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90"
            >
              Get Started
            </Link>
          </nav>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 text-charcoal"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-light">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block text-base font-medium py-2 transition-colors hover:text-teal ${
                  pathname === link.to ? 'text-teal' : 'text-charcoal'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/get-started"
              onClick={() => setMobileOpen(false)}
              className="block text-center px-6 py-3 bg-crimson text-white font-semibold rounded-lg transition-colors hover:bg-crimson/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
