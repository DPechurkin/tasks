import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const ideas = sqliteTable('ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  order: real('order').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const plans = sqliteTable('plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ideaId: integer('idea_id').references(() => ideas.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  order: real('order').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  parentTaskId: integer('parent_task_id'), // FK to tasks(id) ON DELETE CASCADE — задаётся в миграции
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', {
    enum: ['new', 'in_progress', 'done', 'done_partially', 'abandoned'],
  })
    .notNull()
    .default('new'),
  order: real('order').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const scheduledSlots = sqliteTable('scheduled_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  timeFrom: text('time_from').notNull(), // HH:MM
  timeTo: text('time_to').notNull(), // HH:MM
  comment: text('comment'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
})

// TypeScript types
export type Idea = typeof ideas.$inferSelect
export type NewIdea = typeof ideas.$inferInsert

export type Plan = typeof plans.$inferSelect
export type NewPlan = typeof plans.$inferInsert

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

export type ScheduledSlot = typeof scheduledSlots.$inferSelect
export type NewScheduledSlot = typeof scheduledSlots.$inferInsert
