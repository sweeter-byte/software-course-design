import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { SessionPayload } from '../api'
import type { NoticeState, NoticeType } from '../components/feedback/NoticeBanner'

export type MobileAuthValue = {
  session: SessionPayload
  apiBaseUrl: string
  notice: NoticeState | null
  notify: (message: string, type?: NoticeType) => void
  dismissNotice: () => void
  clearSession: (message: string, type?: NoticeType) => void
  updateSessionUser: (user: SessionPayload['user']) => void
}

const MobileAuthContext = createContext<MobileAuthValue | null>(null)

export function MobileAuthProvider({
  session,
  apiBaseUrl,
  notice,
  notify,
  dismissNotice,
  clearSession,
  updateSessionUser,
  children,
}: MobileAuthValue & { children: ReactNode }) {
  const value = useMemo<MobileAuthValue>(
    () => ({
      session,
      apiBaseUrl,
      notice,
      notify,
      dismissNotice,
      clearSession,
      updateSessionUser,
    }),
    [session, apiBaseUrl, notice, notify, dismissNotice, clearSession, updateSessionUser],
  )
  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>
}

export function useMobileAuth(): MobileAuthValue {
  const value = useContext(MobileAuthContext)
  if (!value) {
    throw new Error('useMobileAuth must be used within MobileAuthProvider')
  }
  return value
}
