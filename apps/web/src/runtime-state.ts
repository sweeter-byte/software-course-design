import type { SessionPayload, UserRole } from './api'

type StorageLike = Pick<Storage, 'getItem' | 'removeItem'>

const validRoles = new Set<UserRole>(['student', 'teacher', 'officer'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readStoredJson(storage: StorageLike, key: string): unknown {
  const rawValue = storage.getItem(key)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    return null
  }
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!isRecord(value)) {
    return false
  }

  if (typeof value.accessToken !== 'string') {
    return false
  }

  if ('refreshToken' in value && value.refreshToken !== undefined && typeof value.refreshToken !== 'string') {
    return false
  }

  if (!isRecord(value.user)) {
    return false
  }

  if (
    typeof value.user.id !== 'string' ||
    typeof value.user.phone !== 'string' ||
    typeof value.user.username !== 'string' ||
    typeof value.user.realName !== 'string'
  ) {
    return false
  }

  if (typeof value.user.role !== 'string' || !validRoles.has(value.user.role as UserRole)) {
    return false
  }

  if ('studentNo' in value.user && value.user.studentNo !== undefined && value.user.studentNo !== null && typeof value.user.studentNo !== 'string') {
    return false
  }

  return true
}

export function readInitialRuntimeState(
  storage: StorageLike,
  defaultApiBaseUrl: string,
  // Session lives in a separate per-tab store (sessionStorage) so multiple
  // tabs can be logged in as different roles in the same browser. When a
  // dedicated session storage is not provided the loader falls back to the
  // primary storage, which keeps the unit tests and any single-storage
  // callers backwards compatible.
  sessionStorage?: StorageLike,
) {
  const storedApiBaseUrl = readStoredJson(storage, 'cms_api_base')
  const apiBaseUrl = typeof storedApiBaseUrl === 'string' ? storedApiBaseUrl : defaultApiBaseUrl

  const sessionStore = sessionStorage ?? storage
  const storedSession = readStoredJson(sessionStore, 'cms_session')

  if (storedSession === null) {
    return {
      apiBaseUrl,
      session: null,
      recoveredInvalidSession: false,
    }
  }

  if (isSessionPayload(storedSession)) {
    return {
      apiBaseUrl,
      session: storedSession,
      recoveredInvalidSession: false,
    }
  }

  sessionStore.removeItem('cms_session')

  return {
    apiBaseUrl,
    session: null,
    recoveredInvalidSession: true,
  }
}
