import { describe, expect, it } from 'vitest'

import { createDefaultAssignmentDates } from './demo-defaults'

describe('createDefaultAssignmentDates', () => {
  it('keeps the default assignment deadline in the future', () => {
    const now = new Date('2026-05-17T10:00:00.000Z')

    const dates = createDefaultAssignmentDates(now)

    expect(new Date(dates.startAt).getTime()).toBeLessThan(now.getTime())
    expect(new Date(dates.dueAt).getTime()).toBeGreaterThan(now.getTime())
  })
})
