# TASKS.md — Momentum

## Роли / агенты
- **backend** — Fastify API, Drizzle ORM, SQLite, бизнес-логика
- **frontend** — React, TypeScript, Bootstrap, dnd-kit, компоненты
- **devops** — Docker, Dockerfile, docker-compose, Vite config, SW setup

## Связанные документы
- [USER_CASES.md](docs/USER_CASES.md) — все пользовательские сценарии (UC-001..UC-042)
- [TEST_SPEC.md](docs/TEST_SPEC.md) — спецификация тестов (T-U, T-A, T-C, T-E, M)
- [FUNCTIONAL_SPEC.md](docs/FUNCTIONAL_SPEC.md) — полный функционал
- [API_SPEC.md](docs/API_SPEC.md) — REST API
- [DATA_MODEL.md](docs/DATA_MODEL.md) — ER модель

---

## Фаза 0: Фундамент проекта

### TASK-001 [devops] — Структура проекта и Docker
**Описание:** Создать базовую структуру монорепозитория и Docker конфигурацию.

**User Cases:** UC-023 (офлайн запуск), UC-036 (SW требует HTTPS или localhost)

**Детали:**
- Создать директории: `momentum/backend/`, `momentum/frontend/`, `momentum/docs/`
- `Dockerfile` — многоэтапная сборка:
  - Stage 1 `frontend-build`: Node 20, устанавливает зависимости, собирает `vite build`
  - Stage 2 `backend`: Node 20, копирует backend + собранный frontend в `public/`
- `docker-compose.yml`:
  - Один сервис `app`
  - Порт: `3000:3000`
  - Volume: `./data:/app/data` (для SQLite файла)
  - Переменные: `NODE_ENV=production`, `DB_PATH=/app/data/momentum.db`
- `.dockerignore`
- `Makefile` с командами: `make build`, `make up`, `make down`, `make logs`, `make test`

**Тесты:** M-06, M-07, M-08 (ручной чеклист офлайн режима)

**Критерии готовности:** `docker-compose up --build` запускается без ошибок, приложение доступно на `:3000`

---

### TASK-002 [backend] — Инициализация Fastify + Drizzle + SQLite
**Описание:** Настроить backend приложение.

**User Cases:** Все API-зависимые (база для UC-001..UC-042)

**Детали:**
- `backend/package.json` — зависимости:
  - `fastify`, `@fastify/static`, `@fastify/cors`
  - `drizzle-orm`, `better-sqlite3`
  - `zod`, `@fastify/type-provider-zod`
  - Dev: `drizzle-kit`, `@types/*`, `tsx`, `typescript`, `vitest`, `supertest`
- `backend/src/db/schema.ts` — Drizzle схема (см. DATA_MODEL.md)
- `backend/src/db/index.ts` — создание подключения, `better-sqlite3(DB_PATH)`
- `backend/drizzle.config.ts` — конфигурация миграций
- `backend/src/app.ts` — инициализация Fastify, регистрация плагинов, SPA fallback
- `backend/src/migrate.ts` — применение миграций при старте
- `backend/src/test/setup.ts` — тестовая in-memory SQLite (см. TEST_SPEC.md §7)
- `backend/vitest.config.ts`

**Тесты:** Настройка инфраструктуры тестов; `GET /api/health` → 200

**Критерии готовности:** `npm start` запускается, `GET /api/health` возвращает `200 { "ok": true }`

---

### TASK-003 [frontend] — Инициализация React + Bootstrap + Router
**Описание:** Scaffolding frontend приложения.

**User Cases:** UC-001, UC-011, UC-023 (навигация между разделами)

