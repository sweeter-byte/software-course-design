import type { FeedbackItem } from '../domain'

export type FeedbackStatus = 'open' | 'resolved' | 'deleted'

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: '待处理',
  resolved: '已解决',
  deleted: '已删除',
}

export function feedbackStatusLabel(status: FeedbackItem['status']): string {
  return FEEDBACK_STATUS_LABELS[status as FeedbackStatus] ?? status
}
