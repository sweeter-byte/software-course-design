import { useContext } from 'react'

import type { UseNotificationsResult } from '../hooks/useNotifications'
import { NotificationsContext } from './notificationsContextValue'

export function useNotify(): UseNotificationsResult['notify'] {
  const value = useContext(NotificationsContext)
  if (!value) {
    throw new Error('useNotify must be used inside <NotificationsProvider>')
  }
  return value.notify
}