**Детали:**
- `frontend/package.json` — зависимости:
  - `react`, `react-dom`, `react-router-dom`
  - `bootstrap` (5.3), `bootstrap-icons`
  - `axios`, `date-fns`
  - `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
  - Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- `frontend/vite.config.ts` — proxy `/api`, build output в `../backend/public/`
- `frontend/src/main.tsx` — Bootstrap import, `data-bs-theme="dark"` на `<html>`
- `frontend/src/App.tsx` — Router, Routes, Navbar, NotificationPoller
- `frontend/src/components/Navbar.tsx`
- `frontend/src/api/client.ts` — axios instance
- `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`

**Тесты:** T-E07-01 (Navbar активный пункт)

**Критерии готовности:** `npm run dev` запускается, Navbar отображается, переходы работают

---

## Фаза 1: Раздел "Идеи"

### TASK-004 [backend] — Ideas API
**Описание:** Реализовать все эндпоинты для работы с идеями.

**User Cases:** UC-001, UC-002, UC-003, UC-004, UC-005, UC-007, UC-008, UC-009

**Эндпоинты согласно API_SPEC.md:**
- `GET /api/ideas` — все идеи с `plansCount`
- `GET /api/ideas/:id` — идея с массивом `plans`
- `POST /api/ideas` — создание с позиционированием (`insertAfter`)
- `PUT /api/ideas/:id` — обновление
- `DELETE /api/ideas/:id` — удаление (SET NULL для plans.idea_id)
- `PUT /api/ideas/reorder` — обновить `order` одной записи
- `POST /api/ideas/:id/plans` — привязать план
- `DELETE /api/ideas/:id/plans/:planId` — отвязать план

**Детали реализации:**
- Файл: `backend/src/routes/ideas.ts`
- Валидация через Zod схемы
- Позиционирование через fractional indexing

**Тесты:** T-A01-01..T-A01-27, T-U01-01..T-U01-07

**Критерии готовности:** Все T-A01 проходят; валидация отклоняет некорректные запросы

---

### TASK-005 [frontend] — Страница списка идей
**Описание:** Реализовать `/ideas` — отображение списка карточек.

**User Cases:** UC-001 (просмотр), UC-002 (кнопка вверху), UC-003 (кнопка после карточки)

**Компоненты:**
- `pages/Ideas/IdeasPage.tsx` — загружает `GET /api/ideas`, состояния loading/error/empty
- `pages/Ideas/IdeaCard.tsx` — Props: `idea`, `onEdit`, `onDelete`, `onAddAfter`, `dragHandleProps`
- `components/AddItemButton.tsx` — кнопка "Новая идея" (переиспользуемая)
- `components/LoadingSpinner.tsx`
- `components/EmptyState.tsx`

**Тесты:** T-C02-01..T-C02-07, T-E01-01..T-E01-03, T-E01-08

**Критерии готовности:** Список загружается, карточки видны, пустое/загрузочное состояние работает

---

### TASK-006 [frontend] — Drag-and-drop для идей
**Описание:** Реализовать перетаскивание карточек идей.

**User Cases:** UC-006 (приоритизация)

**Детали:**
- `DndContext` + `SortableContext` в `IdeasPage.tsx`
- `useSortable` в `IdeaCard.tsx`, drag handle (⠿)
- `onDragEnd`: fractional indexing → `PUT /api/ideas/reorder`
- Оптимистичное обновление + rollback при ошибке
- `utils/fractionalIndex.ts`

**Тесты:** T-U01-01..T-U01-07, T-E01-09, T-E01-10, M-09, M-10, M-11

**Критерии готовности:** Карточки перетаскиваются, порядок сохраняется, rollback работает

---

### TASK-007 [frontend] — Модальное окно создания/редактирования идеи
**Описание:** Реализовать форму создания и редактирования идеи.

**User Cases:** UC-002 (создание первой), UC-003 (вставка после), UC-004 (редактирование), UC-005 (удаление)

**Компоненты:**
- `components/IdeaModal.tsx` — props: `show`, `onHide`, `onSave`, `initialData?`, `insertAfter?`
  - Поля: title (required, maxLength=200), description (textarea)
  - Вызывает `POST /api/ideas` или `PUT /api/ideas/:id`
- `components/ConfirmModal.tsx` — переиспользуемый диалог подтверждения
  - Пропсы: `message`, `onConfirm`, `onCancel`

**Тесты:** T-E01-03, T-E01-04 (пустой title), T-E01-05, T-E01-06, T-E01-07

**Критерии готовности:** Создание, редактирование, удаление работают; пустой title не проходит

---

### TASK-008 [frontend] — Детальная страница идеи
**Описание:** Реализовать `/ideas/:id`.

**User Cases:** UC-007 (просмотр), UC-008 (привязка плана), UC-009 (отвязка), UC-010 (переход к плану)

**Компоненты:**
- `pages/Ideas/IdeaDetailPage.tsx`
  - Загружает `GET /api/ideas/:id`
  - Список привязанных планов: ссылки + кнопка отвязать
  - Кнопка "Привязать план" → select dropdown с поиском по `GET /api/plans`
  - `POST /api/ideas/:id/plans` и `DELETE /api/ideas/:id/plans/:planId`

**Тесты:** T-E02-01..T-E02-05

**Критерии готовности:** Детальная страница работает, привязка/отвязка планов работает

---

## Фаза 2: Раздел "Планы"

### TASK-009 [backend] — Plans API
**Описание:** Реализовать все эндпоинты для планов.

**User Cases:** UC-011, UC-012, UC-013, UC-014, UC-015, UC-016

**Эндпоинты согласно API_SPEC.md:**
- `GET /api/plans` — все планы с `tasksCount`, `ideaTitle`
- `GET /api/plans/:id` — план с `tasks[]` (slotsCount, commentsCount)
- `POST /api/plans` — создание
- `PUT /api/plans/:id` — обновление включая смену `idea_id`
- `DELETE /api/plans/:id` — каскадное удаление
- `PUT /api/plans/reorder`

**Файл:** `backend/src/routes/plans.ts`

**Тесты:** T-A02-01..T-A02-08

**Критерии готовности:** Все T-A02 проходят; каскадное удаление проверено

---

### TASK-010 [frontend] — Страница списка планов + drag-and-drop
**Описание:** Реализовать `/plans` аналогично Ideas.

**User Cases:** UC-011 (просмотр), UC-012 (создание), UC-013 (создание с идеей), UC-014 (DnD), UC-015 (удаление с предупреждением)

**Компоненты:**
- `pages/Plans/PlansPage.tsx`
- `pages/Plans/PlanCard.tsx` — с бейджем идеи (кликабельным) и бейджем задач
- Переиспользует: `AddItemButton`, `ConfirmModal`, `LoadingSpinner`, `EmptyState`
- `components/PlanModal.tsx` — создание/редактирование плана
  - Поля: title, description, ideaId (dropdown с поиском)

**Тесты:** T-E03-01, T-E03-02, T-E03-07

**Критерии готовности:** Список, DnD, CRUD планов работают; предупреждение при удалении показывает кол-во задач

---

### TASK-011 [backend] — Tasks API
**Описание:** Реализовать все эндпоинты для задач.

**User Cases:** UC-017, UC-018, UC-019, UC-020, UC-021

**Эндпоинты согласно API_SPEC.md:**
- `GET /api/plans/:planId/tasks`
- `GET /api/tasks/:id` — с `slots[]`, `planTitle`, `ideaId`, `ideaTitle`
- `POST /api/plans/:planId/tasks`
- `PUT /api/tasks/:id` — включая статус
- `DELETE /api/tasks/:id`
- `PUT /api/plans/:planId/tasks/reorder`

**Файл:** `backend/src/routes/tasks.ts`

**Тесты:** T-A03-01..T-A03-07

**Критерии готовности:** Все T-A03 проходят; все 5 статусов проходят валидацию

---

### TASK-012 [frontend] — Детальная страница плана + список задач
**Описание:** Реализовать `/plans/:id`.

**User Cases:** UC-016 (просмотр задач), UC-017 (быстрая смена статуса), UC-018 (создание задачи), UC-019 (DnD задач)

**Компоненты:**
- `pages/Plans/PlanDetailPage.tsx` — шапка плана (с обратной ссылкой на идею)
- `pages/Plans/TaskCard.tsx`
  - Порядковый номер (#1, #2...) по позиции в списке
  - Статус dropdown прямо на карточке
  - Иконки: 📅 (кол-во слотов), 💬 (кол-во комментариев)
  - DnD handle
- `components/TaskModal.tsx` — создание/редактирование задачи
- `components/StatusBadge.tsx` — переиспользуемый

**Тесты:** T-C01-01..T-C01-05, T-E03-03..T-E03-06, T-E03-08

**Критерии готовности:** Задачи отображаются с номерами, DnD работает, статус меняется инлайн

---

### TASK-013 [frontend] — Детальная страница задачи
**Описание:** Реализовать `/plans/:planId/tasks/:taskId`.

**User Cases:** UC-020 (просмотр со слотами), UC-021 (смена статуса), UC-022 (постановка в расписание)

**Компоненты:**
- `pages/Plans/TaskDetailPage.tsx`
  - Breadcrumb: `Идея (если есть) > Название плана > Название задачи`
  - Dropdown/набор кнопок для смены статуса
  - Список слотов задачи: дата, время, комментарий (если есть), от новых к старым
  - Кнопка "Поставить в расписание" → открывает `ScheduleSlotModal`
  - После добавления слота: ссылка "Открыть в расписании →"
- `components/Schedule/ScheduleSlotModal.tsx`
  - Date picker + time picker начало/конец
  - Обработка 409 → ошибка с деталями конфликта

**Тесты:** T-E03-09, T-E06-01..T-E06-04, T-E07-03

**Критерии готовности:** Breadcrumb работает, слоты видны, постановка в расписание из задачи работает

---

## Фаза 3: Раздел "Расписание"

### TASK-014 [backend] — Schedule API
**Описание:** Реализовать все эндпоинты расписания.

**User Cases:** UC-025, UC-026, UC-027, UC-028, UC-029, UC-030, UC-031, UC-032, UC-033, UC-035

**Эндпоинты согласно API_SPEC.md:**
- `GET /api/schedule?dateFrom&dateTo`
- `GET /api/schedule/day/:date`
- `GET /api/schedule/feed?from&limit`
- `POST /api/schedule` — с проверкой пересечений (409 при конфликте)
- `PUT /api/schedule/:id`
- `DELETE /api/schedule/:id`
- `GET /api/notifications/upcoming?minutes`

**Файлы:**
- `backend/src/routes/schedule.ts`
- `backend/src/routes/notifications.ts`
- `backend/src/services/overlapCheck.ts`

**Тесты:** T-A04-01..T-A04-20, T-A05-01..T-A05-05, T-U02-01..T-U02-08

**Критерии готовности:** Все T-A04 и T-A05 проходят; пересечения точно детектируются (включая граничные случаи)

---

### TASK-015 [frontend] — Компонент сетки календаря
**Описание:** Реализовать отображение одного месяца в виде сетки.

**User Cases:** UC-023 (три сетки), UC-024 (навигация), UC-025 (клик на день)

**Компоненты:**
- `components/Calendar/MonthGrid.tsx`
  - Props: `year`, `month`, `selectedDate`, `slots: Record<string, number>`, `onDayClick`
  - Таблица 7 колонок (Пн–Вс), строки — недели
  - Ячейка: номер дня + бейдж `bg-info` если `slots[date] > 0`
  - CSS классы: `today` (сегодня), `selected` (выбран), `past` (прошедший)
- `utils/calendar.ts` — `getDaysInMonth`, `getFirstDayOfWeek`, `isToday`, `isPast`, `formatDate`

**Тесты:** T-F01-01..T-F01-10, T-C03-01..T-C03-09, T-E04-01, T-E04-02

**Критерии готовности:** Все T-C03 и T-F01 проходят; февраль 2024 (29 дней) и февраль 2025 (28 дней) корректны

---

### TASK-016 [frontend] — Навигатор месяцев
**Описание:** Реализовать переключение месяцев.

**User Cases:** UC-024 (переключение)

**Компоненты:**
- `components/Calendar/MonthNavigator.tsx`
  - Кнопки `←` / `→` (`btn btn-sm btn-outline-secondary`)
  - Отображает: "Апрель 2025"
  - `useState` для `{ year, month }`
  - При изменении: callback `onMonthChange(year, month)`

**Тесты:** T-E04-03, T-E04-04

**Критерии готовности:** Переключение вперёд/назад обновляет состояние, декабрь → январь следующего года корректен

---

### TASK-017 [frontend] — Страница расписания — левая панель
**Описание:** Собрать `/schedule` — левая панель с тремя сетками.

**User Cases:** UC-023 (открытие), UC-024 (навигация), UC-025 (клик на день)

**Компоненты:**
- `pages/Schedule/SchedulePage.tsx`
  - Загружает `GET /api/schedule?dateFrom&dateTo` для 3 месяцев
  - Состояние: `selectedDate`, `selectedMonthYear`
  - Левая панель: `MonthNavigator` + 3 × `MonthGrid`
  - При клике на день: `setSelectedDate` → загрузка правой панели

**Тесты:** T-E04-01..T-E04-05

**Критерии готовности:** Три сетки рендерятся, клик на день обновляет selectedDate

---

### TASK-018 [frontend] — Правая панель расписания
**Описание:** Реализовать правую часть расписания.

**User Cases:** UC-025 (будущий день), UC-028 (прошедший день), UC-033 (лента), UC-034 (переход к задаче), UC-035 (сегодня смешанный)

**Компоненты:**
- `pages/Schedule/DayPanel.tsx`
  - Заголовок: полная дата + метки "Сегодня" / "Прошедший день" + 🔒
  - `SlotCard.tsx`:
    - Будущий слот: время, задача (ссылка), план, статус badge, кнопки ✎ и ✕
    - Прошедший слот: те же данные readonly + textarea комментария + кнопка "Сохранить"
  - Кнопка "Добавить задачу" (только будущие/сегодня)
  - Лента будущих задач: группы по датам, каждая группа с заголовком-датой

**Тесты:** T-C04-01..T-C04-07, T-E04-05..T-E04-07, T-E05-07

**Критерии готовности:** Все T-C04 проходят; прошедшие и будущие слоты различаются корректно

---

### TASK-019 [frontend] — Форма добавления слота в расписание
**Описание:** Реализовать создание слота из расписания и из страницы задачи.

**User Cases:** UC-026 (добавление из расписания), UC-022 (добавление из задачи), UC-027 (конфликт пересечения)

**Компоненты:**
- `components/Schedule/AddSlotForm.tsx` (инлайн, раскрывается под кнопкой)
  - Dropdown плана → `GET /api/plans`
  - Dropdown задачи → `GET /api/plans/:planId/tasks` (обновляется при смене плана)
  - Time picker начало / конец
  - Валидация: конец > начало
  - `POST /api/schedule` → при 409: алерт "Пересечение с '[задача]' ([timeFrom]–[timeTo])"
- `components/Schedule/ScheduleSlotModal.tsx` (модал для страницы задачи)
  - Date picker + те же поля

**Тесты:** T-E05-01, T-E05-02, T-E06-01, T-E06-02

**Критерии готовности:** Слот создаётся, конфликты показываются с деталями, оба flow работают

---

### TASK-020 [frontend] — Редактирование и удаление слотов, комментарии
**Описание:** Полное управление слотами по правилам доступности.

**User Cases:** UC-029 (комментарий к прошедшему), UC-030 (редактирование комментария), UC-031 (удаление будущего), UC-032 (редактирование времени), UC-035 (сегодня смешанный)

**Детали:**
- Редактирование времени: inline form в `SlotCard` (только будущие)
  - При сохранении: `PUT /api/schedule/:id` → проверка 409
- Удаление: `DELETE /api/schedule/:id` через `ConfirmModal`
- Сохранение комментария: `PUT /api/schedule/:id` (прошедшие и сегодняшние прошедшие)
- Правило "прошедший": `date < today` ИЛИ `(date === today AND timeFrom < currentTime)`
- Комментарий должен быть виден на странице задачи после сохранения

**Тесты:** T-E05-03..T-E05-07, T-A04-11..T-A04-13

**Критерии готовности:** Все T-E05 проходят; UC-035 (смешанный день) работает корректно

---

## Фаза 4: Уведомления

### TASK-021 [frontend] — Service Worker и браузерные push-уведомления
**Описание:** Реализовать фоновые уведомления.

**User Cases:** UC-036 (запрос разрешения), UC-037 (уведомление), UC-038 (клик по уведомлению)

**Файлы:**
- `frontend/public/sw.js` (браузерный контекст, не TypeScript)
  - `setInterval` 5 минут → `fetch('/api/notifications/upcoming?minutes=20')`
  - IndexedDB (`notified_slots`) — дедупликация
  - `self.registration.showNotification(...)` с `requireInteraction: true`
  - `notificationclick` → `clients.openWindow('/schedule/:date')`
- `frontend/src/utils/serviceWorker.ts`
  - `registerServiceWorker()`, `requestNotificationPermission()`
- `frontend/public/icon-72.png`, `icon-192.png`, `icon-512.png`
- `frontend/public/manifest.json`

**Тесты:** M-01..M-05 (ручной чеклист)

**Критерии готовности:** Уведомление приходит ~15 мин до задачи когда вкладка закрыта; дедупликация работает

---

### TASK-022 [frontend] — In-page Toast уведомления
**Описание:** Реализовать Toast-уведомления при открытом приложении.

**User Cases:** UC-039 (Toast), UC-040 (переход из Toast)

**Компоненты:**
- `components/NotificationPoller.tsx` — `setInterval` 60 сек, `GET /api/notifications/upcoming?minutes=6`
- `components/NotificationToast.tsx` — Bootstrap Toast, `autohide={false}`, кнопка "Открыть"
- `components/ToastContainer.tsx` — фиксирован `position: fixed; bottom: 1rem; right: 1rem`

**Тесты:** M-02, M-04

**Критерии готовности:** Toast появляется ~5 мин до задачи, кнопка "Открыть" ведёт на нужную дату

---

## Фаза 5: Полировка и финализация

### TASK-023 [devops] — Production сборка и офлайн режим
**Описание:** Финализировать Docker образ.

**User Cases:** UC-036 (SW нужен localhost или HTTPS), M-06..M-08

**Детали:**
- Многоэтапный Dockerfile (3 stage: frontend build, backend deps, final)
- Все зависимости в образе, нет запросов в runtime
- Volume для SQLite персистентности
- Healthcheck: `wget -q -O- http://localhost:3000/api/health || exit 1`
- Проверка: `docker network disconnect` + приложение всё работает

