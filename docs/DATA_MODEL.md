# Модель данных — Momentum

## ER-диаграмма (текстовое описание)

```
ideas (1) ──────< (0..N) plans
plans (1) ──────< (1..N) tasks
tasks (1) ──────< (0..N) scheduled_slots
```

---

## Таблицы

### ideas

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Идентификатор |
| title | TEXT | NOT NULL, max 200 | Название идеи |
| description | TEXT | NULLABLE | Полное описание |
| order | REAL | NOT NULL, DEFAULT 0 | Позиция в списке (для drag-and-drop) |
| created_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |

**Индексы:**
- `idx_ideas_order` на поле `order`

---

### plans

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Идентификатор |
| idea_id | INTEGER | NULLABLE, FK → ideas.id | Привязка к идее (NULL = без идеи) |
| title | TEXT | NOT NULL, max 200 | Название плана |
| description | TEXT | NULLABLE | Краткое описание |
| order | REAL | NOT NULL, DEFAULT 0 | Позиция в общем списке планов |
| created_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |

**Индексы:**
- `idx_plans_order` на поле `order`
- `idx_plans_idea_id` на поле `idea_id`

**Каскады:**
- При удалении идеи: `idea_id` становится NULL (SET NULL)

---

### tasks

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Идентификатор |
| plan_id | INTEGER | NOT NULL, FK → plans.id | Принадлежность плану |
| title | TEXT | NOT NULL, max 200 | Название задачи |
| description | TEXT | NULLABLE | Подробное описание |
| status | TEXT | NOT NULL, DEFAULT 'new' | Статус (enum ниже) |
| order | REAL | NOT NULL, DEFAULT 0 | Позиция внутри плана |
| created_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |

**Статусы (enum):**
- `new` — Новая
- `in_progress` — Что-то делалось
- `done` — Успешно сделана
- `done_partially` — Сделана, но не совсем так
- `abandoned` — Не сделана и не будет делаться

**Индексы:**
- `idx_tasks_plan_id_order` на полях `(plan_id, order)`

**Каскады:**
- При удалении плана: удаляются все задачи плана (CASCADE)

---

### scheduled_slots

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT | Идентификатор |
| task_id | INTEGER | NOT NULL, FK → tasks.id | Привязка к задаче |
| date | TEXT | NOT NULL | Дата в формате YYYY-MM-DD |
| time_from | TEXT | NOT NULL | Время начала HH:MM |
| time_to | TEXT | NOT NULL | Время окончания HH:MM |
| comment | TEXT | NULLABLE | Комментарий к слоту |
| created_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |
| updated_at | TEXT | NOT NULL, DEFAULT now | ISO 8601 timestamp |

**Индексы:**
- `idx_slots_date` на поле `date`
- `idx_slots_task_id` на поле `task_id`
- `idx_slots_task_date` на полях `(task_id, date)`

**Каскады:**
- При удалении задачи: удаляются все слоты задачи (CASCADE)

**Бизнес-ограничение (на уровне приложения):**
- В одну дату у разных задач не должны пересекаться слоты по времени
- Проверка: `new_start < existing_end AND new_end > existing_start` для той же даты

---

## Порядок (order) и drag-and-drop

Используется стратегия **дробных чисел** (fractional indexing):
- Начальные значения: 1.0, 2.0, 3.0, ...
- При вставке между двумя элементами: `(order_prev + order_next) / 2`
- При вставке в начало: `order_first - 1.0`
- При вставке в конец: `order_last + 1.0`
- Если дробь становится слишком маленькой (< 0.001): переиндексация всего списка целыми числами

Это позволяет обновлять только одну запись при перетаскивании вместо переиндексации всего списка.

---

## Drizzle ORM схема (TypeScript)

```typescript
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const ideas = sqliteTable('ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  order: real('order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const plans = sqliteTable('plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ideaId: integer('idea_id').references(() => ideas.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  order: real('order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['new', 'in_progress', 'done', 'done_partially', 'abandoned']
  }).notNull().default('new'),
  order: real('order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export const scheduledSlots = sqliteTable('scheduled_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),       // YYYY-MM-DD
  timeFrom: text('time_from').notNull(), // HH:MM
  timeTo: text('time_to').notNull(),     // HH:MM
  comment: text('comment'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})
```
