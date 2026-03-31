import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/insights', label: 'Insights' },
]

function isActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname.startsWith(to)
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav border-b border-surface-container">
      <div className="flex justify-between items-center px-6 md:px-12 py-4 max-w-full mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            alt="BaxterLabs Logo"
            className="h-[83px] w-auto object-contain"
            src="/images/baxterlabs-logo.png"
          />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex gap-10 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={
                isActive(pathname, link.to)
                  ? 'text-primary font-bold border-b-2 border-primary transition-colors duration-300'
                  : 'text-on-surface-variant font-medium hover:text-primary transition-colors duration-300'
              }
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA + Mobile Toggle */}
        <div className="flex items-center gap-4">
          <Link
            to="/get-started"
            className="hidden md:inline-block bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-sm font-label text-sm uppercase tracking-wider font-bold shadow-sm active:scale-95 transition-all"
          >
            Start Your Diagnostic
          </Link>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 text-on-surface"
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
        <div className="md:hidden bg-surface border-t border-surface-container">
          <div className="px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block text-base font-medium py-2 transition-colors ${
                  isActive(pathname, link.to)
                    ? 'text-primary font-bold'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/get-started"
              onClick={() => setMobileOpen(false)}
              className="block text-center bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-3 rounded-sm font-label text-sm uppercase tracking-wider font-bold"
            >
              Start Your Diagnostic
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
