# TEST_SPEC.md — Спецификация тестов Momentum

## Стек тестирования

| Уровень | Инструмент | Назначение |
|---|---|---|
| Unit/Integration (backend) | **Vitest** + **supertest** | Тестирование API эндпоинтов с реальным SQLite in-memory |
| Unit (frontend) | **Vitest** + **React Testing Library** | Тестирование компонентов и утилит |
| E2E | **Playwright** | Полный пользовательский сценарий в браузере |

**Конфигурация:**
- Backend тесты: `backend/vitest.config.ts` — `environment: 'node'`, SQLite `:memory:`
- Frontend тесты: `frontend/vitest.config.ts` — `environment: 'jsdom'`
- E2E тесты: `playwright.config.ts` — запуск против `http://localhost:3000` (Docker или dev сервер)

---

## Структура тестовых файлов

```
momentum/
├── backend/
│   └── src/
│       ├── routes/
│       │   ├── ideas.test.ts
│       │   ├── plans.test.ts
│       │   ├── tasks.test.ts
│       │   ├── schedule.test.ts
│       │   └── notifications.test.ts
│       ├── services/
│       │   └── overlapCheck.test.ts
│       └── utils/
│           └── fractionalIndex.test.ts (backend)
├── frontend/
│   └── src/
│       ├── utils/
│       │   ├── fractionalIndex.test.ts
│       │   └── calendar.test.ts
│       ├── components/
│       │   ├── StatusBadge.test.tsx
│       │   ├── IdeaCard.test.tsx
│       │   ├── TaskCard.test.tsx
│       │   └── MonthGrid.test.tsx
│       └── pages/
│           ├── IdeasPage.test.tsx
│           ├── SchedulePage.test.tsx
│           └── DayPanel.test.tsx
└── e2e/
    ├── ideas.spec.ts
    ├── plans.spec.ts
    ├── schedule.spec.ts
    └── navigation.spec.ts
```

---

## 1. Backend — Утилиты

### T-U01 fractionalIndex (backend/src/utils/fractionalIndex.test.ts)

```
T-U01-01: getOrderBetween(1.0, 3.0) = 2.0
T-U01-02: getOrderBetween(1.0, 2.0) = 1.5
T-U01-03: getOrderBetween(1.0, 1.5) = 1.25
T-U01-04: getOrderBefore(1.0) = 0.0
T-U01-05: getOrderAfter(5.0) = 6.0
T-U01-06: getOrderBetween(prev=null, next=1.0) ≡ getOrderBefore(1.0)
T-U01-07: getOrderBetween(1.0, next=null) ≡ getOrderAfter(1.0)
```

### T-U02 overlapCheck (backend/src/services/overlapCheck.test.ts)

```
T-U02-01: слоты 10:00-12:00 и 13:00-15:00 → нет пересечения
T-U02-02: слоты 10:00-12:00 и 11:00-13:00 → ПЕРЕСЕЧЕНИЕ (начало B внутри A)
T-U02-03: слоты 10:00-12:00 и 09:00-11:00 → ПЕРЕСЕЧЕНИЕ (конец B внутри A)
T-U02-04: слоты 10:00-12:00 и 10:30-11:30 → ПЕРЕСЕЧЕНИЕ (B внутри A)
T-U02-05: слоты 10:00-12:00 и 10:00-12:00 → ПЕРЕСЕЧЕНИЕ (полное совпадение)
T-U02-06: слоты 10:00-12:00 и 12:00-14:00 → нет пересечения (граница)
T-U02-07: слоты 10:00-12:00 и 08:00-10:00 → нет пересечения (граница)
T-U02-08: разные даты, одинаковое время → нет пересечения
```

---

## 2. Backend — API тесты

> Каждый тест использует отдельную in-memory SQLite, заполненную fixtures.

### T-A01 Ideas API (backend/src/routes/ideas.test.ts)

**GET /api/ideas**
```
T-A01-01: пустая БД → [] (200)
T-A01-02: 3 идеи → массив из 3 объектов, отсортированных по order (200)
T-A01-03: каждый объект содержит поля: id, title, description, order, plansCount, createdAt
T-A01-04: plansCount корректно считает привязанные планы
```

**GET /api/ideas/:id**
```
T-A01-05: существующий id → объект с полем plans[] (200)
T-A01-06: несуществующий id → 404
T-A01-07: plans[] содержит только планы с idea_id = этой идее
```

**POST /api/ideas**
```
T-A01-08: валидный запрос {title, description} → 201, новый объект
T-A01-09: insertAfter=null → вставляется с наибольшим order
T-A01-10: insertAfter=<id> → вставляется после указанной идеи
T-A01-11: пустой title → 400 с ошибкой валидации
T-A01-12: title > 200 символов → 400
T-A01-13: без поля title → 400
```

