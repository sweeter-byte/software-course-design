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

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof ZodError) {
    return new AppError('validation_failed', 400, 'VALIDATION_ERROR', error.issues)
  }

  return new AppError('internal_server_error', 500, 'INTERNAL_SERVER_ERROR')
}
