import type { FastifyRequest } from 'fastify'

import { AppError } from './http'

interface AuthTokenPayload {
  sub: string
  role: 'student' | 'teacher' | 'officer'
  phone: string
}

export async function requireAuth(request: FastifyRequest) {
  const payload = await request.jwtVerify<AuthTokenPayload>()
  return payload
}

export async function requireRole(request: FastifyRequest, allowedRoles: AuthTokenPayload['role'][]) {
  const payload = await requireAuth(request)

  if (!allowedRoles.includes(payload.role)) {
    throw new AppError('forbidden', 403, 'FORBIDDEN')
  }

  return payload
}