**Тесты:** M-06, M-07, M-08

**Критерии готовности:** Полное офлайн тестирование проходит

---

### TASK-024 [frontend] — Состояния загрузки, ошибки, пустые данные
**Описание:** Полноценный UX для всех edge-case состояний.

**User Cases:** UC-001 (пустой список), UC-007 (загрузка)

**Детали:**
- `components/LoadingSpinner.tsx` — `spinner-border text-primary` по центру
- `components/EmptyState.tsx` — props: `icon`, `text`, `actionLabel?`, `onAction?`
  - Идеи пустые: "Пока нет идей. Создайте первую!"
  - Планы пустые: "Нет планов. Создайте первый план."
  - Задачи пустые: "В этом плане нет задач. Добавьте первую."
  - Расписание без задач: "На этот день задач нет."
- `api/client.ts` — axios interceptor → Toast при 5xx ошибках
- Error Boundary в `App.tsx`

**Тесты:** T-E01-02, T-E01-04

**Критерии готовности:** Все пустые состояния показывают осмысленный текст; ошибки API → Toast

---

### TASK-025 [frontend] — Навигация, breadcrumbs и перекрёстные ссылки
**Описание:** Все навигационные связи между разделами.

**User Cases:** UC-010 (идея→план), UC-034 (расписание→задача), UC-041 (полная цепочка), UC-042 (breadcrumb обратно)

