import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { ideas, plans, tasks } from '../db/schema.js'
import { eq, asc, sql, count } from 'drizzle-orm'
import { getOrderBetween } from '../utils/fractionalIndex.js'

const createPlanSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  ideaId: z.number().int().optional().nullable(),
  insertAfter: z.number().int().optional().nullable(),
})

const updatePlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  ideaId: z.number().int().optional().nullable(),
})

const reorderPlanSchema = z.object({
  newOrder: z.number(),
})

export async function plansRoutes(app: FastifyInstance) {
  // GET /plans — все планы с tasksCount и ideaTitle
  app.get('/plans', async (_req, reply) => {
    const result = await db
      .select({
        id: plans.id,
        ideaId: plans.ideaId,
        ideaTitle: ideas.title,
        title: plans.title,
        description: plans.description,
        order: plans.order,
        createdAt: plans.createdAt,
        updatedAt: plans.updatedAt,
        tasksCount: count(tasks.id),
      })
      .from(plans)
      .leftJoin(ideas, eq(ideas.id, plans.ideaId))
      .leftJoin(tasks, eq(tasks.planId, plans.id))
      .groupBy(plans.id)
      .orderBy(asc(plans.order))

    return reply.send(result)
  })

  // GET /plans/:id — план с tasks[]
  app.get<{ Params: { id: string } }>('/plans/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const plan = await db
      .select({
        id: plans.id,
        ideaId: plans.ideaId,
        ideaTitle: ideas.title,
        title: plans.title,
        description: plans.description,
        order: plans.order,
        createdAt: plans.createdAt,
        updatedAt: plans.updatedAt,
      })
      .from(plans)
      .leftJoin(ideas, eq(ideas.id, plans.ideaId))
      .where(eq(plans.id, id))
      .limit(1)

    if (!plan.length) return reply.code(404).send({ error: 'Plan not found' })

    const planTasks = await db
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
      .where(eq(tasks.planId, id))
      .orderBy(asc(tasks.order))

    return reply.send({ ...plan[0], tasks: planTasks })
  })

  // POST /plans — создание
  app.post('/plans', async (req, reply) => {
    const parsed = createPlanSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const { title, description, ideaId, insertAfter } = parsed.data

    // Проверить ideaId если передан
    if (ideaId != null) {
      const ideaExists = await db.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1)
      if (!ideaExists.length) return reply.code(404).send({ error: 'Idea not found' })
    }

    let prevOrder: number | null = null
    let nextOrder: number | null = null

    if (insertAfter != null) {
      const afterPlan = await db.select().from(plans).where(eq(plans.id, insertAfter)).limit(1)
      if (afterPlan.length) {
        prevOrder = afterPlan[0].order
        const allSorted = await db
          .select({ id: plans.id, order: plans.order })
          .from(plans)
          .orderBy(asc(plans.order))
        const idx = allSorted.findIndex((p) => p.id === insertAfter)
        if (idx !== -1 && idx + 1 < allSorted.length) {
          nextOrder = allSorted[idx + 1].order
        }
      }
    } else {
      const allSorted = await db
        .select({ order: plans.order })
        .from(plans)
        .orderBy(asc(plans.order))
      if (allSorted.length > 0) {
        prevOrder = allSorted[allSorted.length - 1].order
      }
    }

    const newOrder = getOrderBetween(prevOrder, nextOrder)

    const inserted = await db
      .insert(plans)
      .values({
        title,
        description: description ?? null,
        ideaId: ideaId ?? null,
        order: newOrder,
      })
      .returning()

    return reply.code(201).send(inserted[0])
  })

  // PUT /plans/:id — обновление
  app.put<{ Params: { id: string } }>('/plans/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const parsed = updatePlanSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const existing = await db.select().from(plans).where(eq(plans.id, id)).limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Plan not found' })

    const { title, description, ideaId } = parsed.data

    // Проверить ideaId если передан
    if (ideaId != null) {
      const ideaExists = await db.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1)
      if (!ideaExists.length) return reply.code(404).send({ error: 'Idea not found' })
    }

    const updateData: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    }
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (ideaId !== undefined) updateData.ideaId = ideaId

    const updated = await db
      .update(plans)
      .set(updateData)
      .where(eq(plans.id, id))
      .returning()

    return reply.send(updated[0])
  })

  // DELETE /plans/:id
  app.delete<{ Params: { id: string } }>('/plans/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const existing = await db.select().from(plans).where(eq(plans.id, id)).limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Plan not found' })

    // Каскадное удаление через FK (tasks → slots через CASCADE)
    await db.delete(plans).where(eq(plans.id, id))

    return reply.code(204).send()
  })

  // PATCH /plans/:id/order — изменить порядок
  app.patch<{ Params: { id: string } }>('/plans/:id/order', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const parsed = reorderPlanSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const existing = await db.select().from(plans).where(eq(plans.id, id)).limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Plan not found' })

    const updated = await db
      .update(plans)
      .set({ order: parsed.data.newOrder, updatedAt: sql`(datetime('now'))` })
      .where(eq(plans.id, id))
      .returning()

    return reply.send(updated[0])
  })
}
