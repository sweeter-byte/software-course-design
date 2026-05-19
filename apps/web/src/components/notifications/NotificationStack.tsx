import type { Notification } from '../../hooks/useNotifications'

type NotificationStackProps = {
  notifications: Notification[]
  onDismiss: (id: number) => void
  className?: string
}

const typeLabel: Record<Notification['type'], string> = {
  info: '提示',
  success: '成功',
  error: '错误',
}

export function NotificationStack({
  notifications,
  onDismiss,
  className,
}: NotificationStackProps) {
  if (notifications.length === 0) return null

  const classes = ['notification-stack']
  if (className) classes.push(className)

  return (
    <div className={classes.join(' ')} aria-live="polite" aria-relevant="additions">
      {notifications.map((item) => (
        <div
          key={item.id}
          className={`notification-item notification-${item.type}`}
          role="status"
        >
          <span className="notification-type" aria-hidden="true">
            {typeLabel[item.type]}
          </span>
          <span className="notification-content">{item.content}</span>
          <button
            type="button"
            className="notification-dismiss"
            onClick={() => onDismiss(item.id)}
            aria-label="关闭通知"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
