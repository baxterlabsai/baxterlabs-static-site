import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Services from './pages/Services'
import About from './pages/About'
import GetStarted from './pages/GetStarted'
import AuthGuard from './components/AuthGuard'
import DashboardLayout from './components/DashboardLayout'
import Login from './pages/dashboard/Login'
import Overview from './pages/dashboard/Overview'
import EngagementDetail from './pages/dashboard/EngagementDetail'
import StartEngagement from './pages/dashboard/StartEngagement'
import PromptLibrary from './pages/dashboard/PromptLibrary'
import UploadPortal from './pages/UploadPortal'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public pages */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
          <Route path="/get-started" element={<GetStarted />} />
        </Route>

        {/* Public upload portal (token-based, no auth) */}
        <Route path="/upload/:token" element={<UploadPortal />} />

        {/* Dashboard login (no auth) */}
        <Route path="/dashboard/login" element={<Login />} />

        {/* Dashboard (auth protected) */}
        <Route element={<AuthGuard />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/dashboard/engagement/:id" element={<EngagementDetail />} />
            <Route path="/dashboard/engagement/:id/start" element={<StartEngagement />} />
            <Route path="/dashboard/prompts" element={<PromptLibrary />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}
