import { describe, it, expect } from 'vitest'

// Reproduce the exact overlap logic from overlapCheck.ts for unit testing
// without requiring a database. See: services/overlapCheck.ts line 37.
function overlaps(
  a: { from: string; to: string },
  b: { from: string; to: string }
): boolean {
  return a.from < b.to && a.to > b.from
}

describe('overlap logic', () => {
  it('T-U02-01: no overlap - separate slots', () => {
    expect(
      overlaps({ from: '10:00', to: '12:00' }, { from: '13:00', to: '15:00' })
    ).toBe(false)
  })

  it('T-U02-02: overlap - B starts inside A', () => {
    expect(
      overlaps({ from: '10:00', to: '12:00' }, { from: '11:00', to: '13:00' })
    ).toBe(true)
  })

  it('T-U02-03: overlap - B ends inside A', () => {
    expect(
      overlaps({ from: '10:00', to: '12:00' }, { from: '09:00', to: '11:00' })
    ).toBe(true)
  })

  it('T-U02-04: overlap - B inside A', () => {
    expect(
      overlaps({ from: '10:00', to: '12:00' }, { from: '10:30', to: '11:30' })
    ).toBe(true)
  })

  it('T-U02-05: overlap - exact match', () => {
    expect(
      overlaps({ from: '10:00', to: '12:00' }, { from: '10:00', to: '12:00' })
    ).toBe(true)
  })

  it('T-U02-06: no overlap - B starts at A end (boundary)', () => {
    expect(
      overlaps({ from: '10:00', to: '12:00' }, { from: '12:00', to: '14:00' })
    ).toBe(false)
  })

  it('T-U02-07: no overlap - B ends at A start (boundary)', () => {
    expect(
      overlaps({ from: '10:00', to: '12:00' }, { from: '08:00', to: '10:00' })
    ).toBe(false)
  })

  it('T-U02-08: overlap - A inside B', () => {
    expect(
      overlaps({ from: '10:00', to: '12:00' }, { from: '09:00', to: '13:00' })
    ).toBe(true)
  })
})
