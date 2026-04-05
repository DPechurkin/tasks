# Momentum — Локальный планировщик идей и задач

## Концепция

Momentum — офлайн веб-приложение для одного пользователя, реализующее цепочку:

```
Идея → План → Задача → Расписание
```

Каждый уровень конкретизирует предыдущий. Идея — это вдохновение и вектор. План — конкретная цель с набором шагов. Задача — атомарный шаг к цели. Расписание — когда именно ты работаешь над задачей.

---

## Карта документации

| Файл | Содержание |
|---|---|
| [README.md](README.md) | Концепция, стек, быстрый старт |
| [FUNCTIONAL_SPEC.md](FUNCTIONAL_SPEC.md) | Полная спецификация функционала по разделам |
| [DATA_MODEL.md](DATA_MODEL.md) | ER-модель, таблицы, поля, связи |
| [API_SPEC.md](API_SPEC.md) | REST API — эндпоинты, запросы, ответы |
| [UI_SPEC.md](UI_SPEC.md) | Описание интерфейса, компоненты, поведение |
| [NOTIFICATIONS.md](NOTIFICATIONS.md) | Спецификация уведомлений и Service Worker |
| [TASKS.md](../TASKS.md) | Разбивка на таски по ролям и фазам |

---

## Технологический стек

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Fastify 4
- **ORM**: Drizzle ORM
- **База данных**: SQLite (через better-sqlite3)
- **Валидация**: Zod

### Frontend
- **Framework**: React 18 + TypeScript
- **Сборщик**: Vite 5
- **UI**: Bootstrap 5.3 dark theme (локально, без CDN)
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable
- **Маршрутизация**: React Router v6
- **HTTP клиент**: Axios (локально)
- **Даты**: date-fns (локально)
- **Уведомления**: Web Notifications API + Service Worker

### Инфраструктура
- **Контейнер**: Docker (один контейнер)
- **Сборка**: Node.js собирает React → Fastify отдаёт статику + API
- **Данные**: SQLite файл в Docker volume (персистентность)

---

## Быстрый старт

```bash
# Клонировать репозиторий
git clone ...

# Запустить
docker-compose up -d

# Открыть в браузере
http://localhost:3000
```

---

## Структура проекта

```
momentum/
├── docker-compose.yml
├── Dockerfile
├── backend/
│   ├── src/
│   │   ├── routes/          # Fastify route handlers
│   │   │   ├── ideas.ts
│   │   │   ├── plans.ts
│   │   │   ├── tasks.ts
│   │   │   └── schedule.ts
│   │   ├── db/
│   │   │   ├── schema.ts    # Drizzle схема
│   │   │   └── index.ts     # DB connection
│   │   ├── services/        # Бизнес-логика
│   │   └── app.ts           # Fastify app
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Переиспользуемые компоненты
│   │   ├── pages/           # Страницы разделов
│   │   │   ├── Ideas/
│   │   │   ├── Plans/
│   │   │   └── Schedule/
│   │   ├── api/             # Axios клиенты
│   │   ├── store/           # React Context / состояние
│   │   ├── types/           # TypeScript типы
│   │   └── sw.ts            # Service Worker
│   └── package.json
└── docs/
    └── *.md
```
