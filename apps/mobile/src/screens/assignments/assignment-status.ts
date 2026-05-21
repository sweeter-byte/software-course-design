import type { AssignmentItem, SubmissionItem } from '../../domain'

export type AssignmentDerivedStatus = 'not_started' | 'in_progress' | 'closed' | 'cancelled'

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentDerivedStatus, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  closed: '已截止',
  cancelled: '已取消',
}

export const ASSIGNMENT_STATUS_OPTIONS: ReadonlyArray<{
  value: AssignmentDerivedStatus | ''
  label: string
}> = [
  { value: '', label: '全部' },
  { value: 'not_started', label: '未开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'closed', label: '已截止' },
  { value: 'cancelled', label: '已取消' },
]

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

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  draft: '未提交',
  submitted: '已提交',
  graded: '已批改',
}

export const SUBMISSION_STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: '全部' },
  { value: 'draft', label: '未提交' },
  { value: 'submitted', label: '已提交' },
  { value: 'graded', label: '已批改' },
]

export function submissionStatusLabel(status: string): string {
  return SUBMISSION_STATUS_LABELS[status] ?? status
}

/**
 * Derived submission status for the student "我的作业" cross-course list.
 * Uses the server-reported submission when present, falling back to the
 * legacy `hasSubmitted` flag.
 */
export function derivedSubmissionStatusForAssignment(assignment: AssignmentItem): string {
  if (assignment.mySubmission?.status) return assignment.mySubmission.status
  if (assignment.hasSubmitted) return 'submitted'
  return 'draft'
}

export type StudentSubmissionLock = {
  canEdit: boolean
  lockReason: string | null
  primaryButtonLabel: string
}

/**
 * §2.4 + Web `StudentAssignmentWorkspace.tsx` lines 77-110:
 *   - Cancelled assignment: cannot submit or modify.
 *   - Graded submission: cannot modify.
 *   - Past due: cannot submit or modify (`dueAtMs <= nowMs`).
 *   - Otherwise: can submit (when no submission yet) or modify (when submission exists, not graded).
 */
export function evaluateStudentSubmissionLock(
  assignment: Pick<AssignmentItem, 'status' | 'dueAt'>,
  submission: Pick<SubmissionItem, 'status'> | null,
  pending: { isSubmitting: boolean; isUpdating: boolean },
  now: number = Date.now(),
): StudentSubmissionLock {
  const isGraded = submission?.status === 'graded'
  const isCancelled = assignment.status === 'cancelled'
  const dueAtMs = Date.parse(assignment.dueAt)
  const isPastDue = Number.isFinite(dueAtMs) ? dueAtMs <= now : false
  const canEdit = !isGraded && !isCancelled && !isPastDue

  const lockReason = isCancelled
    ? '该作业已取消，不能再提交或修改。'
    : isGraded
      ? '提交已批改，不能再修改。'
      : isPastDue
        ? '作业已截止，不能再提交或修改。'
        : null

  const primaryButtonLabel = submission
    ? isGraded
      ? '已批改不可修改'
      : isCancelled
        ? '作业已取消'
        : isPastDue
          ? '已截止不可修改'
          : pending.isUpdating
            ? '修改中…'
            : '修改答案'
    : isCancelled
      ? '作业已取消'
      : isPastDue
        ? '已截止不可提交'
        : pending.isSubmitting
          ? '提交中…'
          : '提交答案'

  return { canEdit, lockReason, primaryButtonLabel }
}
