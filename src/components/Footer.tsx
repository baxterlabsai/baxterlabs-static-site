import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-teal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          {/* Logo + Contact */}
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link to="/">
              <img
                src="/baxterlabs-logo-white-text.png"
                alt="BaxterLabs Advisory"
                className="h-[55px] w-auto"
              />
            </Link>
            <a
              href="mailto:george@baxterlabs.ai"
              className="text-white/80 hover:text-white transition-colors"
            >
              george@baxterlabs.ai
            </a>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm">
            <Link to="/" className="text-white/80 hover:text-white transition-colors">Home</Link>
            <Link to="/services" className="text-white/80 hover:text-white transition-colors">Services</Link>
            <Link to="/about" className="text-white/80 hover:text-white transition-colors">About</Link>
            <Link to="/get-started" className="text-white/80 hover:text-white transition-colors">Get Started</Link>
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm text-white/60">
          &copy; 2026 BaxterLabs Advisory
        </div>
      </div>
    </footer>
  )
}
