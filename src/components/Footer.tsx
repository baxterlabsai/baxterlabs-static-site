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

export default function Footer() {
  const { pathname } = useLocation()

  return (
    <footer className="bg-surface-container-highest w-full py-20 border-t border-surface-container">
      <div className="flex flex-col items-center gap-8 px-12 max-w-7xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            alt="BaxterLabs Logo"
            className="h-[83px] w-auto object-contain"
            src="/images/baxterlabs-logo.png"
          />
        </Link>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-label text-sm tracking-wide uppercase transition-opacity ${
                isActive(pathname, link.to)
                  ? 'text-secondary font-bold border-b border-secondary'
                  : 'text-on-surface-variant hover:text-secondary'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/get-started"
            className="font-label text-sm tracking-wide uppercase text-primary underline font-bold"
          >
            Start Your Diagnostic
          </Link>
        </div>

        {/* Divider */}
        <div className="h-px w-full max-w-xs bg-outline-variant/30" />

        {/* Copyright */}
        <div className="font-body text-xs text-on-surface-variant/60 uppercase tracking-widest text-center">
          &copy; {new Date().getFullYear()} BaxterLabs Advisory. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
