import * as SecureStore from 'expo-secure-store'

import type { SessionPayload, UserRole } from './api'

export const SESSION_STORAGE_KEY = 'cms_session'

export type SessionStorage = {
  getItemAsync: (key: string) => Promise<string | null>
  setItemAsync: (key: string, value: string) => Promise<void>
  deleteItemAsync: (key: string) => Promise<void>
}

export const secureSessionStorage: SessionStorage = {
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: SecureStore.setItemAsync,
  deleteItemAsync: SecureStore.deleteItemAsync,
}

const validRoles = new Set<UserRole>(['student', 'teacher', 'officer'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isSessionPayload(value: unknown): value is SessionPayload {
  if (!isRecord(value)) return false
  if (typeof value.accessToken !== 'string') return false

  if (
    'refreshToken' in value &&
    value.refreshToken !== undefined &&
    typeof value.refreshToken !== 'string'
  ) {
    return false
  }

  if (!isRecord(value.user)) return false

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

  if (
    'studentNo' in value.user &&
    value.user.studentNo !== undefined &&
    value.user.studentNo !== null &&
    typeof value.user.studentNo !== 'string'
  ) {
    return false
  }

  return true
}

export async function loadStoredSession(storage: SessionStorage): Promise<SessionPayload | null> {
  try {
    const rawValue = await storage.getItemAsync(SESSION_STORAGE_KEY)
    if (!rawValue) return null

    const parsed = JSON.parse(rawValue) as unknown
    if (isSessionPayload(parsed)) {
      return parsed
    }

    await storage.deleteItemAsync(SESSION_STORAGE_KEY)
    return null
  } catch {
    return null
  }
}

export async function persistSession(storage: SessionStorage, session: SessionPayload) {
  try {
    await storage.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Secure storage is a convenience layer; failed persistence should not block login.
  }
}

export async function clearStoredSession(storage: SessionStorage) {
  try {
    await storage.deleteItemAsync(SESSION_STORAGE_KEY)
  } catch {
    // Failed cleanup should not block memory-state logout.
  }
}
