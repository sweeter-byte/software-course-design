import { type ReactNode } from 'react'

import type { UseNotificationsResult } from '../hooks/useNotifications'
import { NotificationsContext } from './notificationsContextValue'

interface NotificationsProviderProps {
  value: UseNotificationsResult
  children: ReactNode
}

export function NotificationsProvider({ value, children }: NotificationsProviderProps) {
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