**PUT /api/ideas/:id**
```
T-A01-14: обновление title → 200, обновлённый объект
T-A01-15: обновление description → 200
T-A01-16: несуществующий id → 404
T-A01-17: updatedAt изменяется
```

**DELETE /api/ideas/:id**
```
T-A01-18: удаление существующей идеи → 200
T-A01-19: планы этой идеи: idea_id становится NULL (не удаляются)
T-A01-20: несуществующий id → 404
```

**PUT /api/ideas/reorder**
```
T-A01-21: обновление order существующей идеи → 200
T-A01-22: несуществующий id → 404
```

**POST /api/ideas/:id/plans**
```
T-A01-23: привязка плана к идее → 200, план обновлён
T-A01-24: план уже привязан к этой идее → 200 (идемпотентно)
T-A01-25: несуществующий planId → 404
```

**DELETE /api/ideas/:id/plans/:planId**
```
T-A01-26: отвязка плана → 200, plan.idea_id = NULL
T-A01-27: план не привязан к этой идее → 404
```

---

### T-A02 Plans API (backend/src/routes/plans.test.ts)

**GET /api/plans**
```
T-A02-01: возвращает все планы (привязанные и нет) отсортированные по order
T-A02-02: объект включает ideaTitle (null если нет идеи), tasksCount
T-A02-03: tasksCount корректно подсчитывается
```

**GET /api/plans/:id**
```
T-A02-04: возвращает план с tasks[] отсортированными по order
T-A02-05: каждая задача включает slotsCount, commentsCount (count слотов с непустым comment)
T-A02-06: несуществующий id → 404
```

**DELETE /api/plans/:id**
```
T-A02-07: удаление плана с задачами → все задачи удалены (CASCADE)
T-A02-08: слоты расписания удалённых задач тоже удалены (CASCADE)
```

---

### T-A03 Tasks API (backend/src/routes/tasks.test.ts)

**PUT /api/tasks/:id (статус)**
```
T-A03-01: смена статуса на 'done' → 200, объект с новым статусом
T-A03-02: невалидный статус → 400
T-A03-03: все 5 допустимых статусов проходят валидацию
```

**GET /api/tasks/:id**
```
T-A03-04: возвращает slots[] задачи отсортированные по date DESC
T-A03-05: slots[] включает comment (null если не задан)
T-A03-06: включает planTitle, ideaId, ideaTitle (null если план без идеи)
```

**DELETE /api/tasks/:id**
```
T-A03-07: все слоты расписания задачи удалены (CASCADE)
```

---

### T-A04 Schedule API (backend/src/routes/schedule.test.ts)

**GET /api/schedule?dateFrom&dateTo**
```
T-A04-01: возвращает объект, ключи — даты в диапазоне (только дни с задачами)
T-A04-02: слот содержит taskTitle, taskStatus, planTitle, timeFrom, timeTo, comment
T-A04-03: dateFrom=dateTo → возвращает один день
T-A04-04: нет слотов в диапазоне → {} (200)
```

**POST /api/schedule**
```
T-A04-05: валидный слот без пересечений → 201
T-A04-06: пересечение с существующим → 409 с conflict объектом
T-A04-07: пересечение на границе (10:00-12:00 + 12:00-14:00) → 201 (не конфликт)
T-A04-08: несуществующий taskId → 404
T-A04-09: timeFrom >= timeTo → 400
T-A04-10: прошедшая дата → 201 (бэкенд не ограничивает, фронт ограничивает)
```

**PUT /api/schedule/:id**
```
T-A04-11: обновление comment → 200
T-A04-12: обновление timeFrom/timeTo с проверкой пересечений
T-A04-13: новое время пересекается → 409
T-A04-14: несуществующий id → 404
```

**DELETE /api/schedule/:id**
```
T-A04-15: удаление → 200
T-A04-16: несуществующий id → 404
```

**GET /api/schedule/feed**
```
T-A04-17: возвращает массив {date, slots[]} сгруппированный по датам
T-A04-18: только даты >= from параметра
T-A04-19: дни без задач не включаются в результат
T-A04-20: лимит по умолчанию 90 дней
```

---

### T-A05 Notifications API (backend/src/routes/notifications.test.ts)

```
T-A05-01: слот начинается через 10 минут → включается в ответ при minutes=15
T-A05-02: слот начинается через 25 минут → не включается при minutes=20
T-A05-03: прошедший слот → не включается
T-A05-04: ответ включает minutesUntilStart
T-A05-05: другая дата (не сегодня) → не включается
```

---

## 3. Frontend — Утилиты

### T-F01 calendar.ts (frontend/src/utils/calendar.test.ts)

