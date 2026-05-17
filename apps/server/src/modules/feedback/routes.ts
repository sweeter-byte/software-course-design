import type { DatabaseSync } from 'node:sqlite'
import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'

import { feedbackSchema } from '../../../../../packages/shared/src/index'

import type { LogWriter } from '../../lib/logging'
import { requireAuth, requireRole } from '../../lib/guards'
import { AppError, sendCreated } from '../../lib/http'

interface FeedbackRouteContext {
  database: DatabaseSync
  logger: LogWriter
}

type FeedbackRow = {
  id: string
  assignment_id: string
  submission_id: string
  student_id: string
  kind: 'question' | 'feedback'
  content: string
  status: string
  created_at: string
  updated_at: string
}

function toFeedback(row: FeedbackRow) {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    submissionId: row.submission_id,
    studentId: row.student_id,
    kind: row.kind,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getFeedbackById(database: DatabaseSync, feedbackId: string) {
  return database
    .prepare(
      `
        SELECT id, assignment_id, submission_id, student_id, kind, content, status, created_at, updated_at
        FROM feedbacks
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(feedbackId) as FeedbackRow | undefined
}

export function registerFeedbackRoutes(app: FastifyInstance, context: FeedbackRouteContext) {
  app.get('/feedbacks', async (request) => {
    const actor = await requireAuth(request)
    const query = (request.query ?? {}) as { submissionId?: string }

    if (!query.submissionId) {
      throw new AppError('submission_id_required', 400, 'SUBMISSION_ID_REQUIRED')
    }

    const submission = context.database
      .prepare(
        `
          SELECT
            submissions.id,
            submissions.student_id,
            assignments.teacher_id,
            assignments.id AS assignment_id
          FROM submissions
          INNER JOIN assignments ON assignments.id = submissions.assignment_id
          WHERE submissions.id = ?
          LIMIT 1
        `,
      )
      .get(query.submissionId) as
      | {
          id: string
          student_id: string
          teacher_id: string
          assignment_id: string
        }
      | undefined

    if (!submission) {
      throw new AppError('submission_not_found', 404, 'SUBMISSION_NOT_FOUND')
    }

    if (
      actor.role !== 'officer' &&
      actor.sub !== submission.student_id &&
      actor.sub !== submission.teacher_id
    ) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const feedbacks = context.database
      .prepare(
        `
          SELECT id, assignment_id, submission_id, student_id, kind, content, status, created_at, updated_at
          FROM feedbacks
          WHERE submission_id = ? AND status <> 'deleted'
          ORDER BY created_at ASC
        `,
      )
      .all(query.submissionId) as FeedbackRow[]

    const responses = context.database
      .prepare(
        `
          SELECT id, feedback_id, teacher_id, content, created_at, updated_at, edited_at
          FROM responses
          WHERE feedback_id IN (SELECT id FROM feedbacks WHERE submission_id = ? AND status <> 'deleted')
          ORDER BY created_at ASC
        `,
      )
      .all(query.submissionId) as Array<{
      id: string
      feedback_id: string
      teacher_id: string
      content: string
      created_at: string
      updated_at: string
      edited_at: string | null
    }>

    return {
      success: true,
      message: 'ok',
      data: {
        items: feedbacks.map((feedback) => ({
          id: feedback.id,
          assignmentId: feedback.assignment_id,
          submissionId: feedback.submission_id,
          studentId: feedback.student_id,
          kind: feedback.kind,
          content: feedback.content,
          status: feedback.status,
          createdAt: feedback.created_at,
          updatedAt: feedback.updated_at,
          responses: responses
            .filter((response) => response.feedback_id === feedback.id)
            .map((response) => ({
              id: response.id,
              feedbackId: response.feedback_id,
              teacherId: response.teacher_id,
              content: response.content,
              createdAt: response.created_at,
              updatedAt: response.updated_at,
              editedAt: response.edited_at,
            })),
        })),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/submissions/:submissionId/feedbacks', async (request, reply) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { submissionId: string }
    const payload = feedbackSchema.parse(request.body)

    const submission = context.database
      .prepare(
        `
          SELECT id, assignment_id, student_id, status
          FROM submissions
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(params.submissionId) as
      | {
          id: string
          assignment_id: string
          student_id: string
          status: string
        }
      | undefined

    if (!submission) {
      throw new AppError('submission_not_found', 404, 'SUBMISSION_NOT_FOUND')
    }

    if (submission.student_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    if (submission.status !== 'graded') {
      throw new AppError('feedback_requires_grading', 409, 'FEEDBACK_REQUIRES_GRADING')
    }

    const now = new Date().toISOString()
    const feedbackId = nanoid()

    context.database
      .prepare(
        `
          INSERT INTO feedbacks (
            id, assignment_id, submission_id, student_id, kind, content, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        feedbackId,
        submission.assignment_id,
        params.submissionId,
        actor.sub,
        payload.kind,
        payload.content,
        'open',
        now,
        now,
      )

    context.logger.info('feedback_created', {
      requestId: request.id,
      actorUserId: actor.sub,
      feedbackId,
      submissionId: params.submissionId,
    })

    return sendCreated(
      reply,
      request,
      {
        feedback: {
          id: feedbackId,
          assignmentId: submission.assignment_id,
          submissionId: params.submissionId,
          studentId: actor.sub,
          kind: payload.kind,
          content: payload.content,
          status: 'open',
        },
      },
      'feedback_created',
    )
  })

  app.patch('/feedbacks/:feedbackId', async (request) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { feedbackId: string }
    const payload = feedbackSchema.parse(request.body)
    const feedback = getFeedbackById(context.database, params.feedbackId)

    if (!feedback || feedback.status === 'deleted') {
      throw new AppError('feedback_not_found', 404, 'FEEDBACK_NOT_FOUND')
    }

    if (feedback.student_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const now = new Date().toISOString()

    context.database
      .prepare('UPDATE feedbacks SET kind = ?, content = ?, updated_at = ? WHERE id = ?')
      .run(payload.kind, payload.content, now, params.feedbackId)

    const updatedFeedback = getFeedbackById(context.database, params.feedbackId)

    if (!updatedFeedback) {
      throw new AppError('feedback_not_found', 404, 'FEEDBACK_NOT_FOUND')
    }

    context.logger.info('feedback_updated', {
      requestId: request.id,
      actorUserId: actor.sub,
      feedbackId: params.feedbackId,
    })

    return {
      success: true,
      message: 'feedback_updated',
      data: {
        feedback: toFeedback(updatedFeedback),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.delete('/feedbacks/:feedbackId', async (request) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { feedbackId: string }
    const feedback = getFeedbackById(context.database, params.feedbackId)

    if (!feedback || feedback.status === 'deleted') {
      throw new AppError('feedback_not_found', 404, 'FEEDBACK_NOT_FOUND')
    }

    if (feedback.student_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const now = new Date().toISOString()

    context.database
      .prepare("UPDATE feedbacks SET status = 'deleted', updated_at = ? WHERE id = ?")
      .run(now, params.feedbackId)

    context.logger.info('feedback_deleted', {
      requestId: request.id,
      actorUserId: actor.sub,
      feedbackId: params.feedbackId,
    })

    return {
      success: true,
      message: 'feedback_deleted',
      data: {
        feedback: {
          id: params.feedbackId,
          status: 'deleted',
        },
      },
      meta: {
        requestId: request.id,
      },
    }
  })
}
