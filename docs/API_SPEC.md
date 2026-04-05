# REST API Спецификация — Momentum

## Базовый URL: `/api`

Все ответы в формате JSON. Все ошибки возвращают:
```json
{ "error": "Описание ошибки" }
```

---

## Ideas API

### GET /api/ideas
Получить все идеи, отсортированные по `order`.

**Ответ 200:**
```json
[
  {
    "id": 1,
    "title": "Создать свою компанию",
    "description": "Полное описание идеи...",
    "order": 1.0,
    "plansCount": 3,
    "createdAt": "2025-04-01T10:00:00.000Z",
    "updatedAt": "2025-04-01T10:00:00.000Z"
  }
]
```

### GET /api/ideas/:id
Получить идею с привязанными планами.

**Ответ 200:**
```json
{
  "id": 1,
  "title": "Создать свою компанию",
  "description": "Полное описание...",
  "order": 1.0,
  "plans": [
    { "id": 2, "title": "Исследование рынка", "description": "..." }
  ],
  "createdAt": "2025-04-01T10:00:00.000Z",
  "updatedAt": "2025-04-01T10:00:00.000Z"
}
```

### POST /api/ideas
Создать новую идею.

**Тело запроса:**
```json
{
  "title": "Название идеи",
  "description": "Описание (опционально)",
  "insertAfter": 3
}
```
- `insertAfter` — ID идеи, после которой вставить. Если не указан — вставить первой. Если `null` — вставить последней.

**Ответ 201:** объект созданной идеи

### PUT /api/ideas/:id
Обновить идею.

**Тело запроса:**
```json
{
  "title": "Новое название",
  "description": "Новое описание"
}
```

**Ответ 200:** обновлённый объект идеи

### DELETE /api/ideas/:id
Удалить идею (планы остаются, `idea_id` → NULL).

**Ответ 200:** `{ "success": true }`

### PUT /api/ideas/reorder
Обновить порядок идей после drag-and-drop.

**Тело запроса:**
```json
{
  "id": 5,
  "newOrder": 2.5
}
```

**Ответ 200:** `{ "success": true }`

### POST /api/ideas/:id/plans
Привязать план к идее.

**Тело запроса:** `{ "planId": 7 }`

**Ответ 200:** `{ "success": true }`

### DELETE /api/ideas/:id/plans/:planId
Отвязать план от идеи.

**Ответ 200:** `{ "success": true }`

---

## Plans API

### GET /api/plans
Получить все планы, отсортированные по `order`.

**Query параметры:**
- `ideaId` (опционально) — фильтр по идее

**Ответ 200:**
```json
[
  {
    "id": 2,
    "ideaId": 1,
    "ideaTitle": "Создать свою компанию",
    "title": "Исследование рынка",
    "description": "Краткое описание...",
    "order": 1.0,
    "tasksCount": 5,
    "createdAt": "2025-04-01T10:00:00.000Z",
    "updatedAt": "2025-04-01T10:00:00.000Z"
  }
]
```

### GET /api/plans/:id
Получить план с задачами.

**Ответ 200:**
```json
{
  "id": 2,
  "ideaId": 1,
  "ideaTitle": "Создать свою компанию",
  "title": "Исследование рынка",
  "description": "Полное описание плана...",
  "order": 1.0,
  "tasks": [
    {
      "id": 10,
      "title": "Анализ конкурентов",
      "description": "...",
      "status": "new",
      "order": 1.0,
      "slotsCount": 2,
      "commentsCount": 0
    }
  ],
  "createdAt": "2025-04-01T10:00:00.000Z",
  "updatedAt": "2025-04-01T10:00:00.000Z"
}
```

### POST /api/plans
Создать план.

**Тело запроса:**
```json
{
  "title": "Название плана",
  "description": "Описание (опционально)",
  "ideaId": 1,
  "insertAfter": null
}
```

**Ответ 201:** объект плана

### PUT /api/plans/:id
Обновить план.

**Тело запроса:**
```json
{
  "title": "Новое название",
  "description": "Новое описание",
  "ideaId": 2
}
```

**Ответ 200:** обновлённый объект плана

### DELETE /api/plans/:id
Удалить план со всеми задачами и их слотами.

**Ответ 200:** `{ "success": true }`

### PUT /api/plans/reorder
Обновить порядок планов.

**Тело запроса:** `{ "id": 2, "newOrder": 3.5 }`

**Ответ 200:** `{ "success": true }`

---

## Tasks API

