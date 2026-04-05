import { describe, it, expect } from 'vitest'
import { getOrderBetween } from './fractionalIndex.js'

describe('getOrderBetween', () => {
  it('T-U01-01: returns midpoint between two numbers', () => {
    expect(getOrderBetween(1.0, 3.0)).toBe(2.0)
  })

  it('T-U01-02: returns midpoint for close numbers', () => {
    expect(getOrderBetween(1.0, 2.0)).toBe(1.5)
  })

  it('T-U01-03: returns midpoint for very close numbers', () => {
    expect(getOrderBetween(1.0, 1.5)).toBe(1.25)
  })

  it('T-U01-04: returns before first when prev is null', () => {
    expect(getOrderBetween(null, 1.0)).toBe(0.0)
  })

  it('T-U01-05: returns after last when next is null', () => {
    expect(getOrderBetween(5.0, null)).toBe(6.0)
  })

  it('T-U01-06: returns 1.0 when both null', () => {
    expect(getOrderBetween(null, null)).toBe(1.0)
  })

  it('T-U01-07: produces strictly ordered values for repeated insertions', () => {
    // Repeatedly insert between prev and next and ensure order is monotonic
    let prev = 1.0
    const next = 2.0
    const inserted: number[] = []
    for (let i = 0; i < 5; i++) {
      const mid = getOrderBetween(prev, next)
      inserted.push(mid)
      prev = mid
    }
    // Each value must be strictly less than next and strictly greater than the previous one
    for (let i = 0; i < inserted.length; i++) {
      expect(inserted[i]).toBeLessThan(next)
      expect(inserted[i]).toBeGreaterThan(1.0)
      if (i > 0) {
        expect(inserted[i]).toBeGreaterThan(inserted[i - 1])
      }
    }
  })
})
