import type { SubmissionItem } from '../domain'

export type SubmissionStatus = 'draft' | 'submitted' | 'graded'

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: '草稿',
  submitted: '已提交',
  graded: '已批改',
}

export function submissionStatusLabel(status: SubmissionItem['status']): string {
  return SUBMISSION_STATUS_LABELS[status as SubmissionStatus] ?? status
}
