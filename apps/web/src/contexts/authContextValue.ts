import { createContext } from 'react'

import type { SessionPayload } from '../api'

export interface AuthContextValue {
  apiBaseUrl: string
  session: SessionPayload
}

export const AuthContext = createContext<AuthContextValue | null>(null)
