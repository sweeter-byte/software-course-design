import type { AssignmentItem } from '../domain'

export type AssignmentDerivedStatus = 'not_started' | 'in_progress' | 'closed' | 'cancelled'

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentDerivedStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  closed: '已截止',
  cancelled: '已取消',
}

export const ASSIGNMENT_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: AssignmentDerivedStatus
  label: string
}> = [
  { value: 'not_started', label: '未开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'closed', label: '已截止' },
  { value: 'cancelled', label: '已取消' },
]

// The DB persists assignment.status as `draft | published | cancelled | closed`,
// but UI surfaces the derived state `not_started | in_progress | closed | cancelled`
// (see docs/WEB_ROLE_PAGE_STRUCTURE.md §作业状态). Live assignments stay `published`
// in the DB; the time window decides what the user sees.
export function deriveAssignmentStatus(
  assignment: Pick<AssignmentItem, 'status' | 'startAt' | 'dueAt'>,
  now: number = Date.now(),
): AssignmentDerivedStatus {
  if (assignment.status === 'cancelled') return 'cancelled'
  if (assignment.status === 'closed') return 'closed'

  const startMs = Date.parse(assignment.startAt)
  const dueMs = Date.parse(assignment.dueAt)

  if (Number.isFinite(startMs) && now < startMs) return 'not_started'
  if (Number.isFinite(dueMs) && now >= dueMs) return 'closed'
  return 'in_progress'
}

export function assignmentStatusLabel(
  assignment: Pick<AssignmentItem, 'status' | 'startAt' | 'dueAt'>,
  now?: number,
): string {
  return ASSIGNMENT_STATUS_LABELS[deriveAssignmentStatus(assignment, now)]
}
