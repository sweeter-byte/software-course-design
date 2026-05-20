import { describe, expect, it } from 'vitest'

import {
  assignmentStatusLabel,
  deriveAssignmentStatus,
} from './assignment-status'

const baseAssignment = {
  startAt: '2026-05-10T00:00:00.000Z',
  dueAt: '2026-05-20T00:00:00.000Z',
}

describe('deriveAssignmentStatus', () => {
  it('treats a published assignment whose window has not opened as not_started', () => {
    const now = Date.parse('2026-05-09T00:00:00.000Z')
    expect(deriveAssignmentStatus({ ...baseAssignment, status: 'published' }, now)).toBe(
      'not_started',
    )
  })

  it('treats a published assignment inside its window as in_progress', () => {
    const now = Date.parse('2026-05-15T00:00:00.000Z')
    expect(deriveAssignmentStatus({ ...baseAssignment, status: 'published' }, now)).toBe(
      'in_progress',
    )
  })

  it('treats a published assignment past its due date as closed', () => {
    const now = Date.parse('2026-05-21T00:00:00.000Z')
    expect(deriveAssignmentStatus({ ...baseAssignment, status: 'published' }, now)).toBe(
      'closed',
    )
  })

  it('surfaces cancelled regardless of time window', () => {
    const now = Date.parse('2026-05-15T00:00:00.000Z')
    expect(deriveAssignmentStatus({ ...baseAssignment, status: 'cancelled' }, now)).toBe(
      'cancelled',
    )
  })

  it('surfaces a persisted closed status without overriding by time', () => {
    const now = Date.parse('2026-05-09T00:00:00.000Z')
    expect(deriveAssignmentStatus({ ...baseAssignment, status: 'closed' }, now)).toBe('closed')
  })
})

describe('assignmentStatusLabel', () => {
  it('renders the Chinese label for the derived state', () => {
    const now = Date.parse('2026-05-15T00:00:00.000Z')
    expect(assignmentStatusLabel({ ...baseAssignment, status: 'published' }, now)).toBe('进行中')
  })
})
