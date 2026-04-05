import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { ideas, plans, tasks, scheduledSlots } from '../db/schema.js'
import { eq, asc, desc, sql, isNull } from 'drizzle-orm'
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
  // GET /plans/:planId/tasks — только корневые задачи плана (без подзадач)
  app.get<{ Params: { planId: string } }>('/plans/:planId/tasks', async (req, reply) => {
    const planId = parseInt(req.params.planId)
    if (isNaN(planId)) return reply.code(400).send({ error: 'Invalid planId' })

    const planExists = await db.select().from(plans).where(eq(plans.id, planId)).limit(1)
    if (!planExists.length) return reply.code(404).send({ error: 'Plan not found' })

    const result = await db
      .select({
        id: tasks.id,
        planId: tasks.planId,
        parentTaskId: tasks.parentTaskId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        order: tasks.order,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        slotsCount: sql<number>`(SELECT COUNT(*) FROM scheduled_slots WHERE task_id = ${tasks.id})`,
        commentsCount: sql<number>`(SELECT COUNT(*) FROM scheduled_slots WHERE task_id = ${tasks.id} AND comment IS NOT NULL AND comment != '')`,
        subtasksCount: sql<number>`(SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = ${tasks.id})`,
      })
      .from(tasks)
      .where(eq(tasks.planId, planId))
      .orderBy(asc(tasks.order))

    // Фильтруем только корневые задачи (parentTaskId IS NULL)
    const rootTasks = result.filter(t => t.parentTaskId == null)

    return reply.send(rootTasks)
  })

  // GET /tasks/:id — задача с полями плана, идеи, slots и subtasks
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
        parentTaskId: tasks.parentTaskId,
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

    // Подзадачи с их subtasksCount
    const subtasksRaw = await db
      .select({
        id: tasks.id,
        planId: tasks.planId,
        parentTaskId: tasks.parentTaskId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        order: tasks.order,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        slotsCount: sql<number>`(SELECT COUNT(*) FROM scheduled_slots WHERE task_id = ${tasks.id})`,
        commentsCount: sql<number>`(SELECT COUNT(*) FROM scheduled_slots WHERE task_id = ${tasks.id} AND comment IS NOT NULL AND comment != '')`,
        subtasksCount: sql<number>`(SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = ${tasks.id})`,
      })
      .from(tasks)
      .where(eq(tasks.parentTaskId, id))
      .orderBy(asc(tasks.order))

    // Заголовок родительской задачи (если есть)
    let parentTaskTitle: string | null = null
    if (taskData[0].parentTaskId) {
      const parent = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, taskData[0].parentTaskId)).limit(1)
      if (parent.length) parentTaskTitle = parent[0].title
    }

    return reply.send({ ...taskData[0], parentTaskTitle, slots, subtasks: subtasksRaw })
  })

  // POST /plans/:planId/tasks — создание корневой задачи
  app.post<{ Params: { planId: string } }>('/plans/:planId/tasks', async (req, reply) => {
    const planId = parseInt(req.params.planId)
    if (isNaN(planId)) return reply.code(400).send({ error: 'Invalid planId' })

    const parsed = createTaskSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const planExists = await db.select().from(plans).where(eq(plans.id, planId)).limit(1)
    if (!planExists.length) return reply.code(404).send({ error: 'Plan not found' })

    const { title, description, status, insertAfter } = parsed.data
    const newOrder = await computeOrder(planId, null, insertAfter ?? null)

    const inserted = await db
      .insert(tasks)
      .values({ planId, parentTaskId: null, title, description: description ?? null, status: status ?? 'new', order: newOrder })
      .returning()

    return reply.code(201).send(inserted[0])
  })

  // POST /tasks/:parentTaskId/subtasks — создание подзадачи
  app.post<{ Params: { parentTaskId: string } }>('/tasks/:parentTaskId/subtasks', async (req, reply) => {
    const parentTaskId = parseInt(req.params.parentTaskId)
    if (isNaN(parentTaskId)) return reply.code(400).send({ error: 'Invalid parentTaskId' })

    const parsed = createTaskSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const parent = await db.select().from(tasks).where(eq(tasks.id, parentTaskId)).limit(1)
    if (!parent.length) return reply.code(404).send({ error: 'Parent task not found' })

    const { title, description, status, insertAfter } = parsed.data
    const planId = parent[0].planId
    const newOrder = await computeSubtaskOrder(parentTaskId, insertAfter ?? null)

    const inserted = await db
      .insert(tasks)
      .values({ planId, parentTaskId, title, description: description ?? null, status: status ?? 'new', order: newOrder })
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
    const updateData: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` }
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status

    const updated = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning()
    return reply.send(updated[0])
  })

  // DELETE /tasks/:id
  app.delete<{ Params: { id: string } }>('/tasks/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const existing = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Task not found' })

    await db.delete(tasks).where(eq(tasks.id, id))
    return reply.code(204).send()
  })

  // PATCH /plans/:planId/tasks/:taskId/order — изменить порядок задачи или подзадачи
  app.patch<{ Params: { planId: string; taskId: string } }>(
    '/plans/:planId/tasks/:taskId/order',
    async (req, reply) => {
      const planId = parseInt(req.params.planId)
      const taskId = parseInt(req.params.taskId)
      if (isNaN(planId) || isNaN(taskId)) return reply.code(400).send({ error: 'Invalid id' })

      const parsed = reorderTaskSchema.safeParse(req.body)
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

      const existing = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
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

// Вычислить order для корневой задачи в плане
async function computeOrder(planId: number, _parentTaskId: null, insertAfter: number | null): Promise<number> {
  if (insertAfter != null) {
    const afterTask = await db.select().from(tasks).where(eq(tasks.id, insertAfter)).limit(1)
    if (afterTask.length) {
      const allSorted = await db
        .select({ id: tasks.id, order: tasks.order })
        .from(tasks)
        .where(eq(tasks.planId, planId))
        .orderBy(asc(tasks.order))
      const idx = allSorted.findIndex(t => t.id === insertAfter)
      const nextOrder = idx !== -1 && idx + 1 < allSorted.length ? allSorted[idx + 1].order : null
      return getOrderBetween(afterTask[0].order, nextOrder)
    }
  }
  const allSorted = await db
    .select({ order: tasks.order })
    .from(tasks)
    .where(eq(tasks.planId, planId))
    .orderBy(asc(tasks.order))
  return getOrderBetween(allSorted.length > 0 ? allSorted[allSorted.length - 1].order : null, null)
}

// Вычислить order для подзадачи
async function computeSubtaskOrder(parentTaskId: number, insertAfter: number | null): Promise<number> {
  if (insertAfter != null) {
    const afterTask = await db.select().from(tasks).where(eq(tasks.id, insertAfter)).limit(1)
    if (afterTask.length) {
      const allSorted = await db
        .select({ id: tasks.id, order: tasks.order })
        .from(tasks)
        .where(eq(tasks.parentTaskId, parentTaskId))
        .orderBy(asc(tasks.order))
      const idx = allSorted.findIndex(t => t.id === insertAfter)
      const nextOrder = idx !== -1 && idx + 1 < allSorted.length ? allSorted[idx + 1].order : null
      return getOrderBetween(afterTask[0].order, nextOrder)
    }
  }
  const allSorted = await db
    .select({ order: tasks.order })
    .from(tasks)
    .where(eq(tasks.parentTaskId, parentTaskId))
    .orderBy(asc(tasks.order))
  return getOrderBetween(allSorted.length > 0 ? allSorted[allSorted.length - 1].order : null, null)
}
