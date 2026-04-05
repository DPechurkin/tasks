import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { scheduledSlots, tasks, plans } from '../db/schema.js'
import { eq, sql } from 'drizzle-orm'

export async function notificationsRoutes(app: FastifyInstance) {
  // GET /notifications/upcoming?minutes=20
  app.get('/notifications/upcoming', async (req, reply) => {
    const query = req.query as { minutes?: string }
    const minutes = parseInt(query.minutes || '20')

    const slots = await db
      .select({
        id: scheduledSlots.id,
        taskId: scheduledSlots.taskId,
        taskTitle: tasks.title,
        taskStatus: tasks.status,
        planId: plans.id,
        planTitle: plans.title,
        date: scheduledSlots.date,
        timeFrom: scheduledSlots.timeFrom,
        timeTo: scheduledSlots.timeTo,
        comment: scheduledSlots.comment,
        createdAt: scheduledSlots.createdAt,
        updatedAt: scheduledSlots.updatedAt,
      })
      .from(scheduledSlots)
      .innerJoin(tasks, eq(scheduledSlots.taskId, tasks.id))
      .innerJoin(plans, eq(tasks.planId, plans.id))
      .where(
        sql`
          ${scheduledSlots.date} = date('now', 'localtime')
          AND ${scheduledSlots.timeFrom} >= time('now', 'localtime')
          AND ${scheduledSlots.timeFrom} <= time('now', '+${sql.raw(String(minutes))} minutes', 'localtime')
        `
      )
      .orderBy(scheduledSlots.timeFrom)

    // Вычислить minutesUntilStart для каждого слота
    const now = new Date()
    const currentTimeStr = now.toTimeString().slice(0, 5) // HH:MM

    const result = slots.map((slot) => {
      const [slotH, slotM] = slot.timeFrom.split(':').map(Number)
      const [nowH, nowM] = currentTimeStr.split(':').map(Number)
      const minutesUntilStart = (slotH * 60 + slotM) - (nowH * 60 + nowM)
      return { ...slot, minutesUntilStart }
    })

    return reply.send(result)
  })
}
