# Спецификация уведомлений — Momentum

---

## 1. Архитектура

```
┌──────────────────┐     каждые 5 мин     ┌──────────────────┐
│  Service Worker  │ ──────────────────→  │  GET /api/       │
│                  │ ←─────────────────── │  notifications/  │
│  (фоновый поток) │   список слотов       │  upcoming        │
└────────┬─────────┘                      └──────────────────┘
         │  Web Notifications API
         ↓
    [Браузерное уведомление]
         
┌──────────────────┐     каждые 1 мин     ┌──────────────────┐
│  React App       │ ──────────────────→  │  GET /api/       │
│  (если открыт)   │ ←─────────────────── │  notifications/  │
│                  │   список слотов       │  upcoming?m=6    │
└────────┬─────────┘                      └──────────────────┘
         │  Bootstrap Toast
         ↓
    [Toast в правом нижнем углу]
```

---

## 2. Service Worker

### Регистрация
- `sw.ts` регистрируется при монтировании `App.tsx`
- Проверка поддержки: `'serviceWorker' in navigator`
- При первом запуске: запрос разрешения `Notification.requestPermission()`
- Если разрешение отклонено — SW продолжает работать, только Toast

### Логика опроса
- Service Worker использует `setInterval` в `install` + `activate` событиях
- Интервал опроса: 5 минут
- Запрашивает `/api/notifications/upcoming?minutes=20`
- Хранит ID уже отправленных уведомлений в `IndexedDB` (ключ: `notified_slots`)
- Для каждого слота из ответа:
  - Если `id` не в `notified_slots` — отправить уведомление
  - Добавить `id` в `notified_slots`
  - Удалять из `notified_slots` слоты старше 24 часов

### Уведомление браузера
```javascript
self.registration.showNotification('⏰ Momentum', {
  body: `${task.title} через ${minutesUntilStart} мин (${timeFrom}–${timeTo})`,
  icon: '/icon-192.png',
  badge: '/icon-72.png',
  tag: `slot-${slotId}`,           // предотвращает дубликаты
  data: { date: slot.date },       // для обработки клика
  requireInteraction: true,        // не исчезает автоматически
})
```

### Обработка клика на уведомление
```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Открыть/сфокусировать вкладку с приложением
  // Перейти на /schedule/:date
  clients.openWindow(`/schedule/${event.notification.data.date}`)
})
```

---

## 3. In-page Toast уведомления

### Механизм
- `NotificationPoller` компонент монтируется в `App.tsx`
- `useEffect` с `setInterval` каждые 60 секунд
- Запрашивает `/api/notifications/upcoming?minutes=6`
- Хранит показанные `Set<slotId>` в `useRef` (сбрасывается при перезагрузке)
- Добавляет Toast в очередь `toastQueue` (React state)

### Toast компонент
```tsx
<Toast show={true} bg="dark" className="border-warning">
  <Toast.Header className="bg-dark text-warning">
    <span>⏰</span>
    <strong className="me-auto">Скоро задача</strong>
  </Toast.Header>
  <Toast.Body className="text-white">
    <div>{task.title}</div>
    <small className="text-muted">{plan.title} · {timeFrom}–{timeTo}</small>
    <div className="mt-2">
      <Button size="sm" variant="outline-primary" onClick={openSchedule}>
        Открыть
      </Button>
    </div>
  </Toast.Body>
</Toast>
```

---

## 4. API endpoint `/api/notifications/upcoming`

### Логика запроса
```sql
SELECT ss.*, t.title as task_title, t.status, p.title as plan_title
FROM scheduled_slots ss
JOIN tasks t ON ss.task_id = t.id
JOIN plans p ON t.plan_id = p.id
WHERE ss.date = date('now', 'localtime')
  AND ss.time_from >= time('now', 'localtime')
  AND ss.time_from <= time('now', '+{minutes} minutes', 'localtime')
```

### Ответ
Массив объектов с `minutesUntilStart` — вычисляется на сервере.

---

## 5. Иконки приложения (для уведомлений)

Необходимы файлы (помещаются в `frontend/public/`):
- `icon-72.png` (72×72)
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Генерируются при сборке из SVG-исходника.

---

## 6. Манифест PWA

`frontend/public/manifest.json`:
```json
{
  "name": "Momentum",
  "short_name": "Momentum",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#212529",
  "theme_color": "#212529",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
