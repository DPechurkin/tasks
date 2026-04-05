import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { ideas, plans, tasks, scheduledSlots } from '../db/schema.js'
import { eq, asc, desc, sql, count } from 'drizzle-orm'
import { getOrderBetween } from '../utils/fractionalIndex.js'

const taskStatusEnum = z.enum(['new', 'in_progress', 'done', 'done_partially', 'abandoned'])

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  status: taskStatusEnum.optional(),
  insertAfter: z.number().int().optional().nullable(),
})

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: taskStatusEnum.optional(),
})

const reorderTaskSchema = z.object({
  newOrder: z.number(),
})

export async function tasksRoutes(app: FastifyInstance) {
  // GET /plans/:planId/tasks — задачи плана с slotsCount и commentsCount
  app.get<{ Params: { planId: string } }>('/plans/:planId/tasks', async (req, reply) => {
    const planId = parseInt(req.params.planId)
    if (isNaN(planId)) return reply.code(400).send({ error: 'Invalid planId' })

    const planExists = await db.select().from(plans).where(eq(plans.id, planId)).limit(1)
    if (!planExists.length) return reply.code(404).send({ error: 'Plan not found' })

    const result = await db
      .select({
        id: tasks.id,
        planId: tasks.planId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        order: tasks.order,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        slotsCount: sql<number>`(SELECT COUNT(*) FROM scheduled_slots WHERE task_id = ${tasks.id})`,
        commentsCount: sql<number>`(SELECT COUNT(*) FROM scheduled_slots WHERE task_id = ${tasks.id} AND comment IS NOT NULL AND comment != '')`,
      })
      .from(tasks)
      .where(eq(tasks.planId, planId))
      .orderBy(asc(tasks.order))

    return reply.send(result)
  })

  // GET /tasks/:id — задача с полями плана, идеи и slots[]
  app.get<{ Params: { id: string } }>('/tasks/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const taskData = await db
      .select({
        id: tasks.id,
        planId: plans.id,
        planTitle: plans.title,
        ideaId: ideas.id,
        ideaTitle: ideas.title,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        order: tasks.order,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(plans, eq(plans.id, tasks.planId))
      .leftJoin(ideas, eq(ideas.id, plans.ideaId))
      .where(eq(tasks.id, id))
      .limit(1)

    if (!taskData.length) return reply.code(404).send({ error: 'Task not found' })

    const slots = await db
      .select()
      .from(scheduledSlots)
      .where(eq(scheduledSlots.taskId, id))
      .orderBy(desc(scheduledSlots.date), desc(scheduledSlots.timeFrom))

    return reply.send({ ...taskData[0], slots })
  })

  // POST /plans/:planId/tasks — создание задачи
  app.post<{ Params: { planId: string } }>('/plans/:planId/tasks', async (req, reply) => {
    const planId = parseInt(req.params.planId)
    if (isNaN(planId)) return reply.code(400).send({ error: 'Invalid planId' })

    const parsed = createTaskSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const planExists = await db.select().from(plans).where(eq(plans.id, planId)).limit(1)
    if (!planExists.length) return reply.code(404).send({ error: 'Plan not found' })

    const { title, description, status, insertAfter } = parsed.data

    let prevOrder: number | null = null
    let nextOrder: number | null = null

    if (insertAfter != null) {
      const afterTask = await db.select().from(tasks).where(eq(tasks.id, insertAfter)).limit(1)
      if (afterTask.length) {
        prevOrder = afterTask[0].order
        const allSorted = await db
          .select({ id: tasks.id, order: tasks.order })
          .from(tasks)
          .where(eq(tasks.planId, planId))
          .orderBy(asc(tasks.order))
        const idx = allSorted.findIndex((t) => t.id === insertAfter)
        if (idx !== -1 && idx + 1 < allSorted.length) {
          nextOrder = allSorted[idx + 1].order
        }
      }
    } else {
      const allSorted = await db
        .select({ order: tasks.order })
        .from(tasks)
        .where(eq(tasks.planId, planId))
        .orderBy(asc(tasks.order))
      if (allSorted.length > 0) {
        prevOrder = allSorted[allSorted.length - 1].order
      }
    }

    const newOrder = getOrderBetween(prevOrder, nextOrder)

    const inserted = await db
      .insert(tasks)
      .values({
        planId,
        title,
        description: description ?? null,
        status: status ?? 'new',
        order: newOrder,
      })
      .returning()

    return reply.code(201).send(inserted[0])
  })

  // PUT /tasks/:id — обновление задачи
  app.put<{ Params: { id: string } }>('/tasks/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const parsed = updateTaskSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const existing = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Task not found' })

    const { title, description, status } = parsed.data

    const updateData: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    }
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status

    const updated = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning()

    return reply.send(updated[0])
  })

  // DELETE /tasks/:id
  app.delete<{ Params: { id: string } }>('/tasks/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const existing = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Task not found' })

    // Каскадное удаление через FK (slots через CASCADE)
    await db.delete(tasks).where(eq(tasks.id, id))

    return reply.code(204).send()
  })

  // PATCH /plans/:planId/tasks/:taskId/order — изменить порядок задачи
  app.patch<{ Params: { planId: string; taskId: string } }>(
    '/plans/:planId/tasks/:taskId/order',
    async (req, reply) => {
      const planId = parseInt(req.params.planId)
      const taskId = parseInt(req.params.taskId)
      if (isNaN(planId) || isNaN(taskId)) return reply.code(400).send({ error: 'Invalid id' })

      const parsed = reorderTaskSchema.safeParse(req.body)
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

      const existing = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1)
      if (!existing.length) return reply.code(404).send({ error: 'Task not found' })

      const updated = await db
        .update(tasks)
        .set({ order: parsed.data.newOrder, updatedAt: sql`(datetime('now'))` })
        .where(eq(tasks.id, taskId))
        .returning()

      return reply.send(updated[0])
    }
  )
}
