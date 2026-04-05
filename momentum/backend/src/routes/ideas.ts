import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { ideas, plans } from '../db/schema.js'
import { eq, asc, sql, count } from 'drizzle-orm'
import { getOrderBetween } from '../utils/fractionalIndex.js'

const createIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  insertAfter: z.number().int().optional().nullable(),
})

const updateIdeaSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
})

const reorderIdeaSchema = z.object({
  newOrder: z.number(),
})

const linkPlanSchema = z.object({
  planId: z.number().int(),
})

export async function ideasRoutes(app: FastifyInstance) {
  // GET /ideas — все идеи с plansCount
  app.get('/ideas', async (_req, reply) => {
    const result = await db
      .select({
        id: ideas.id,
        title: ideas.title,
        description: ideas.description,
        order: ideas.order,
        createdAt: ideas.createdAt,
        updatedAt: ideas.updatedAt,
        plansCount: count(plans.id),
      })
      .from(ideas)
      .leftJoin(plans, eq(plans.ideaId, ideas.id))
      .groupBy(ideas.id)
      .orderBy(asc(ideas.order))

    return reply.send(result)
  })

  // GET /ideas/:id — идея с планами
  app.get<{ Params: { id: string } }>('/ideas/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const idea = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1)
    if (!idea.length) return reply.code(404).send({ error: 'Idea not found' })

    const linkedPlans = await db.select().from(plans).where(eq(plans.ideaId, id))
    return reply.send({ ...idea[0], plans: linkedPlans })
  })

  // POST /ideas — создание
  app.post('/ideas', async (req, reply) => {
    const parsed = createIdeaSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const { title, description, insertAfter } = parsed.data

    let prevOrder: number | null = null
    let nextOrder: number | null = null

    if (insertAfter != null) {
      const afterIdea = await db.select().from(ideas).where(eq(ideas.id, insertAfter)).limit(1)
      if (afterIdea.length) {
        prevOrder = afterIdea[0].order
        // Найти следующую идею по order
        const allSorted = await db
          .select({ id: ideas.id, order: ideas.order })
          .from(ideas)
          .orderBy(asc(ideas.order))
        const idx = allSorted.findIndex((i) => i.id === insertAfter)
        if (idx !== -1 && idx + 1 < allSorted.length) {
          nextOrder = allSorted[idx + 1].order
        }
      }
    } else {
      // Вставить в конец
      const allSorted = await db
        .select({ order: ideas.order })
        .from(ideas)
        .orderBy(asc(ideas.order))
      if (allSorted.length > 0) {
        prevOrder = allSorted[allSorted.length - 1].order
      }
    }

    const newOrder = getOrderBetween(prevOrder, nextOrder)

    const inserted = await db
      .insert(ideas)
      .values({ title, description: description ?? null, order: newOrder })
      .returning()

    return reply.code(201).send(inserted[0])
  })

  // PUT /ideas/:id — обновление
  app.put<{ Params: { id: string } }>('/ideas/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const parsed = updateIdeaSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const existing = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Idea not found' })

    const { title, description } = parsed.data
    const updateData: Record<string, unknown> = {
      updatedAt: sql`(datetime('now'))`,
    }
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description

    const updated = await db
      .update(ideas)
      .set(updateData)
      .where(eq(ideas.id, id))
      .returning()

    return reply.send(updated[0])
  })

  // DELETE /ideas/:id
  app.delete<{ Params: { id: string } }>('/ideas/:id', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const existing = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Idea not found' })

    // Обнулить idea_id у связанных планов
    await db.update(plans).set({ ideaId: null }).where(eq(plans.ideaId, id))
    await db.delete(ideas).where(eq(ideas.id, id))

    return reply.code(204).send()
  })

  // PATCH /ideas/:id/order — изменить порядок
  app.patch<{ Params: { id: string } }>('/ideas/:id/order', async (req, reply) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return reply.code(400).send({ error: 'Invalid id' })

    const parsed = reorderIdeaSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const existing = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1)
    if (!existing.length) return reply.code(404).send({ error: 'Idea not found' })

    const updated = await db
      .update(ideas)
      .set({ order: parsed.data.newOrder, updatedAt: sql`(datetime('now'))` })
      .where(eq(ideas.id, id))
      .returning()

    return reply.send(updated[0])
  })

  // POST /ideas/:id/plans — привязать план к идее
  app.post<{ Params: { id: string } }>('/ideas/:id/plans', async (req, reply) => {
    const ideaId = parseInt(req.params.id)
    if (isNaN(ideaId)) return reply.code(400).send({ error: 'Invalid id' })

    const parsed = linkPlanSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const ideaExists = await db.select().from(ideas).where(eq(ideas.id, ideaId)).limit(1)
    if (!ideaExists.length) return reply.code(404).send({ error: 'Idea not found' })

    const planExists = await db.select().from(plans).where(eq(plans.id, parsed.data.planId)).limit(1)
    if (!planExists.length) return reply.code(404).send({ error: 'Plan not found' })

    const updated = await db
      .update(plans)
      .set({ ideaId })
      .where(eq(plans.id, parsed.data.planId))
      .returning()

    return reply.send(updated[0])
  })

  // DELETE /ideas/:id/plans/:planId — отвязать план от идеи
  app.delete<{ Params: { id: string; planId: string } }>(
    '/ideas/:id/plans/:planId',
    async (req, reply) => {
      const ideaId = parseInt(req.params.id)
      const planId = parseInt(req.params.planId)
      if (isNaN(ideaId) || isNaN(planId)) return reply.code(400).send({ error: 'Invalid id' })

      const updated = await db
        .update(plans)
        .set({ ideaId: null })
        .where(eq(plans.id, planId))
        .returning()

      if (!updated.length) return reply.code(404).send({ error: 'Plan not found' })

      return reply.send(updated[0])
    }
  )
}
