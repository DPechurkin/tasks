import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { createTestApp, resetDb } from '../test/testApp.js'

describe('Ideas API', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    await resetDb()
    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()
  })

  it('T-A01-01: GET /api/ideas returns empty array', async () => {
    const resp = await app.inject({ method: 'GET', url: '/api/ideas' })
    expect(resp.statusCode).toBe(200)
    expect(JSON.parse(resp.body)).toEqual([])
  })

  it('T-A01-02: GET /api/ideas returns created ideas sorted by order', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'First' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'Second' },
    })

    const resp = await app.inject({ method: 'GET', url: '/api/ideas' })
    expect(resp.statusCode).toBe(200)
    const body = JSON.parse(resp.body)
    expect(body).toHaveLength(2)
    expect(body[0].title).toBe('First')
    expect(body[1].title).toBe('Second')
    expect(body[0].order).toBeLessThan(body[1].order)
  })

  it('T-A01-03: GET /api/ideas includes plansCount', async () => {
    const resp = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'Idea with counter' },
    })
    expect(resp.statusCode).toBe(201)

    const list = await app.inject({ method: 'GET', url: '/api/ideas' })
    const body = JSON.parse(list.body)
    expect(body[0].plansCount).toBe(0)
  })

  it('T-A01-04: GET /api/ideas/:id returns 404 for missing idea', async () => {
    const resp = await app.inject({ method: 'GET', url: '/api/ideas/99999' })
    expect(resp.statusCode).toBe(404)
  })

  it('T-A01-05: GET /api/ideas/:id returns 400 for invalid id', async () => {
    const resp = await app.inject({ method: 'GET', url: '/api/ideas/not-a-number' })
    expect(resp.statusCode).toBe(400)
  })

  it('T-A01-06: GET /api/ideas/:id returns idea with plans list', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'With plans' },
    })
    const { id } = JSON.parse(created.body)

    const resp = await app.inject({ method: 'GET', url: `/api/ideas/${id}` })
    expect(resp.statusCode).toBe(200)
    const body = JSON.parse(resp.body)
    expect(body.id).toBe(id)
    expect(body.title).toBe('With plans')
    expect(Array.isArray(body.plans)).toBe(true)
    expect(body.plans).toEqual([])
  })

  it('T-A01-07: POST /api/ideas stores description', async () => {
    const resp = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'With desc', description: 'Details' },
    })
    expect(resp.statusCode).toBe(201)
    const body = JSON.parse(resp.body)
    expect(body.description).toBe('Details')
  })

  it('T-A01-08: POST /api/ideas creates idea', async () => {
    const resp = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'Test Idea', description: 'Test desc' },
    })
    expect(resp.statusCode).toBe(201)
    const body = JSON.parse(resp.body)
    expect(body.id).toBeDefined()
    expect(body.title).toBe('Test Idea')
  })

  it('T-A01-09: POST /api/ideas assigns ascending order when appending', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'A' },
    })
    const second = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'B' },
    })
    const firstBody = JSON.parse(first.body)
    const secondBody = JSON.parse(second.body)
    expect(secondBody.order).toBeGreaterThan(firstBody.order)
  })

  it('T-A01-10: POST /api/ideas with insertAfter places between neighbours', async () => {
    const a = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'A' },
    })
    const c = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'C' },
    })
    const aBody = JSON.parse(a.body)
    const cBody = JSON.parse(c.body)

    const b = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'B', insertAfter: aBody.id },
    })
    const bBody = JSON.parse(b.body)

    expect(bBody.order).toBeGreaterThan(aBody.order)
    expect(bBody.order).toBeLessThan(cBody.order)
  })

  it('T-A01-11: POST /api/ideas rejects empty title', async () => {
    const resp = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: '' },
    })
    expect(resp.statusCode).toBe(400)
  })

  it('T-A01-12: POST /api/ideas rejects title > 200 chars', async () => {
    const resp = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'a'.repeat(201) },
    })
    expect(resp.statusCode).toBe(400)
  })

  it('PUT /api/ideas/:id updates an existing idea', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'Old' },
    })
    const { id } = JSON.parse(created.body)

    const resp = await app.inject({
      method: 'PUT',
      url: `/api/ideas/${id}`,
      payload: { title: 'New' },
    })
    expect(resp.statusCode).toBe(200)
    expect(JSON.parse(resp.body).title).toBe('New')
  })

  it('DELETE /api/ideas/:id removes idea', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/ideas',
      payload: { title: 'Temp' },
    })
    const { id } = JSON.parse(created.body)

    const del = await app.inject({ method: 'DELETE', url: `/api/ideas/${id}` })
    expect(del.statusCode).toBe(204)

    const after = await app.inject({ method: 'GET', url: `/api/ideas/${id}` })
    expect(after.statusCode).toBe(404)
  })
})
