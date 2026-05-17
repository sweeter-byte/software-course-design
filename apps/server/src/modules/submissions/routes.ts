import type { DatabaseSync } from 'node:sqlite'
import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'

import {
  submissionGradeSchema,
  submissionSchema,
} from '../../../../../packages/shared/src/index'

import type { LogWriter } from '../../lib/logging'
import { requireAuth, requireRole } from '../../lib/guards'
import { AppError, sendCreated } from '../../lib/http'

interface SubmissionRouteContext {
  database: DatabaseSync
  logger: LogWriter
}

type SubmissionDetailRow = {
  id: string
  assignment_id: string
  student_id: string
  content: string
  status: string
  score: number | null
  teacher_feedback: string | null
  submitted_at: string | null
  graded_at: string | null
  created_at: string
  updated_at: string
  teacher_id: string
  due_at: string
  assignment_status: string
}

function toSubmission(row: SubmissionDetailRow) {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    content: row.content,
    status: row.status,
    score: row.score,
    teacherFeedback: row.teacher_feedback,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getSubmissionDetail(database: DatabaseSync, submissionId: string) {
  return database
    .prepare(
      `
        SELECT
          submissions.id,
          submissions.assignment_id,
          submissions.student_id,
          submissions.content,
          submissions.status,
          submissions.score,
          submissions.teacher_feedback,
          submissions.submitted_at,
          submissions.graded_at,
          submissions.created_at,
          submissions.updated_at,
          assignments.teacher_id,
          assignments.due_at,
          assignments.status AS assignment_status
        FROM submissions
        INNER JOIN assignments ON assignments.id = submissions.assignment_id
        WHERE submissions.id = ?
        LIMIT 1
      `,
    )
    .get(submissionId) as SubmissionDetailRow | undefined
}

export function registerSubmissionRoutes(app: FastifyInstance, context: SubmissionRouteContext) {
  app.get('/assignments/:assignmentId/submissions', async (request) => {
    const actor = await requireAuth(request)
    const params = request.params as { assignmentId: string }

    const assignment = context.database
      .prepare(
        `
          SELECT id, teacher_id
          FROM assignments
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(params.assignmentId) as { id: string; teacher_id: string } | undefined

    if (!assignment) {
      throw new AppError('assignment_not_found', 404, 'ASSIGNMENT_NOT_FOUND')
    }

    if (actor.role === 'teacher' && assignment.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    if (actor.role === 'student') {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const items = context.database
      .prepare(
        `
          SELECT
            id, assignment_id, student_id, content, status, score, teacher_feedback,
            submitted_at, graded_at
          FROM submissions
          WHERE assignment_id = ?
          ORDER BY submitted_at DESC
        `,
      )
      .all(params.assignmentId) as Array<{
      id: string
      assignment_id: string
      student_id: string
      content: string
      status: string
      score: number | null
      teacher_feedback: string | null
      submitted_at: string | null
      graded_at: string | null
    }>

    return {
      success: true,
      message: 'ok',
      data: {
        items: items.map((item) => ({
          id: item.id,
          assignmentId: item.assignment_id,
          studentId: item.student_id,
          content: item.content,
          status: item.status,
          score: item.score,
          teacherFeedback: item.teacher_feedback,
          submittedAt: item.submitted_at,
          gradedAt: item.graded_at,
        })),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/assignments/:assignmentId/submissions', async (request, reply) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { assignmentId: string }
    const payload = submissionSchema.parse(request.body)

    const assignment = context.database
      .prepare(
        `
          SELECT id, course_id, due_at, status
          FROM assignments
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(params.assignmentId) as
      | {
          id: string
          course_id: string
          due_at: string
          status: string
        }
      | undefined

    if (!assignment) {
      throw new AppError('assignment_not_found', 404, 'ASSIGNMENT_NOT_FOUND')
    }

    if (assignment.status !== 'published') {
      throw new AppError('assignment_not_available', 409, 'ASSIGNMENT_NOT_AVAILABLE')
    }

    if (new Date(assignment.due_at).getTime() < Date.now()) {
      throw new AppError('assignment_deadline_passed', 409, 'ASSIGNMENT_DEADLINE_PASSED')
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
      .get(assignment.course_id, actor.sub) as { id: string } | undefined

    if (!enrollment) {
      throw new AppError('course_enrollment_required', 403, 'COURSE_ENROLLMENT_REQUIRED')
    }

    const now = new Date().toISOString()
    const existingSubmission = context.database
      .prepare(
        `
          SELECT id, status
          FROM submissions
          WHERE assignment_id = ? AND student_id = ?
          LIMIT 1
        `,
      )
      .get(params.assignmentId, actor.sub) as { id: string; status: string } | undefined

    if (existingSubmission?.status === 'graded') {
      throw new AppError('submission_already_graded', 409, 'SUBMISSION_ALREADY_GRADED')
    }

    const submissionId = existingSubmission?.id ?? nanoid()

    if (existingSubmission) {
      context.database
        .prepare(
          `
            UPDATE submissions
            SET content = ?, status = 'submitted', submitted_at = ?, updated_at = ?
            WHERE id = ?
          `,
        )
        .run(payload.content, now, now, submissionId)
    } else {
      context.database
        .prepare(
          `
            INSERT INTO submissions (
              id, assignment_id, student_id, content, status, score, teacher_feedback,
              submitted_at, graded_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          submissionId,
          params.assignmentId,
          actor.sub,
          payload.content,
          'submitted',
          null,
          null,
          now,
          null,
          now,
          now,
        )
    }

    context.logger.info('submission_saved', {
      requestId: request.id,
      assignmentId: params.assignmentId,
      submissionId,
      actorUserId: actor.sub,
    })

    return sendCreated(
      reply,
      request,
      {
        submission: {
          id: submissionId,
          assignmentId: params.assignmentId,
          studentId: actor.sub,
          content: payload.content,
          status: 'submitted',
          submittedAt: now,
        },
      },
      'submission_created',
    )
  })

  app.get('/submissions/:submissionId', async (request) => {
    const actor = await requireAuth(request)
    const params = request.params as { submissionId: string }
    const submission = getSubmissionDetail(context.database, params.submissionId)

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

    return {
      success: true,
      message: 'ok',
      data: {
        submission: toSubmission(submission),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.patch('/submissions/:submissionId', async (request) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { submissionId: string }
    const payload = submissionSchema.parse(request.body)
    const submission = getSubmissionDetail(context.database, params.submissionId)

    if (!submission) {
      throw new AppError('submission_not_found', 404, 'SUBMISSION_NOT_FOUND')
    }

    if (submission.student_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    if (submission.status === 'graded') {
      throw new AppError('submission_already_graded', 409, 'SUBMISSION_ALREADY_GRADED')
    }

    if (submission.assignment_status !== 'published') {
      throw new AppError('assignment_not_available', 409, 'ASSIGNMENT_NOT_AVAILABLE')
    }

    if (new Date(submission.due_at).getTime() < Date.now()) {
      throw new AppError('assignment_deadline_passed', 409, 'ASSIGNMENT_DEADLINE_PASSED')
    }

    const now = new Date().toISOString()

    context.database
      .prepare(
        `
          UPDATE submissions
          SET content = ?, status = 'submitted', submitted_at = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .run(payload.content, now, now, params.submissionId)

    const updatedSubmission = getSubmissionDetail(context.database, params.submissionId)

    if (!updatedSubmission) {
      throw new AppError('submission_not_found', 404, 'SUBMISSION_NOT_FOUND')
    }

    context.logger.info('submission_updated', {
      requestId: request.id,
      assignmentId: updatedSubmission.assignment_id,
      submissionId: params.submissionId,
      actorUserId: actor.sub,
    })

    return {
      success: true,
      message: 'submission_updated',
      data: {
        submission: toSubmission(updatedSubmission),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/submissions/:submissionId/grade', async (request, reply) => {
    const actor = await requireRole(request, ['teacher'])
    const params = request.params as { submissionId: string }
    const payload = submissionGradeSchema.parse(request.body)

    const submission = context.database
      .prepare(
        `
          SELECT
            submissions.id,
            submissions.assignment_id,
            assignments.teacher_id
          FROM submissions
          INNER JOIN assignments ON assignments.id = submissions.assignment_id
          WHERE submissions.id = ?
          LIMIT 1
        `,
      )
      .get(params.submissionId) as
      | {
          id: string
          assignment_id: string
          teacher_id: string
        }
      | undefined

    if (!submission) {
      throw new AppError('submission_not_found', 404, 'SUBMISSION_NOT_FOUND')
    }

    if (submission.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const now = new Date().toISOString()

    context.database
      .prepare(
        `
          UPDATE submissions
          SET status = 'graded', score = ?, teacher_feedback = ?, graded_at = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .run(payload.score, payload.teacherFeedback, now, now, params.submissionId)

    context.logger.info('submission_graded', {
      requestId: request.id,
      actorUserId: actor.sub,
      submissionId: params.submissionId,
      score: payload.score,
    })

    return reply.send({
      success: true,
      message: 'submission_graded',
      data: {
        submission: {
          id: params.submissionId,
          assignmentId: submission.assignment_id,
          status: 'graded',
          score: payload.score,
          teacherFeedback: payload.teacherFeedback,
          gradedAt: now,
        },
      },
      meta: {
        requestId: request.id,
      },
    })
  })
}
