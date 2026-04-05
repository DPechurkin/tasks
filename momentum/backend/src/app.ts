import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { runMigrations } from './db/migrate.js'
import { ideasRoutes } from './routes/ideas.js'
import { plansRoutes } from './routes/plans.js'
import { tasksRoutes } from './routes/tasks.js'
import { scheduleRoutes } from './routes/schedule.js'
import { notificationsRoutes } from './routes/notifications.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = Fastify({ logger: true })

await app.register(fastifyCors, { origin: true })

// Health check
app.get('/api/health', async () => {
  return { ok: true, timestamp: new Date().toISOString() }
})

// Регистрация роутов
await app.register(ideasRoutes, { prefix: '/api' })
await app.register(plansRoutes, { prefix: '/api' })
await app.register(tasksRoutes, { prefix: '/api' })
await app.register(scheduleRoutes, { prefix: '/api' })
await app.register(notificationsRoutes, { prefix: '/api' })

// Статика и SPA fallback — только в production (если папка public существует)
// __dirname = /app/backend/dist/ → public/ лежит рядом с app.js
const publicDir = join(__dirname, 'public')
if (existsSync(publicDir)) {
  const fastifyStatic = await import('@fastify/static')
  await app.register(fastifyStatic.default, {
    root: publicDir,
    prefix: '/',
    wildcard: false,
  })

  // SPA fallback: все запросы не начинающиеся с /api → index.html
  app.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api')) {
      return reply.sendFile('index.html')
    }
    reply.code(404).send({ error: 'Not Found' })
  })
} else {
  // Dev режим — папка public не существует
  app.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api')) {
      return reply.code(200).send(
        '<html><body><p>Frontend not built. Run <code>npm run build</code> in the frontend directory.</p></body></html>'
      )
    }
    reply.code(404).send({ error: 'Not Found' })
  })
}

runMigrations()

const PORT = parseInt(process.env.PORT || '3000')
await app.listen({ port: PORT, host: '0.0.0.0' })