**Детали:**
- `components/Breadcrumb.tsx` — принимает массив `{label, href?}`, рендерит Bootstrap breadcrumb
- Добавить в `TaskDetailPage`, `PlanDetailPage`, `IdeaDetailPage`
- Кнопка "← Назад" через `useNavigate(-1)` на всех детальных страницах
- `SlotCard` в расписании: название задачи → `<Link to="/plans/:planId/tasks/:taskId">`
- `PlanCard` с бейджем идеи → `<Link to="/ideas/:ideaId">`
- После создания слота из `TaskDetailPage`: показать `<Link to="/schedule/:date">Открыть в расписании</Link>`

**Тесты:** T-E07-01..T-E07-05, T-E02-04, T-E06-03..T-E06-04

**Критерии готовности:** Все T-E07 проходят; полный маршрут Идея→План→Задача→Расписание и обратно работает

---

## Порядок реализации (рекомендуемый)

```
Фаза 0: TASK-001 → TASK-002 → TASK-003
Фаза 1: TASK-004 + TASK-005 (параллельно) → TASK-006 → TASK-007 → TASK-008
Фаза 2: TASK-009 + TASK-010 (параллельно) → TASK-011 + TASK-012 (параллельно) → TASK-013
Фаза 3: TASK-014 (backend) → TASK-015 → TASK-016 → TASK-017 → TASK-018 → TASK-019 → TASK-020
Фаза 4: TASK-021 + TASK-022 (параллельно)
Фаза 5: TASK-023 → TASK-024 → TASK-025
```

