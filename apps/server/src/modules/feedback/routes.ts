import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'

import { feedbackSchema } from '../../../../../packages/shared/src/index'

import type { Database } from '../../lib/db/client'
import type { LogWriter } from '../../lib/logging'
import { requireAuth, requireRole } from '../../lib/guards'
import { AppError, sendCreated } from '../../lib/http'

interface FeedbackRouteContext {
  database: Database
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

type FeedbackThreadRow = FeedbackRow & {
  course_id: string
  course_code: string
  course_name: string
  assignment_title: string
  submission_status: string
  submitted_at: string | null
  graded_at: string | null
  student_name: string | null
  student_no: string | null
}

type FeedbackResponseRow = {
  id: string
  feedback_id: string
  teacher_id: string
  teacher_name: string | null
  content: string
  created_at: string
  updated_at: string
  edited_at: string | null
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

function toFeedbackThread(row: FeedbackThreadRow, responses: FeedbackResponseRow[]) {
  return {
    id: row.id,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseName: row.course_name,
    assignmentId: row.assignment_id,
    assignmentTitle: row.assignment_title,
    submissionId: row.submission_id,
    submissionStatus: row.submission_status,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at,
    studentId: row.student_id,
    studentName: row.student_name,
    studentNo: row.student_no,
    kind: row.kind,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    responses: responses
      .filter((response) => response.feedback_id === row.id)
      .map((response) => ({
        id: response.id,
        feedbackId: response.feedback_id,
        teacherId: response.teacher_id,
        teacherName: response.teacher_name,
        content: response.content,
        createdAt: response.created_at,
        updatedAt: response.updated_at,
        editedAt: response.edited_at,
      })),
  }
}

const FEEDBACK_THREADS_DEFAULT_LIMIT = 100
const FEEDBACK_THREADS_MAX_LIMIT = 200

function parseBoundedInteger(raw: string | undefined, fallback: number, min: number, max: number) {
  if (raw === undefined || raw === '') {
    return fallback
  }

  const parsed = Number(raw)

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return fallback
  }

  if (parsed < min) {
    return min
  }

  if (parsed > max) {
    return max
  }

  return parsed
}

async function getFeedbackById(database: Database, feedbackId: string) {
  return (await database
    .prepare(
      `
        SELECT id, assignment_id, submission_id, student_id, kind, content, status, created_at, updated_at
        FROM feedbacks
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(feedbackId)) as FeedbackRow | undefined
}

async function feedbackHasTeacherResponse(database: Database, feedbackId: string) {
  const row = (await database
    .prepare('SELECT 1 AS present FROM responses WHERE feedback_id = ? LIMIT 1')
    .get(feedbackId)) as { present: number } | undefined
  return row !== undefined
}

export function registerFeedbackRoutes(app: FastifyInstance, context: FeedbackRouteContext) {
  app.get('/feedbacks/threads', async (request) => {
    const actor = await requireAuth(request)
    const query = (request.query ?? {}) as {
      courseId?: string
      assignmentId?: string
      status?: string
      limit?: string
      offset?: string
    }
    const filters: string[] = []
    const values: (string | number)[] = []
    const status = query.status?.trim().toLowerCase()

    if (status) {
      if (!['open', 'resolved', 'deleted'].includes(status)) {
        throw new AppError('invalid_feedback_status', 400, 'INVALID_FEEDBACK_STATUS')
      }
      filters.push('feedbacks.status = ?')
      values.push(status)
    } else {
      filters.push("feedbacks.status <> 'deleted'")
    }

    if (query.courseId) {
      filters.push('courses.id = ?')
      values.push(query.courseId)
    }

    if (query.assignmentId) {
      filters.push('assignments.id = ?')
      values.push(query.assignmentId)
    }

    if (actor.role === 'student') {
      filters.push('feedbacks.student_id = ?')
      values.push(actor.sub)
    } else if (actor.role === 'teacher') {
      filters.push('assignments.teacher_id = ?')
      values.push(actor.sub)
    }

    const limit = parseBoundedInteger(
      query.limit,
      FEEDBACK_THREADS_DEFAULT_LIMIT,
      1,
      FEEDBACK_THREADS_MAX_LIMIT,
    )
    const offset = parseBoundedInteger(query.offset, 0, 0, Number.MAX_SAFE_INTEGER)

    const feedbacks = (await context.database
      .prepare(
        `
          SELECT
            feedbacks.id,
            feedbacks.assignment_id,
            feedbacks.submission_id,
            feedbacks.student_id,
            feedbacks.kind,
            feedbacks.content,
            feedbacks.status,
            feedbacks.created_at,
            feedbacks.updated_at,
            courses.id AS course_id,
            courses.course_code,
            courses.course_name,
            assignments.title AS assignment_title,
            submissions.status AS submission_status,
            submissions.submitted_at,
            submissions.graded_at,
            students.real_name AS student_name,
            students.student_no
          FROM feedbacks
          INNER JOIN assignments ON assignments.id = feedbacks.assignment_id
          INNER JOIN courses ON courses.id = assignments.course_id
          INNER JOIN submissions ON submissions.id = feedbacks.submission_id
          INNER JOIN users AS students ON students.id = feedbacks.student_id
          WHERE ${filters.join(' AND ')}
          ORDER BY feedbacks.created_at DESC
          LIMIT ? OFFSET ?
        `,
      )
      .all(...values, limit, offset)) as FeedbackThreadRow[]

    const responses =
      feedbacks.length > 0
        ? ((await context.database
            .prepare(
              `
                SELECT
                  responses.id,
                  responses.feedback_id,
                  responses.teacher_id,
                  teachers.real_name AS teacher_name,
                  responses.content,
                  responses.created_at,
                  responses.updated_at,
                  responses.edited_at
                FROM responses
                INNER JOIN users AS teachers ON teachers.id = responses.teacher_id
                WHERE responses.feedback_id IN (${feedbacks.map(() => '?').join(', ')})
                ORDER BY responses.created_at ASC
              `,
            )
            .all(...feedbacks.map((feedback) => feedback.id))) as FeedbackResponseRow[])
        : []

    return {
      success: true,
      message: 'ok',
      data: {
        items: feedbacks.map((feedback) => toFeedbackThread(feedback, responses)),
        pagination: {
          limit,
          offset,
          count: feedbacks.length,
        },
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.get('/feedbacks', async (request) => {
    const actor = await requireAuth(request)
    const query = (request.query ?? {}) as { submissionId?: string }

    if (!query.submissionId) {
      throw new AppError('submission_id_required', 400, 'SUBMISSION_ID_REQUIRED')
    }

    const submission = (await context.database
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
      .get(query.submissionId)) as
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

    const feedbacks = (await context.database
      .prepare(
        `
          SELECT id, assignment_id, submission_id, student_id, kind, content, status, created_at, updated_at
          FROM feedbacks
          WHERE submission_id = ? AND status <> 'deleted'
          ORDER BY created_at ASC
        `,
      )
      .all(query.submissionId)) as FeedbackRow[]

    const responses = (await context.database
      .prepare(
        `
          SELECT id, feedback_id, teacher_id, content, created_at, updated_at, edited_at
          FROM responses
          WHERE feedback_id IN (SELECT id FROM feedbacks WHERE submission_id = ? AND status <> 'deleted')
          ORDER BY created_at ASC
        `,
      )
      .all(query.submissionId)) as Array<{
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

    const submission = (await context.database
      .prepare(
        `
          SELECT id, assignment_id, student_id, status
          FROM submissions
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(params.submissionId)) as
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

    await context.database
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
    const feedback = await getFeedbackById(context.database, params.feedbackId)

    if (!feedback || feedback.status === 'deleted') {
      throw new AppError('feedback_not_found', 404, 'FEEDBACK_NOT_FOUND')
    }

    if (feedback.student_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    if (await feedbackHasTeacherResponse(context.database, params.feedbackId)) {
      throw new AppError(
        'feedback_locked_by_response',
        409,
        'FEEDBACK_LOCKED_BY_RESPONSE',
      )
    }

    const now = new Date().toISOString()

    await context.database
      .prepare('UPDATE feedbacks SET kind = ?, content = ?, updated_at = ? WHERE id = ?')
      .run(payload.kind, payload.content, now, params.feedbackId)

    const updatedFeedback = await getFeedbackById(context.database, params.feedbackId)

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
    const feedback = await getFeedbackById(context.database, params.feedbackId)

    if (!feedback || feedback.status === 'deleted') {
      throw new AppError('feedback_not_found', 404, 'FEEDBACK_NOT_FOUND')
    }

    if (feedback.student_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    if (await feedbackHasTeacherResponse(context.database, params.feedbackId)) {
      throw new AppError(
        'feedback_locked_by_response',
        409,
        'FEEDBACK_LOCKED_BY_RESPONSE',
      )
    }

    const now = new Date().toISOString()

    await context.database
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
