import { afterAll } from 'vitest'
import { rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// Use a temporary file-based DB so that both the routes (which import the
// global `db` from db/index.ts) and the test helpers (which need to reset
// state between tests) share the exact same storage. Must be set BEFORE
// any module imports `db/index.ts`.
const TEST_DB = join(tmpdir(), 'momentum-test.db')
process.env.DB_PATH = TEST_DB

afterAll(() => {
  try {
    rmSync(TEST_DB)
  } catch {
    // ignore
  }
})
