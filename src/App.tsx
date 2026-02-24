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
import ClientDirectory from './pages/dashboard/ClientDirectory'
import Calendar from './pages/dashboard/Calendar'
import UploadPortal from './pages/UploadPortal'
import DeliverablePortal from './pages/DeliverablePortal'
import NotFound from './pages/NotFound'

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

        {/* Public portals (token-based, no auth) */}
        <Route path="/upload/:token" element={<UploadPortal />} />
        <Route path="/deliverables/:token" element={<DeliverablePortal />} />

        {/* Dashboard login (no auth) */}
        <Route path="/dashboard/login" element={<Login />} />

        {/* Dashboard (auth protected) */}
        <Route element={<AuthGuard />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/dashboard/engagement/:id" element={<EngagementDetail />} />
            <Route path="/dashboard/engagement/:id/start" element={<StartEngagement />} />
            <Route path="/dashboard/prompts" element={<PromptLibrary />} />
            <Route path="/dashboard/clients" element={<ClientDirectory />} />
            <Route path="/dashboard/calendar" element={<Calendar />} />
          </Route>
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
