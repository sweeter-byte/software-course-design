import type { DatabaseSync } from 'node:sqlite'
import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'

import { courseFeedbackSchema } from '../../../../../packages/shared/src/index'

import { requireAuth, requireRole } from '../../lib/guards'
import { AppError, sendCreated } from '../../lib/http'
import type { LogWriter } from '../../lib/logging'

interface CourseFeedbackRouteContext {
  database: DatabaseSync
  logger: LogWriter
}

type CourseFeedbackRow = {
  id: string
  course_id: string
  student_id: string
  dimension: 'content' | 'method' | 'teaching' | 'gain' | 'other'
  content: string
  status: 'open' | 'deleted'
  created_at: string
  updated_at: string
  course_name: string
  teacher_id: string
  student_name: string | null
  student_no: string | null
}

function toCourseFeedback(row: CourseFeedbackRow) {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: row.course_name,
    studentId: row.student_id,
    studentName: row.student_name,
    studentNo: row.student_no,
    teacherId: row.teacher_id,
    dimension: row.dimension,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getCourseFeedbackById(database: DatabaseSync, feedbackId: string) {
  return database
    .prepare(
      `
        SELECT
          course_feedbacks.id,
          course_feedbacks.course_id,
          course_feedbacks.student_id,
          course_feedbacks.dimension,
          course_feedbacks.content,
          course_feedbacks.status,
          course_feedbacks.created_at,
          course_feedbacks.updated_at,
          courses.course_name,
          courses.teacher_id,
          students.real_name AS student_name,
          students.student_no
        FROM course_feedbacks
        INNER JOIN courses ON courses.id = course_feedbacks.course_id
        INNER JOIN users AS students ON students.id = course_feedbacks.student_id
        WHERE course_feedbacks.id = ?
        LIMIT 1
      `,
    )
    .get(feedbackId) as CourseFeedbackRow | undefined
}

export function registerCourseFeedbackRoutes(app: FastifyInstance, context: CourseFeedbackRouteContext) {
  app.post('/courses/:courseId/course-feedbacks', async (request, reply) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { courseId: string }
    const payload = courseFeedbackSchema.parse(request.body)

    const course = context.database
      .prepare('SELECT id FROM courses WHERE id = ? LIMIT 1')
      .get(params.courseId) as { id: string } | undefined

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    const enrollment = context.database
      .prepare(
        `
          SELECT id
          FROM course_enrollments
          WHERE course_id = ? AND student_id = ? AND status = 'enrolled'
          LIMIT 1
        `,
      )
      .get(params.courseId, actor.sub) as { id: string } | undefined

    if (!enrollment) {
      throw new AppError('course_enrollment_required', 403, 'COURSE_ENROLLMENT_REQUIRED')
    }

    const now = new Date().toISOString()
    const feedbackId = nanoid()

    context.database
      .prepare(
        `
          INSERT INTO course_feedbacks (
            id, course_id, student_id, dimension, content, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(feedbackId, params.courseId, actor.sub, payload.dimension, payload.content, 'open', now, now)

    const feedback = getCourseFeedbackById(context.database, feedbackId)

    if (!feedback) {
      throw new AppError('course_feedback_not_found', 404, 'COURSE_FEEDBACK_NOT_FOUND')
    }

    context.logger.info('course_feedback_created', {
      requestId: request.id,
      actorUserId: actor.sub,
      courseId: params.courseId,
      feedbackId,
    })

    return sendCreated(
      reply,
      request,
      {
        feedback: toCourseFeedback(feedback),
      },
      'course_feedback_created',
    )
  })

  app.get('/course-feedbacks', async (request) => {
    const actor = await requireAuth(request)
    const query = (request.query ?? {}) as { courseId?: string }
    const filters = ["course_feedbacks.status <> 'deleted'"]
    const params: string[] = []

    if (query.courseId) {
      filters.push('course_feedbacks.course_id = ?')
      params.push(query.courseId)
    }

    if (actor.role === 'student') {
      filters.push('course_feedbacks.student_id = ?')
      params.push(actor.sub)
    } else if (actor.role === 'teacher') {
      filters.push('courses.teacher_id = ?')
      params.push(actor.sub)
    }

    const items = context.database
      .prepare(
        `
          SELECT
            course_feedbacks.id,
            course_feedbacks.course_id,
            course_feedbacks.student_id,
            course_feedbacks.dimension,
            course_feedbacks.content,
            course_feedbacks.status,
            course_feedbacks.created_at,
            course_feedbacks.updated_at,
            courses.course_name,
            courses.teacher_id,
            students.real_name AS student_name,
            students.student_no
          FROM course_feedbacks
          INNER JOIN courses ON courses.id = course_feedbacks.course_id
          INNER JOIN users AS students ON students.id = course_feedbacks.student_id
          WHERE ${filters.join(' AND ')}
          ORDER BY course_feedbacks.created_at DESC
        `,
      )
      .all(...params) as CourseFeedbackRow[]

    return {
      success: true,
      message: 'ok',
      data: {
        items: items.map(toCourseFeedback),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.patch('/course-feedbacks/:feedbackId', async (request) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { feedbackId: string }
    const payload = courseFeedbackSchema.parse(request.body)
    const feedback = getCourseFeedbackById(context.database, params.feedbackId)

    if (!feedback || feedback.status === 'deleted') {
      throw new AppError('course_feedback_not_found', 404, 'COURSE_FEEDBACK_NOT_FOUND')
    }

    if (feedback.student_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const now = new Date().toISOString()

    context.database
      .prepare('UPDATE course_feedbacks SET dimension = ?, content = ?, updated_at = ? WHERE id = ?')
      .run(payload.dimension, payload.content, now, params.feedbackId)

    const updatedFeedback = getCourseFeedbackById(context.database, params.feedbackId)

    if (!updatedFeedback) {
      throw new AppError('course_feedback_not_found', 404, 'COURSE_FEEDBACK_NOT_FOUND')
    }

    context.logger.info('course_feedback_updated', {
      requestId: request.id,
      actorUserId: actor.sub,
      feedbackId: params.feedbackId,
    })

    return {
      success: true,
      message: 'course_feedback_updated',
      data: {
        feedback: toCourseFeedback(updatedFeedback),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.delete('/course-feedbacks/:feedbackId', async (request) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { feedbackId: string }
    const feedback = getCourseFeedbackById(context.database, params.feedbackId)

    if (!feedback || feedback.status === 'deleted') {
      throw new AppError('course_feedback_not_found', 404, 'COURSE_FEEDBACK_NOT_FOUND')
    }

    if (feedback.student_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const now = new Date().toISOString()

    context.database
      .prepare("UPDATE course_feedbacks SET status = 'deleted', updated_at = ? WHERE id = ?")
      .run(now, params.feedbackId)

    context.logger.info('course_feedback_deleted', {
      requestId: request.id,
      actorUserId: actor.sub,
      feedbackId: params.feedbackId,
    })

    return {
      success: true,
      message: 'course_feedback_deleted',
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
