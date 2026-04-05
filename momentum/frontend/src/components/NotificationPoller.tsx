import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../api/client.ts'
import type { UpcomingNotification } from '../types/index.ts'
import NotificationToast from './NotificationToast.tsx'

export default function NotificationPoller() {
  const [toasts, setToasts] = useState<UpcomingNotification[]>([])
  const notifiedIds = useRef<Set<number>>(new Set())

  const checkUpcoming = async () => {
    try {
      const resp = await apiClient.get<UpcomingNotification[]>('/notifications/upcoming?minutes=6')
      const slots = resp.data
      const newSlots = slots.filter(s => !notifiedIds.current.has(s.id))

      if (newSlots.length > 0) {
        newSlots.forEach(s => notifiedIds.current.add(s.id))
        setToasts(prev => [...prev, ...newSlots])
      }
    } catch {
      // тихая ошибка — уведомления некритичны
    }
  }

  useEffect(() => {
    checkUpcoming()
    const interval = setInterval(checkUpcoming, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const dismiss = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      {toasts.map(t => (
        <NotificationToast key={t.id} notification={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  )
}
