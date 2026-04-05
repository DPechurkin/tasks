import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { scheduledSlots, tasks, plans } from '../db/schema.js'
import { eq, gte, lte, sql } from 'drizzle-orm'
import { checkOverlap } from '../services/overlapCheck.js'

const slotSelect = {
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
}

const createSlotSchema = z.object({
  taskId: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeFrom: z.string().regex(/^\d{2}:\d{2}$/),
  timeTo: z.string().regex(/^\d{2}:\d{2}$/),
})

const updateSlotSchema = z.object({
  timeFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timeTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  comment: z.string().optional().nullable(),
})

function groupSlotsByDate(slots: Array<Record<string, unknown> & { date: string }>) {
  const result: Record<string, typeof slots> = {}
  for (const slot of slots) {
    if (!result[slot.date]) result[slot.date] = []
    result[slot.date].push(slot)
  }
  return result
}

export async function scheduleRoutes(app: FastifyInstance) {
  // GET /schedule?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
  app.get('/schedule', async (req, reply) => {
    const query = req.query as { dateFrom?: string; dateTo?: string }
    if (!query.dateFrom || !query.dateTo) {
      return reply.code(400).send({ error: 'dateFrom and dateTo are required' })
    }

    const slots = await db
      .select(slotSelect)
      .from(scheduledSlots)
      .innerJoin(tasks, eq(scheduledSlots.taskId, tasks.id))
      .innerJoin(plans, eq(tasks.planId, plans.id))
      .where(
        sql`${scheduledSlots.date} >= ${query.dateFrom} AND ${scheduledSlots.date} <= ${query.dateTo}`
      )
      .orderBy(scheduledSlots.date, scheduledSlots.timeFrom)

    return reply.send(groupSlotsByDate(slots as Array<Record<string, unknown> & { date: string }>))
  })

  // GET /schedule/feed?from=YYYY-MM-DD&limit=90
  app.get('/schedule/feed', async (req, reply) => {
    const query = req.query as { from?: string; limit?: string }
    const from = query.from || new Date().toISOString().split('T')[0]
    const limit = Math.min(parseInt(query.limit || '90'), 365)

    // Вычислить dateTo = from + limit дней
    const fromDate = new Date(from)
    const toDate = new Date(fromDate)
    toDate.setDate(toDate.getDate() + limit)
    const dateTo = toDate.toISOString().split('T')[0]

    const slots = await db
      .select(slotSelect)
      .from(scheduledSlots)
      .innerJoin(tasks, eq(scheduledSlots.taskId, tasks.id))
      .innerJoin(plans, eq(tasks.planId, plans.id))
      .where(
        sql`${scheduledSlots.date} >= ${from} AND ${scheduledSlots.date} <= ${dateTo}`
      )
      .orderBy(scheduledSlots.date, scheduledSlots.timeFrom)

    return reply.send(groupSlotsByDate(slots as Array<Record<string, unknown> & { date: string }>))
  })

  // GET /schedule/day/:date
  app.get<{ Params: { date: string } }>('/schedule/day/:date', async (req, reply) => {
    const { date } = req.params

    const slots = await db
      .select(slotSelect)
      .from(scheduledSlots)
      .innerJoin(tasks, eq(scheduledSlots.taskId, tasks.id))
      .innerJoin(plans, eq(tasks.planId, plans.id))
      .where(eq(scheduledSlots.date, date))
      .orderBy(scheduledSlots.timeFrom)

    return reply.send(slots)
  })

  // POST /schedule — создать слот
  app.post('/schedule', async (req, reply) => {
    const parsed = createSlotSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const { taskId, date, timeFrom, timeTo } = parsed.data

    // Проверить что задача существует
    const taskExists = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
    if (!taskExists.length) return reply.code(404).send({ error: 'Task not found' })

    // Проверить пересечения
    const conflict = await checkOverlap({ date, timeFrom, timeTo })
    if (conflict) {
      return reply.code(409).send({
        error: `Time conflict with "${conflict.taskTitle}" (${conflict.timeFrom}–${conflict.timeTo})`,
        conflict,
      })
    }

    const inserted = await db
      .insert(scheduledSlots)
      .values({ taskId, date, timeFrom, timeTo })
      .returning()

    // Возвращаем с join данными
    const result = await db
      .select(slotSelect)
      .from(scheduledSlots)
      .innerJoin(tasks, eq(scheduledSlots.taskId, tasks.id))
      .innerJoin(plans, eq(tasks.planId, plans.id))
      .where(eq(scheduledSlots.id, inserted[0].id))
      .limit(1)

    return reply.code(201).send(result[0])
  })

  // PUT /schedule/:id — обновить слот
  app.put<{ Params: { id: string } }>('/schedule/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const parsed = updateSlotSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const existing = await db
      .select()
      .from(scheduledSlots)
      .where(eq(scheduledSlots.id, id))
      .limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Slot not found' })

    const { timeFrom, timeTo, comment } = parsed.data

    // Если меняется время — проверить пересечения
    const newTimeFrom = timeFrom ?? existing[0].timeFrom
    const newTimeTo = timeTo ?? existing[0].timeTo

    if (timeFrom !== undefined || timeTo !== undefined) {
      const conflict = await checkOverlap({
        date: existing[0].date,
        timeFrom: newTimeFrom,
        timeTo: newTimeTo,
        excludeId: id,
      })
      if (conflict) {
        return reply.code(409).send({
          error: `Time conflict with "${conflict.taskTitle}" (${conflict.timeFrom}–${conflict.timeTo})`,
          conflict,
        })
      }
    }

    const updateData: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    }
    if (timeFrom !== undefined) updateData.timeFrom = timeFrom
    if (timeTo !== undefined) updateData.timeTo = timeTo
    if (comment !== undefined) updateData.comment = comment

    await db.update(scheduledSlots).set(updateData).where(eq(scheduledSlots.id, id))

    const result = await db
      .select(slotSelect)
      .from(scheduledSlots)
      .innerJoin(tasks, eq(scheduledSlots.taskId, tasks.id))
      .innerJoin(plans, eq(tasks.planId, plans.id))
      .where(eq(scheduledSlots.id, id))
      .limit(1)

    return reply.send(result[0])
  })

  // DELETE /schedule/:id
  app.delete<{ Params: { id: string } }>('/schedule/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const existing = await db
      .select()
      .from(scheduledSlots)
      .where(eq(scheduledSlots.id, id))
      .limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Slot not found' })

    await db.delete(scheduledSlots).where(eq(scheduledSlots.id, id))

    return reply.code(204).send()
  })
}
