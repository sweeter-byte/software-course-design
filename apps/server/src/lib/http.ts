import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export class AppError extends Error {
  code: string
  statusCode: number
  details?: unknown[]

  constructor(message: string, statusCode = 400, code = 'APP_ERROR', details?: unknown[]) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export function successResponse<T>(request: FastifyRequest, data: T, message = 'ok') {
  return {
    success: true as const,
    message,
    data,
    meta: {
      requestId: request.id,
    },
  }
}

export function errorResponse(
  request: FastifyRequest,
  message: string,
  code: string,
  details?: unknown[],
) {
  return {
    success: false as const,
    message,
    error: {
      code,
      details,
    },
    meta: {
      requestId: request.id,
    },
  }
}

export function sendCreated<T>(
  reply: FastifyReply,
  request: FastifyRequest,
  data: T,
  message: string,
) {
  return reply.status(201).send(successResponse(request, data, message))
}

function isHttpLikeError(
  error: unknown,
): error is { statusCode: number; message?: string; code?: string } {
  if (typeof error !== 'object' || error === null) return false
  const status = (error as { statusCode?: unknown }).statusCode
  return typeof status === 'number' && status >= 400 && status < 600
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof ZodError) {
    return new AppError('validation_failed', 400, 'VALIDATION_ERROR', error.issues)
  }

  // @fastify/jwt and other Fastify plugins throw errors with a `statusCode`
  // (e.g. FST_JWT_AUTHORIZATION_TOKEN_INVALID is 401). Honour their status
  // so the client sees the real 401 and can auto-clear its session, instead
  // of every bad token surfacing as a generic 500.
  if (isHttpLikeError(error)) {
    const message =
      typeof (error as { message?: unknown }).message === 'string'
        ? ((error as { message: string }).message)
        : 'request_failed'
    const code =
      typeof (error as { code?: unknown }).code === 'string'
        ? ((error as { code: string }).code)
        : 'REQUEST_FAILED'
    return new AppError(message, error.statusCode, code)
  }

  return new AppError('internal_server_error', 500, 'INTERNAL_SERVER_ERROR')
}
