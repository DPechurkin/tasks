import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from './components/Navbar.tsx'
import NotificationPoller from './components/NotificationPoller.tsx'
import IdeasPage from './pages/Ideas/IdeasPage.tsx'
import IdeaDetailPage from './pages/Ideas/IdeaDetailPage.tsx'
import PlansPage from './pages/Plans/PlansPage.tsx'
import PlanDetailPage from './pages/Plans/PlanDetailPage.tsx'
import TaskDetailPage from './pages/Plans/TaskDetailPage.tsx'
import SchedulePage from './pages/Schedule/SchedulePage.tsx'
import { registerServiceWorker, requestNotificationPermission } from './utils/serviceWorker.ts'
import { errorBus } from './api/client.ts'

export default function App() {
  const [globalError, setGlobalError] = useState<string | null>(null)

  useEffect(() => {
    registerServiceWorker()
    requestNotificationPermission()
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail
      setGlobalError(msg)
      setTimeout(() => setGlobalError(null), 5000)
    }
    errorBus.addEventListener('api-error', handler)
    return () => errorBus.removeEventListener('api-error', handler)
  }, [])

  return (
    <BrowserRouter>
      <div className="min-vh-100 bg-dark text-white">
        <Navbar />
        <NotificationPoller />
        {globalError && (
          <div
            className="alert alert-danger alert-dismissible"
            style={{ position: 'fixed', top: '70px', right: '1rem', zIndex: 9998, maxWidth: '350px' }}
          >
            <i className="bi bi-exclamation-triangle me-2"></i>
            {globalError}
            <button type="button" className="btn-close" onClick={() => setGlobalError(null)}></button>
          </div>
        )}
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/ideas" replace />} />
            <Route path="/ideas" element={<IdeasPage />} />
            <Route path="/ideas/:id" element={<IdeaDetailPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/plans/:id" element={<PlanDetailPage />} />
            <Route path="/plans/:planId/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/schedule/:date" element={<SchedulePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
