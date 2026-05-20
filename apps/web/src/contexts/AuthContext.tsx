import { type ReactNode } from 'react'

import type { SessionPayload } from '../api'
import { AuthContext, type AuthContextValue } from './authContextValue'

interface AuthProviderProps {
  apiBaseUrl: string
  session: SessionPayload
  children: ReactNode
}

export function AuthProvider({ apiBaseUrl, session, children }: AuthProviderProps) {
  const value: AuthContextValue = { apiBaseUrl, session }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