```
T-F01-01: getDaysInMonth(2025, 1) = 31 (январь)
T-F01-02: getDaysInMonth(2024, 2) = 29 (високосный)
T-F01-03: getDaysInMonth(2025, 2) = 28 (не високосный)
T-F01-04: getFirstDayOfWeek(2025, 4) = 1 (апрель 2025 начинается со вторника, индекс 1 если Пн=0)
T-F01-05: isToday(new Date()) = true
T-F01-06: isToday(вчера) = false
T-F01-07: isPast(вчера) = true
T-F01-08: isPast(завтра) = false
T-F01-09: isPast(сегодня) = false
T-F01-10: formatDate(new Date(2025, 3, 6)) = '2025-04-06'
```

### T-F02 fractionalIndex.ts (frontend/src/utils/fractionalIndex.test.ts)

```
(Аналогично T-U01)
```

---

## 4. Frontend — Компоненты

### T-C01 StatusBadge (frontend/src/components/StatusBadge.test.tsx)

```
T-C01-01: status='new' → рендерит 'Новая' с классом bg-secondary
T-C01-02: status='in_progress' → 'Что-то делалось', bg-warning
T-C01-03: status='done' → 'Успешно сделана', bg-success
T-C01-04: status='done_partially' → 'Сделана, но не совсем так', bg-info
T-C01-05: status='abandoned' → 'Не сделана и не будет делаться', bg-danger
```

### T-C02 IdeaCard (frontend/src/components/IdeaCard.test.tsx)

```
T-C02-01: рендерит title
T-C02-02: рендерит обрезанное описание (>150 символов → '...')
T-C02-03: рендерит бейдж с plansCount
T-C02-04: клик на title → вызывает navigate к /ideas/:id
T-C02-05: клик ✎ → вызывает onEdit
T-C02-06: клик 🗑 → вызывает onDelete
T-C02-07: plansCount=0 → бейдж показывает '0 планов'
```

### T-C03 MonthGrid (frontend/src/components/Calendar/MonthGrid.test.tsx)

```
T-C03-01: рендерит 28/29/30/31 ячеек в зависимости от месяца
T-C03-02: сегодняшняя дата получает CSS класс 'today'
T-C03-03: выбранная дата получает CSS класс 'selected'
T-C03-04: прошедшие даты получают класс 'past'
T-C03-05: ячейка с slots[date]>0 → рендерит бейдж с числом
T-C03-06: ячейка с slots[date]=0 → бейдж не рендерится
T-C03-07: клик на день → вызывает onDayClick с правильной датой
T-C03-08: первый день месяца в правильной колонке (Пн=1, ..., Вс=7)
T-C03-09: пустые ячейки перед первым днём корректно рендерятся
```

### T-C04 DayPanel (frontend/src/pages/Schedule/DayPanel.test.tsx)

```
T-C04-01: будущая дата → заголовок без "Прошедший день", кнопка добавить видна
T-C04-02: прошедшая дата → заголовок "Прошедший день" + 🔒, кнопка добавить скрыта
T-C04-03: сегодняшняя дата → бейдж "Сегодня"
T-C04-04: пустой день → отображается "Нет задач на этот день"
T-C04-05: слот прошедшего дня → textarea комментария активна
T-C04-06: слот будущего дня → кнопки удалить и редактировать видны
T-C04-07: лента отображает задачи сгруппированные по датам
```

---

## 5. E2E тесты — Playwright

> Запускаются против полного приложения. Используют тестовую БД (SQLite с фикстурами).

### T-E01 Ideas — CRUD (e2e/ideas.spec.ts)

```
T-E01-01: Открыть /ideas → видна страница с заголовком "Идеи"
T-E01-02: Пустой список → видно пустое состояние с кнопкой
T-E01-03: Создать идею → карточка появляется в списке
T-E01-04: Создать идею с пустым названием → форма не отправляется, ошибка видна
T-E01-05: Редактировать идею → название обновляется на карточке
T-E01-06: Удалить идею → карточка исчезает после подтверждения
T-E01-07: Отменить удаление → карточка остаётся
T-E01-08: Создать 3 идеи → все видны в списке
T-E01-09: Перетащить карточку → порядок меняется
T-E01-10: Перезагрузить после DnD → порядок сохранён
```

### T-E02 Ideas — Детальная страница (e2e/ideas.spec.ts)

```
T-E02-01: Клик на карточку → переход на /ideas/:id
T-E02-02: Полное описание отображается
T-E02-03: Привязать план → план появляется в списке
T-E02-04: Клик на план в списке → переход на /plans/:id
T-E02-05: Отвязать план → план исчезает из списка
```

### T-E03 Plans + Tasks — CRUD (e2e/plans.spec.ts)

