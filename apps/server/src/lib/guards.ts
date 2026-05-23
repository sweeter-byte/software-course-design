import type { FastifyRequest } from 'fastify'

import type { Database } from './db/client'
import { AppError } from './http'

interface AuthTokenPayload {
  sub: string
  role: 'student' | 'teacher' | 'officer'
  phone: string
  /**
   * Auth session id. Tokens issued before this field was introduced will be
   * rejected on first use so clients re-login and pick up a session-bound
   * JWT.
   */
  sid?: string
}

const SESSION_VALIDATED = Symbol('auth-session-validated')

/**
 * JWT alone is not enough — we want password change / phone change / account
 * cancel on one client to invalidate active sessions on the other client.
 * We do that by recording an auth_sessions row at login time and embedding
 * its id in the JWT (`sid`). On every authenticated request we look that row
 * up; if it is gone (because some sensitive action wiped it) we reject with
 * 401 so the client can clear its local session.
 */
export async function requireAuth(request: FastifyRequest) {
  const payload = await request.jwtVerify<AuthTokenPayload>()

  const flagged = request as unknown as Record<symbol, boolean>
  if (!flagged[SESSION_VALIDATED]) {
    if (!payload.sid) {
      // Old token format (issued before the session check landed). Force a
      // re-login so the next token carries an sid.
      throw new AppError('session_invalid', 401, 'SESSION_INVALID')
    }

    const database = (request.server as unknown as { database?: Database }).database
    if (!database) {
      // Misconfiguration: buildApp should always decorate `database`.
      throw new AppError('internal_server_error', 500, 'AUTH_SESSION_LOOKUP_UNAVAILABLE')
    }

    const session = (await database
      .prepare('SELECT id FROM auth_sessions WHERE id = ? AND user_id = ? LIMIT 1')
      .get(payload.sid, payload.sub)) as { id: string } | undefined

    if (!session) {
      throw new AppError('session_invalid', 401, 'SESSION_INVALID')
    }

    flagged[SESSION_VALIDATED] = true
  }

  return payload
}

export async function requireRole(request: FastifyRequest, allowedRoles: AuthTokenPayload['role'][]) {
  const payload = await requireAuth(request)

  if (!allowedRoles.includes(payload.role)) {
    throw new AppError('forbidden', 403, 'FORBIDDEN')
  }

  return payload
}
