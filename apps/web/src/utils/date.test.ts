import { describe, expect, it } from 'vitest'

import { formatDateTimeForDisplay, fromDateTimeLocalValue, toDateTimeLocalValue } from './date'

describe('date utilities', () => {
  it('formats ISO values for Chinese local display without raw ISO syntax', () => {
    const result = formatDateTimeForDisplay('2026-06-17T15:00:00.000Z')

    expect(result).toContain('06')
    expect(result).toContain('17')
    expect(result).not.toContain('T')
    expect(result).not.toContain('.000Z')
  })

  it('converts ISO values to datetime-local input values', () => {
    const result = toDateTimeLocalValue('2026-06-17T15:00:00.000Z')

    expect(result).toMatch(/^2026-06-(17|18)T/)
    expect(result).not.toContain('.000Z')
  })

  it('converts datetime-local input values back to ISO values', () => {
    const result = fromDateTimeLocalValue('2026-06-17T23:00')

    expect(result).toMatch(/^2026-06-17T/)
    expect(result).toContain('Z')
  })
})
