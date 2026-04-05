// Momentum Service Worker — браузерные уведомления

const DB_NAME = 'momentum-sw'
const STORE_NAME = 'notified_slots'
const CHECK_INTERVAL = 5 * 60 * 1000 // 5 минут

// Открыть IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function wasNotified(db, slotId) {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(slotId)
    req.onsuccess = () => resolve(!!req.result)
    req.onerror = () => resolve(false)
  })
}

async function markNotified(db, slotId) {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id: slotId, notifiedAt: Date.now() })
    tx.oncomplete = resolve
  })
}

async function cleanOldEntries(db) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24 часа
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.openCursor()
    req.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) {
        if (cursor.value.notifiedAt < cutoff) cursor.delete()
        cursor.continue()
      }
    }
    tx.oncomplete = resolve
  })
}

async function checkUpcoming() {
  try {
    const resp = await fetch('/api/notifications/upcoming?minutes=20')
    if (!resp.ok) return
    const slots = await resp.json()
    if (!Array.isArray(slots) || slots.length === 0) return

    const db = await openDB()
    await cleanOldEntries(db)

    for (const slot of slots) {
      const alreadyNotified = await wasNotified(db, slot.id)
      if (alreadyNotified) continue

      await self.registration.showNotification('⏰ Momentum', {
        body: `${slot.taskTitle} через ${slot.minutesUntilStart} мин (${slot.timeFrom}–${slot.timeTo})`,
        icon: '/icon-192.png',
        badge: '/icon-72.png',
        tag: `slot-${slot.id}`,
        data: { date: slot.date },
        requireInteraction: true,
      })

      await markNotified(db, slot.id)
    }
  } catch (err) {
    console.error('[SW] checkUpcoming error:', err)
  }
}

// Service Worker events
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
  // Запуск периодической проверки
  setInterval(checkUpcoming, CHECK_INTERVAL)
  // Первая проверка сразу
  checkUpcoming()
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const date = event.notification.data?.date
  const url = date ? `/schedule/${date}` : '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Если вкладка уже открыта — фокусируем её
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Иначе открываем новую
      return clients.openWindow(url)
    })
  )
})
