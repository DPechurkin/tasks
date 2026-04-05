import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './index.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function runMigrations() {
  migrate(db, { migrationsFolder: join(__dirname, '../../drizzle') })
  console.log('Migrations applied')
}
