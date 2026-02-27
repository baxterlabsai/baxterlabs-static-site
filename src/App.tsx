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
import UserManagement from './pages/dashboard/UserManagement'
import PipelineBoard from './pages/dashboard/pipeline/Board'
import PipelineCompanies from './pages/dashboard/pipeline/Companies'
import PipelineContacts from './pages/dashboard/pipeline/Contacts'
import PipelineActivities from './pages/dashboard/pipeline/Activities'
import PipelineTasks from './pages/dashboard/pipeline/Tasks'
import ConversionReview from './pages/dashboard/pipeline/ConversionReview'
import UploadPortal from './pages/UploadPortal'
import DeliverablePortal from './pages/DeliverablePortal'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
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

        {/* Password reset (public, no auth) */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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
            <Route path="/dashboard/users" element={<UserManagement />} />
            <Route path="/dashboard/pipeline" element={<PipelineBoard />} />
            <Route path="/dashboard/pipeline/companies" element={<PipelineCompanies />} />
            <Route path="/dashboard/pipeline/contacts" element={<PipelineContacts />} />
            <Route path="/dashboard/pipeline/activities" element={<PipelineActivities />} />
            <Route path="/dashboard/pipeline/tasks" element={<PipelineTasks />} />
            <Route path="/dashboard/pipeline/convert/:opportunityId" element={<ConversionReview />} />
          </Route>
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
