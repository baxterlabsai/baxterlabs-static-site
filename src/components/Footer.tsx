import { Link, useLocation } from 'react-router-dom'

interface FooterProps {
  variant?: 'services'
}

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

export default function Footer({ variant }: FooterProps) {
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
                  ? 'text-on-surface-variant font-bold border-b border-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/get-started"
            className="font-label text-sm tracking-wide uppercase text-primary underline font-bold"
          >
            Request Review
          </Link>
        </div>

        {/* Divider */}
        <div className="h-px w-full max-w-xs bg-outline-variant/30" />

        {/* Copyright + optional tagline */}
        <div className="font-body text-xs text-on-surface-variant/60 uppercase tracking-widest text-center">
          &copy; {new Date().getFullYear()} BaxterLabs Advisory. All rights reserved.
          {variant === 'services' && (
            <>
              <br />
              Intellectual Authority in Global Finance.
            </>
          )}
        </div>

        {/* Services variant: extra confidentiality row */}
        {variant === 'services' && (
          <div className="flex justify-between items-center w-full border-t border-outline-variant/10 pt-8 mt-4">
            <span className="text-[10px] text-on-surface-variant uppercase tracking-[0.2em] font-medium opacity-50">
              Confidentiality Assured
            </span>
            <div className="flex gap-6">
              <span className="material-symbols-outlined text-on-surface-variant opacity-40 text-sm">lock</span>
              <span className="material-symbols-outlined text-on-surface-variant opacity-40 text-sm">public</span>
            </div>
          </div>
        )}
      </div>
    </footer>
  )
}
