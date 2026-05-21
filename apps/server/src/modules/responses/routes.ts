import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'

import { responseSchema } from '../../../../../packages/shared/src/index'

import type { Database } from '../../lib/db/client'
import type { LogWriter } from '../../lib/logging'
import { requireRole } from '../../lib/guards'
import { AppError, sendCreated } from '../../lib/http'

interface ResponseRouteContext {
  database: Database
  logger: LogWriter
}

type ResponseRow = {
  id: string
  feedback_id: string
  teacher_id: string
  content: string
  created_at: string
  updated_at: string
  edited_at: string | null
}

function toResponse(row: ResponseRow) {
  return {
    id: row.id,
    feedbackId: row.feedback_id,
    teacherId: row.teacher_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    editedAt: row.edited_at,
  }
}

async function getResponseById(database: Database, responseId: string) {
  return (await database
    .prepare(
      `
        SELECT id, feedback_id, teacher_id, content, created_at, updated_at, edited_at
        FROM responses
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(responseId)) as ResponseRow | undefined
}

export function registerResponseRoutes(app: FastifyInstance, context: ResponseRouteContext) {
  app.post('/feedbacks/:feedbackId/responses', async (request, reply) => {
    const actor = await requireRole(request, ['teacher'])
    const params = request.params as { feedbackId: string }
    const payload = responseSchema.parse(request.body)

    const feedback = (await context.database
      .prepare(
        `
          SELECT
            feedbacks.id,
            feedbacks.assignment_id,
            assignments.teacher_id
          FROM feedbacks
          INNER JOIN assignments ON assignments.id = feedbacks.assignment_id
          WHERE feedbacks.id = ?
          LIMIT 1
        `,
      )
      .get(params.feedbackId)) as
      | {
          id: string
          assignment_id: string
          teacher_id: string
        }
      | undefined

    if (!feedback) {
      throw new AppError('feedback_not_found', 404, 'FEEDBACK_NOT_FOUND')
    }

    if (feedback.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const now = new Date().toISOString()
    const responseId = nanoid()

    await context.database
      .prepare(
        `
          INSERT INTO responses (
            id, feedback_id, teacher_id, content, created_at, updated_at, edited_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(responseId, params.feedbackId, actor.sub, payload.content, now, now, null)

    context.logger.info('response_created', {
      requestId: request.id,
      actorUserId: actor.sub,
      feedbackId: params.feedbackId,
      responseId,
    })

    return sendCreated(
      reply,
      request,
      {
        response: {
          id: responseId,
          feedbackId: params.feedbackId,
          teacherId: actor.sub,
          assignmentId: feedback.assignment_id,
          content: payload.content,
        },
      },
      'response_created',
    )
  })

  app.patch('/responses/:responseId', async (request) => {
    const actor = await requireRole(request, ['teacher'])
    const params = request.params as { responseId: string }
    const payload = responseSchema.parse(request.body)
    const response = await getResponseById(context.database, params.responseId)

    if (!response) {
      throw new AppError('response_not_found', 404, 'RESPONSE_NOT_FOUND')
    }

    if (response.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const now = new Date().toISOString()

    await context.database
      .prepare('UPDATE responses SET content = ?, updated_at = ?, edited_at = ? WHERE id = ?')
      .run(payload.content, now, now, params.responseId)

    const updatedResponse = await getResponseById(context.database, params.responseId)

    if (!updatedResponse) {
      throw new AppError('response_not_found', 404, 'RESPONSE_NOT_FOUND')
    }

    context.logger.info('response_updated', {
      requestId: request.id,
      actorUserId: actor.sub,
      responseId: params.responseId,
    })

    return {
      success: true,
      message: 'response_updated',
      data: {
        response: toResponse(updatedResponse),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.delete('/responses/:responseId', async (request) => {
    const actor = await requireRole(request, ['teacher'])
    const params = request.params as { responseId: string }
    const response = await getResponseById(context.database, params.responseId)

    if (!response) {
      throw new AppError('response_not_found', 404, 'RESPONSE_NOT_FOUND')
    }

    if (response.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    await context.database.prepare('DELETE FROM responses WHERE id = ?').run(params.responseId)

    context.logger.info('response_deleted', {
      requestId: request.id,
      actorUserId: actor.sub,
      responseId: params.responseId,
    })

    return {
      success: true,
      message: 'response_deleted',
      data: {
        response: {
          id: params.responseId,
        },
      },
      meta: {
        requestId: request.id,
      },
    }
  })
}