### GET /api/plans/:planId/tasks
Получить задачи плана, отсортированные по `order`.

**Ответ 200:**
```json
[
  {
    "id": 10,
    "planId": 2,
    "title": "Анализ конкурентов",
    "description": "...",
    "status": "new",
    "order": 1.0,
    "slotsCount": 2,
    "commentsCount": 1,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### GET /api/tasks/:id
Получить задачу со слотами расписания (комментарии включены).

**Ответ 200:**
```json
{
  "id": 10,
  "planId": 2,
  "planTitle": "Исследование рынка",
  "ideaId": 1,
  "ideaTitle": "Создать свою компанию",
  "title": "Анализ конкурентов",
  "description": "...",
  "status": "in_progress",
  "order": 1.0,
  "slots": [
    {
      "id": 100,
      "date": "2025-04-06",
      "timeFrom": "10:00",
      "timeTo": "12:00",
      "comment": "Немного поработал, изучил 3 конкурента",
      "createdAt": "..."
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### POST /api/plans/:planId/tasks
Создать задачу в плане.

**Тело запроса:**
```json
{
  "title": "Название задачи",
  "description": "Описание (опционально)",
  "status": "new",
  "insertAfter": 10
}
```

**Ответ 201:** объект задачи

### PUT /api/tasks/:id
Обновить задачу (включая статус).

**Тело запроса:**
```json
{
  "title": "Новое название",
  "description": "Новое описание",
  "status": "done"
}
```

**Ответ 200:** обновлённый объект задачи

### DELETE /api/tasks/:id
Удалить задачу со всеми слотами.

**Ответ 200:** `{ "success": true }`

### PUT /api/plans/:planId/tasks/reorder
Изменить порядок задачи в плане.

**Тело запроса:** `{ "id": 10, "newOrder": 2.5 }`

**Ответ 200:** `{ "success": true }`

---

## Schedule API

### GET /api/schedule
Получить слоты расписания в диапазоне дат.

**Query параметры:**
- `dateFrom` (обязательно) — YYYY-MM-DD
- `dateTo` (обязательно) — YYYY-MM-DD

**Ответ 200:**
```json
{
  "2025-04-06": [
    {
      "id": 100,
      "taskId": 10,
      "taskTitle": "Анализ конкурентов",
      "taskStatus": "in_progress",
      "planId": 2,
      "planTitle": "Исследование рынка",
      "timeFrom": "10:00",
      "timeTo": "12:00",
      "comment": null
    }
  ]
}
```

### GET /api/schedule/day/:date
Получить слоты для конкретного дня (YYYY-MM-DD).

**Ответ 200:** массив слотов (как в /api/schedule)

### GET /api/schedule/feed
Получить ленту будущих задач от указанной даты.

**Query параметры:**
- `from` (обязательно) — YYYY-MM-DD (следующий день после выбранного)
- `limit` (опционально, default: 90) — количество дней вперёд

**Ответ 200:**
```json
[
  {
    "date": "2025-04-07",
    "slots": [...]
  },
  {
    "date": "2025-04-08",
    "slots": [...]
  }
]
```

### POST /api/schedule
Добавить слот в расписание.

**Тело запроса:**
```json
{
  "taskId": 10,
  "date": "2025-04-07",
  "timeFrom": "14:00",
  "timeTo": "16:00"
}
```

**Ответ 201:** объект слота

**Ответ 409 (конфликт):**
```json
{
  "error": "Пересечение с существующим слотом",
  "conflict": {
    "id": 99,
    "taskTitle": "Другая задача",
    "timeFrom": "13:00",
    "timeTo": "15:00"
  }
}
```

### PUT /api/schedule/:id
Обновить слот (время или комментарий).

**Тело запроса:**
```json
{
  "timeFrom": "15:00",
  "timeTo": "17:00",
  "comment": "Сделал больше чем планировал"
}
```

**Ответ 200:** обновлённый объект слота

### DELETE /api/schedule/:id
Удалить слот расписания.

**Ответ 200:** `{ "success": true }`

---

## Notifications API

### GET /api/notifications/upcoming
Получить ближайшие слоты расписания для уведомлений.

**Query параметры:**
- `minutes` (default: 20) — слоты которые начнутся в ближайшие N минут

**Ответ 200:**
```json
[
  {
    "id": 100,
    "taskTitle": "Анализ конкурентов",
    "planTitle": "Исследование рынка",
    "date": "2025-04-06",
    "timeFrom": "10:00",
    "timeTo": "12:00",
    "minutesUntilStart": 14
  }
]
```
