import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { scheduledSlots, tasks, plans, recurrenceRules } from '../db/schema.js'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { checkOverlap } from '../services/overlapCheck.js'
import { generateRecurrenceDates } from '../services/recurrence.js'

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
  recurrenceRuleId: scheduledSlots.recurrenceRuleId,
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
  scope: z.enum(['single', 'future']).optional().default('single'),
})

const createRecurringSchema = z.object({
  taskId: z.number().int(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeFrom: z.string().regex(/^\d{2}:\d{2}$/),
  timeTo: z.string().regex(/^\d{2}:\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['weekly', 'monthly', 'yearly']),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).optional(),
  daysOfMonth: z.array(z.number().int().min(1).max(31)).optional(),
  month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(),
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

  // POST /schedule/recurring — создать повторяющиеся слоты
  app.post('/schedule/recurring', async (req, reply) => {
    const parsed = createRecurringSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const {
      taskId,
      startDate,
      timeFrom,
      timeTo,
      endDate,
      type,
      daysOfWeek,
      daysOfMonth,
      month,
      day,
    } = parsed.data

    // Проверить что задача существует
    const taskExists = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
    if (!taskExists.length) return reply.code(404).send({ error: 'Task not found' })

    // Сгенерировать даты
    const dates = generateRecurrenceDates({
      type,
      startDate,
      endDate,
      daysOfWeek,
      daysOfMonth,
      month,
      day,
    })

    if (dates.length === 0) {
      return reply.code(400).send({ error: 'Нет дат для создания' })
    }

    // Проверить пересечения для каждой даты
    const conflicts: Array<{ date: string; taskTitle: string; timeFrom: string; timeTo: string }> = []
    for (const date of dates) {
      const conflict = await checkOverlap({ date, timeFrom, timeTo })
      if (conflict) {
        conflicts.push({
          date,
          taskTitle: conflict.taskTitle,
          timeFrom: conflict.timeFrom,
          timeTo: conflict.timeTo,
        })
      }
    }

    if (conflicts.length > 0) {
      return reply.code(409).send({
        error: 'Обнаружены пересечения по времени',
        conflicts,
      })
    }

    // Создать recurrence_rule
    const ruleInserted = await db
      .insert(recurrenceRules)
      .values({
        taskId,
        type,
        daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : null,
        daysOfMonth: daysOfMonth ? JSON.stringify(daysOfMonth) : null,
        month: month ?? null,
        day: day ?? null,
        timeFrom,
        timeTo,
        endDate,
      })
      .returning()

    const ruleId = ruleInserted[0].id

    // Вставить все слоты
    const slotsToInsert = dates.map((date) => ({
      taskId,
      date,
      timeFrom,
      timeTo,
      recurrenceRuleId: ruleId,
    }))

    await db.insert(scheduledSlots).values(slotsToInsert)

    return reply.code(201).send({ created: dates.length, ruleId })
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

    const { timeFrom, timeTo, comment, scope } = parsed.data
    const currentSlot = existing[0]

    const newTimeFrom = timeFrom ?? currentSlot.timeFrom
    const newTimeTo = timeTo ?? currentSlot.timeTo
    const timeChanged = timeFrom !== undefined || timeTo !== undefined

    // scope=future with recurrenceRuleId — bulk update
    if (scope === 'future' && currentSlot.recurrenceRuleId !== null) {
      // Find all slots with same rule, date >= current slot date
      const targetSlots = await db
        .select()
        .from(scheduledSlots)
        .where(
          and(
            eq(scheduledSlots.recurrenceRuleId, currentSlot.recurrenceRuleId),
            gte(scheduledSlots.date, currentSlot.date)
          )
        )
        .orderBy(scheduledSlots.date)

      const targetIds = targetSlots.map((s) => s.id)

      // Handle time updates with overlap checks
      if (timeChanged) {
        const conflicts: Array<{ date: string; taskTitle: string; timeFrom: string; timeTo: string }> = []

        for (const target of targetSlots) {
          // Fetch all slots on this date excluding target IDs, check overlap manually
          const sameDateSlots = await db
            .select({
              id: scheduledSlots.id,
              timeFrom: scheduledSlots.timeFrom,
              timeTo: scheduledSlots.timeTo,
              taskTitle: tasks.title,
            })
            .from(scheduledSlots)
            .innerJoin(tasks, eq(scheduledSlots.taskId, tasks.id))
            .where(eq(scheduledSlots.date, target.date))

          for (const other of sameDateSlots) {
            if (targetIds.includes(other.id)) continue
            // Overlap: new_start < existing_end AND new_end > existing_start
            if (newTimeFrom < other.timeTo && newTimeTo > other.timeFrom) {
              conflicts.push({
                date: target.date,
                taskTitle: other.taskTitle,
                timeFrom: other.timeFrom,
                timeTo: other.timeTo,
              })
              break // one conflict per date is enough
            }
          }
        }

        if (conflicts.length > 0) {
          return reply.code(409).send({
            error: 'Обнаружены пересечения по времени',
            conflicts,
          })
        }

        // Apply time updates to all target slots
        const bulkTimeUpdate: Record<string, unknown> = {
          updatedAt: sql`(datetime('now'))`,
        }
        if (timeFrom !== undefined) bulkTimeUpdate.timeFrom = timeFrom
        if (timeTo !== undefined) bulkTimeUpdate.timeTo = timeTo

        await db
          .update(scheduledSlots)
          .set(bulkTimeUpdate)
          .where(inArray(scheduledSlots.id, targetIds))

        // Update recurrenceRules row's timeFrom/timeTo
        const ruleUpdate: Record<string, unknown> = {}
        if (timeFrom !== undefined) ruleUpdate.timeFrom = timeFrom
        if (timeTo !== undefined) ruleUpdate.timeTo = timeTo
        if (Object.keys(ruleUpdate).length > 0) {
          await db
            .update(recurrenceRules)
            .set(ruleUpdate)
            .where(eq(recurrenceRules.id, currentSlot.recurrenceRuleId))
        }
      }

      // Comment only updates the single slot
      if (comment !== undefined) {
        await db
          .update(scheduledSlots)
          .set({
            comment,
            updatedAt: sql`(datetime('now'))`,
          })
          .where(eq(scheduledSlots.id, id))
      }

      const result = await db
        .select(slotSelect)
        .from(scheduledSlots)
        .innerJoin(tasks, eq(scheduledSlots.taskId, tasks.id))
        .innerJoin(plans, eq(tasks.planId, plans.id))
        .where(eq(scheduledSlots.id, id))
        .limit(1)

      return reply.send(result[0])
    }

    // scope=single OR no recurrenceRuleId — existing behavior
    if (timeChanged) {
      const conflict = await checkOverlap({
        date: currentSlot.date,
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

    const query = req.query as { scope?: string }
    const scope = query.scope ?? 'single'
    const currentSlot = existing[0]

    if (scope === 'future' && currentSlot.recurrenceRuleId !== null) {
      const ruleId = currentSlot.recurrenceRuleId
      // Delete all slots with same rule where date >= current slot date
      await db
        .delete(scheduledSlots)
        .where(
          and(
            eq(scheduledSlots.recurrenceRuleId, ruleId),
            gte(scheduledSlots.date, currentSlot.date)
          )
        )

      // If no more slots remain for this rule, delete the rule
      const remaining = await db
        .select({ id: scheduledSlots.id })
        .from(scheduledSlots)
        .where(eq(scheduledSlots.recurrenceRuleId, ruleId))
        .limit(1)
      if (remaining.length === 0) {
        await db.delete(recurrenceRules).where(eq(recurrenceRules.id, ruleId))
      }

      return reply.code(204).send()
    }

    await db.delete(scheduledSlots).where(eq(scheduledSlots.id, id))

    return reply.code(204).send()
  })
}
