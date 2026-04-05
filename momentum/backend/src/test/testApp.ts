import Fastify, { type FastifyInstance } from 'fastify'
import { sqlite, db } from '../db/index.js'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { scheduledSlots, tasks, plans, ideas } from '../db/schema.js'
import { ideasRoutes } from '../routes/ideas.js'
import { plansRoutes } from '../routes/plans.js'
import { tasksRoutes } from '../routes/tasks.js'
import { scheduleRoutes } from '../routes/schedule.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let migrated = false

function ensureMigrated(): void {
  if (!migrated) {
    migrate(db, { migrationsFolder: join(__dirname, '../../drizzle') })
    migrated = true
  }
}

/**
 * Creates a Fastify instance wired with the real application routes.
 * Routes share the global `db` from db/index.ts, which is bound to the
 * file specified by DB_PATH (set in globalSetup.ts).
 */
export async function createTestApp(): Promise<FastifyInstance> {
  ensureMigrated()

  const app = Fastify({ logger: false })
  await app.register(ideasRoutes, { prefix: '/api' })
  await app.register(plansRoutes, { prefix: '/api' })
  await app.register(tasksRoutes, { prefix: '/api' })
  await app.register(scheduleRoutes, { prefix: '/api' })
  await app.ready()
  return app
}

/**
 * Removes all rows from every table. Use in beforeEach to get isolation
 * between tests. Order matters because of FK constraints.
 */
export async function resetDb(): Promise<void> {
  ensureMigrated()
  // Use raw sqlite to avoid drizzle's query builder overhead and to be
  // resilient to ordering quirks with foreign keys.
  sqlite.exec('PRAGMA foreign_keys = OFF;')
  sqlite.exec('DELETE FROM scheduled_slots;')
  sqlite.exec('DELETE FROM tasks;')
  sqlite.exec('DELETE FROM plans;')
  sqlite.exec('DELETE FROM ideas;')
  // Reset autoincrement counters so tests get predictable ids
  sqlite.exec(
    "DELETE FROM sqlite_sequence WHERE name IN ('scheduled_slots','tasks','plans','ideas');"
  )
  sqlite.exec('PRAGMA foreign_keys = ON;')
  // Touch the drizzle tables object so the import isn't tree-shaken
  void scheduledSlots
  void tasks
  void plans
  void ideas
}
