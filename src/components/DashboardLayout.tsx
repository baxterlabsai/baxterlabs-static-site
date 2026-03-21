import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { apiGet } from '../lib/api'
import ChangePasswordModal from './ChangePasswordModal'
import ProfileModal from './ProfileModal'

/* ------------------------------------------------------------------ */
/*  Navigation structure                                               */
/* ------------------------------------------------------------------ */

interface NavItem {
  to: string
  label: string
  end?: boolean
  badge?: 'tasks' | 'news'
}

interface NavSection {
  label?: string
  dotColor?: string
  items: NavItem[]
}

const MAIN_SECTIONS: NavSection[] = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Pipeline',
    dotColor: '#378ADD',
    items: [
      { to: '/dashboard/pipeline', label: 'Board', end: true },
      { to: '/dashboard/pipeline/companies', label: 'Companies' },
      { to: '/dashboard/pipeline/contacts', label: 'Contacts' },
      { to: '/dashboard/pipeline/activities', label: 'Activities' },
      { to: '/dashboard/pipeline/tasks', label: 'Tasks', badge: 'tasks' },
    ],
  },
  {
    label: 'Engagements',
    dotColor: '#BA7517',
    items: [
      { to: '/dashboard/clients', label: 'Active clients' },
      { to: '/dashboard/calendar', label: 'Calendar' },
      { to: '/dashboard/users', label: 'Team' },
    ],
  },
  {
    label: 'Deliverables',
    dotColor: '#C9A84C',
    items: [
      { to: '/dashboard/deliverables', label: 'Review queue', end: true },
    ],
  },
  {
    label: 'Content',
    dotColor: '#639922',
    items: [
      { to: '/dashboard/content/posts', label: 'Posts' },
      { to: '/dashboard/content/blog', label: 'Blog posts' },
      { to: '/dashboard/content/story-bank', label: 'Story bank' },
      { to: '/dashboard/content/news', label: 'News', badge: 'news' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/dashboard/content/commands', label: 'Commands' },
    ],
  },
]

const HELP_SECTION: NavSection = {
  label: 'Help',
  items: [
    { to: '/dashboard/help/manual', label: 'Operations manual' },
    { to: '/dashboard/help/videos', label: 'Video walkthroughs' },
    { to: '/dashboard/help/releases', label: 'Release notes' },
  ],
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [openTaskCount, setOpenTaskCount] = useState(0)
  const [newsUnreviewedCount, setNewsUnreviewedCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata
        setUserName(meta?.full_name || session.user.email || 'Partner')
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const meta = session.user.user_metadata
        setUserName(meta?.full_name || session.user.email || 'Partner')
      }
    })

    return () => { listener.subscription.unsubscribe() }
  }, [])

  // Fetch badge counts
  useEffect(() => {
    apiGet<{ tasks: unknown[]; count: number }>('/api/pipeline/tasks?status=pending')
      .then(data => setOpenTaskCount(data.count))
      .catch(() => {})
    apiGet<{ unreviewed_count: number }>('/api/content-news/stats')
      .then(data => setNewsUnreviewedCount(data.unreviewed_count))
      .catch(() => {})
  }, [location.pathname])

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/dashboard/login')
  }

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'P'

  /* helper: resolve badge value */
  function badgeValue(badge?: 'tasks' | 'news'): number {
    if (badge === 'tasks') return openTaskCount
    if (badge === 'news') return newsUnreviewedCount
    return 0
  }

  /* helper: render a nav link */
  function renderNavLink(item: NavItem) {
    const bv = badgeValue(item.badge)
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={() => setSidebarOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 pl-4 pr-3 py-2 text-[13px] font-medium transition-colors relative ${
            isActive
              ? 'bg-white/8 text-white border-l-[3px] border-crimson pl-[13px]'
              : 'text-white/70 hover:bg-white/5 hover:text-white'
          }`
        }
      >
        {item.label}
        {bv > 0 && (
          <span className="ml-auto bg-gold text-charcoal text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-tight">
            {bv}
          </span>
        )}
      </NavLink>
    )
  }

  /* helper: render a section */
  function renderSection(section: NavSection, idx: number) {
    return (
      <div key={section.label ?? idx} className={idx > 0 ? 'mt-5' : ''}>
        {section.label && (
          <div className="flex items-center gap-2 px-4 mb-1">
            {section.dotColor && (
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: section.dotColor }}
              />
            )}
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
              {section.label}
            </span>
          </div>
        )}
        {section.items.map(renderNavLink)}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-ivory">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-teal transform transition-transform lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>

        {/* Sidebar header: logo + Advisory + rule */}
        <div className="pt-6 pb-4 px-5">
          <div className="flex justify-center">
            <img
              src="/images/baxterlabs-logo-white-text.png"
              alt="BaxterLabs"
              className="h-[83px] w-auto"
            />
          </div>
          <p className="text-center mt-2 text-white/70 text-[11px] font-light tracking-[0.15em] uppercase">
            Advisory
          </p>
          <div className="mt-4 border-t border-white/15" />
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto pb-2">
          {MAIN_SECTIONS.map((section, idx) => renderSection(section, idx))}
        </nav>

        {/* Help section — pinned to bottom */}
        <div className="border-t border-white/15 mt-4 pt-3 pb-2">
          <div className="flex items-center gap-2 px-4 mb-1">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
              {HELP_SECTION.label}
            </span>
          </div>
          {HELP_SECTION.items.map(renderNavLink)}
        </div>

        {/* Sign out */}
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/50 hover:text-white text-xs font-medium w-full px-4 py-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — logo removed, hamburger stays */}
        <header className="bg-white border-b border-gray-light px-4 lg:px-8 h-16 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-charcoal hover:bg-gray-light/50 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <span className="text-sm text-charcoal font-medium hidden sm:inline">{userName}</span>
              <div className="w-8 h-8 rounded-full bg-crimson text-white flex items-center justify-center text-sm font-bold">
                {initials}
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-light py-1 z-50">
                <button
                  onClick={() => { setUserMenuOpen(false); setShowProfileModal(true) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-charcoal hover:bg-ivory transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-charcoal/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Profile
                </button>
                <button
                  onClick={() => { setUserMenuOpen(false); setShowPasswordModal(true) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-charcoal hover:bg-ivory transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-charcoal/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Change Password
                </button>
                <div className="border-t border-gray-light my-1" />
                <button
                  onClick={() => { setUserMenuOpen(false); handleLogout() }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-soft hover:bg-ivory transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  )
}
