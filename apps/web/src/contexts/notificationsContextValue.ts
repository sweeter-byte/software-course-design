import { createContext } from 'react'

import type { UseNotificationsResult } from '../hooks/useNotifications'

export const NotificationsContext = createContext<UseNotificationsResult | null>(null)