**Итого: 25 задач**

---

## Статусы задач

| Статус | Описание |
|---|---|
| `todo` | Ещё не начата |
| `in_progress` | В работе |
| `done` | Завершена |
| `blocked` | Заблокирована зависимостью |

## Текущий статус всех задач

| Таск | Роль | Статус |
|---|---|---|
| TASK-001 | devops | todo |
| TASK-002 | backend | todo |
| TASK-003 | frontend | todo |
| TASK-004 | backend | todo |
| TASK-005 | frontend | todo |
| TASK-006 | frontend | todo |
| TASK-007 | frontend | todo |
| TASK-008 | frontend | todo |
| TASK-009 | backend | todo |
| TASK-010 | frontend | todo |
| TASK-011 | backend | todo |
| TASK-012 | frontend | todo |
| TASK-013 | frontend | todo |
| TASK-014 | backend | todo |
| TASK-015 | frontend | todo |
| TASK-016 | frontend | todo |
| TASK-017 | frontend | todo |
| TASK-018 | frontend | todo |
| TASK-019 | frontend | todo |
| TASK-020 | frontend | todo |
| TASK-021 | frontend | todo |
| TASK-022 | frontend | todo |
| TASK-023 | devops | todo |
| TASK-024 | frontend | todo |
| TASK-025 | frontend | todo |
