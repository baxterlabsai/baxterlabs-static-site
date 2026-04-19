import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import Services from './pages/Services'
import About from './pages/About'
import GetStarted from './pages/GetStarted'
import BlogIndex from './pages/BlogIndex'
import BlogPost from './pages/BlogPost'
import AlfonsoOnboarding from './pages/AlfonsoOnboarding'
import Partners from './pages/Partners'
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
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<About />} />
          <Route path="/get-started" element={<GetStarted />} />
          <Route path="/insights" element={<BlogIndex />} />
          <Route path="/insights/:slug" element={<BlogPost />} />
        </Route>

        <Route path="/alfonso-onboarding" element={<AlfonsoOnboarding />} />
        <Route path="/partners" element={<Partners />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