```
T-E03-01: Создать план без идеи → карточка без бейджа идеи
T-E03-02: Создать план с привязкой к идее → бейдж идеи виден на карточке
T-E03-03: Открыть план → страница задач
T-E03-04: Создать задачу в плане → задача появляется с порядковым номером
T-E03-05: Изменить статус задачи на карточке → badge меняет цвет
T-E03-06: Перетащить задачу → порядок обновлён
T-E03-07: Удалить план → подтверждение с числом задач → удаление каскадное
T-E03-08: Открыть задачу → breadcrumb корректный
T-E03-09: Изменить статус задачи со страницы → обновляется
```

### T-E04 Schedule — Базовые (e2e/schedule.spec.ts)

```
T-E04-01: Открыть /schedule → три сетки месяцев видны
T-E04-02: Сегодняшняя дата подсвечена в сетке
T-E04-03: Нажать → (следующий месяц) → навигатор и сетки обновлены
T-E04-04: Нажать ← (предыдущий месяц) → обновлено
T-E04-05: Клик на будущую дату → правая панель показывает дату
T-E04-06: Правая панель: кнопка добавить видна на будущей дате
T-E04-07: Клик на прошедшую дату → бейдж "Прошедший день", кнопка добавить скрыта
```

### T-E05 Schedule — Добавление и управление слотами (e2e/schedule.spec.ts)

```
T-E05-01: Добавить задачу на будущую дату → слот появляется, бейдж в ячейке +1
T-E05-02: Попытка добавить пересекающийся слот → ошибка с деталями конфликта
T-E05-03: Удалить слот будущей даты → слот исчезает, бейдж -1
T-E05-04: Редактировать время слота → время обновлено
T-E05-05: Добавить комментарий к прошедшему слоту → сохраняется
T-E05-06: Комментарий виден на странице задачи
T-E05-07: Кнопки редактирования недоступны на прошедших слотах
```

### T-E06 Schedule — Добавление из страницы задачи (e2e/schedule.spec.ts)

```
T-E06-01: На странице задачи нажать "Поставить в расписание" → модал открывается
T-E06-02: Выбрать дату и время → слот создан → появляется в списке слотов задачи
T-E06-03: Ссылка "Открыть в расписании" ведёт на /schedule/:date
T-E06-04: На /schedule/:date выбранная дата открыта, слот виден
```

### T-E07 Навигация (e2e/navigation.spec.ts)

```
T-E07-01: Navbar: активный пункт подсвечен
T-E07-02: Переход Идея → План через привязанный план работает
T-E07-03: Breadcrumb на странице задачи: все 3 ссылки кликабельны
T-E07-04: Из слота расписания переход к задаче работает
T-E07-05: Кнопка "← Назад" возвращает на предыдущую страницу
```

---

## 6. Ручное чеклист-тестирование

Для сценариев сложных для автоматизации (уведомления, DnD):

### Уведомления

```
[M-01] Разрешить уведомления при первом запуске
[M-02] Запланировать задачу через 1 минуту → получить Toast
[M-03] Закрыть вкладку → запланировать → получить браузерное уведомление
[M-04] Кликнуть по уведомлению → открылся правильный день
[M-05] Повторно открыть приложение → то же уведомление не появляется снова
```

### Офлайн режим

```
[M-06] docker-compose up → отключить интернет → приложение полностью работает
[M-07] Создать данные офлайн → включить интернет → данные сохранены в volume
[M-08] docker-compose down && docker-compose up → данные сохранены
```

### DnD

```
[M-09] Перетащить идею на телефоне (touchscreen)
[M-10] Перетащить задачу быстро несколько раз подряд → порядок корректный
[M-11] Перетащить во время ошибки сети → rollback корректный
```

---

## 7. Конфигурационные файлы тестов

### backend/vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

### backend/src/test/setup.ts
```typescript
import { beforeEach, afterEach } from 'vitest'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

export let testDb: ReturnType<typeof drizzle>

beforeEach(() => {
  const sqlite = new Database(':memory:')
  testDb = drizzle(sqlite)
  migrate(testDb, { migrationsFolder: './drizzle' })
})
```

### frontend/vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

### playwright.config.ts
```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'docker-compose up',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
})
```

---

## 8. Скрипты запуска тестов

В корневом `package.json` или `Makefile`:

```bash
# Backend unit тесты
make test-backend
# → cd backend && npx vitest run

# Frontend unit тесты  
make test-frontend
# → cd frontend && npx vitest run

# E2E тесты (требует запущенного приложения)
make test-e2e
# → npx playwright test

# Все тесты
make test
# → make test-backend && make test-frontend && make test-e2e

# Тесты с coverage
make test-coverage
# → cd backend && npx vitest run --coverage && cd ../frontend && npx vitest run --coverage
```
