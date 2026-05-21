import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'

import {
  assignmentCancelSchema,
  assignmentDraftSchema,
  assignmentUpdateSchema,
} from '../../../../../packages/shared/src/index'

import type { Database } from '../../lib/db/client'
import type { LogWriter } from '../../lib/logging'
import { requireAuth, requireRole } from '../../lib/guards'
import { AppError, sendCreated } from '../../lib/http'

interface AssignmentRouteContext {
  database: Database
  logger: LogWriter
}

type AssignmentRow = {
  id: string
  course_id: string
  teacher_id: string
  title: string
  description: string
  requirement: string
  start_at: string
  due_at: string
  status: string
  cancel_reason: string | null
}

function toAssignment(row: AssignmentRow) {
  return {
    id: row.id,
    courseId: row.course_id,
    teacherId: row.teacher_id,
    title: row.title,
    description: row.description,
    requirement: row.requirement,
    startAt: row.start_at,
    dueAt: row.due_at,
    status: row.status,
    cancelReason: row.cancel_reason,
  }
}

async function assertAssignmentEditable(database: Database, assignment: AssignmentRow) {
  const now = Date.now()
  const currentDueAt = new Date(assignment.due_at).getTime()

  if (Number.isFinite(currentDueAt) && currentDueAt <= now) {
    throw new AppError('assignment_deadline_passed', 409, 'ASSIGNMENT_DEADLINE_PASSED')
  }

  const submissionCount = (await database
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM submissions
        WHERE assignment_id = ?
      `,
    )
    .get(assignment.id)) as { count: number }

  if (submissionCount.count > 0) {
    throw new AppError('assignment_already_submitted', 409, 'ASSIGNMENT_ALREADY_SUBMITTED')
  }
}

async function getAssignmentById(database: Database, assignmentId: string) {
  return (await database
    .prepare(
      `
        SELECT
          id,
          course_id,
          teacher_id,
          title,
          description,
          requirement,
          start_at,
          due_at,
          status,
          cancel_reason
        FROM assignments
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(assignmentId)) as AssignmentRow | undefined
}

export function registerAssignmentRoutes(app: FastifyInstance, context: AssignmentRouteContext) {
  app.get('/courses/:courseId/assignments', async (request) => {
    const actor = await requireAuth(request)
    const params = request.params as { courseId: string }

    const course = (await context.database
      .prepare(
        `
          SELECT id, teacher_id
          FROM courses
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(params.courseId)) as { id: string; teacher_id: string } | undefined

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    if (actor.role === 'teacher' && course.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    if (actor.role === 'student') {
      const enrollment = (await context.database
        .prepare(
          `
            SELECT id
            FROM course_enrollments
            WHERE course_id = ? AND student_id = ? AND status = 'enrolled'
            LIMIT 1
          `,
        )
        .get(params.courseId, actor.sub)) as { id: string } | undefined

      if (!enrollment) {
        throw new AppError('forbidden', 403, 'FORBIDDEN')
      }
    }

    const items = (await context.database
      .prepare(
        `
          SELECT
            id,
            course_id,
            teacher_id,
            title,
            description,
            requirement,
            start_at,
            due_at,
            status,
            cancel_reason
          FROM assignments
          WHERE course_id = ?
          ORDER BY created_at DESC
        `,
      )
      .all(params.courseId)) as AssignmentRow[]

    const assignmentItems = items.map(toAssignment)

    if (actor.role !== 'student' || items.length === 0) {
      return {
        success: true,
        message: 'ok',
        data: {
          items: assignmentItems,
        },
        meta: {
          requestId: request.id,
        },
      }
    }

    const placeholders = items.map(() => '?').join(', ')
    const studentSubmissions = (await context.database
      .prepare(
        `
          SELECT
            id,
            assignment_id,
            student_id,
            content,
            status,
            score,
            teacher_feedback,
            submitted_at,
            graded_at
          FROM submissions
          WHERE student_id = ? AND assignment_id IN (${placeholders})
        `,
      )
      .all(actor.sub, ...items.map((item) => item.id))) as Array<{
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
    const submissionByAssignmentId = new Map(
      studentSubmissions.map((submission) => [submission.assignment_id, submission]),
    )

    return {
      success: true,
      message: 'ok',
      data: {
        items: assignmentItems.map((assignment) => {
          const submission = submissionByAssignmentId.get(assignment.id) ?? null
          return {
            ...assignment,
            hasSubmitted: submission !== null,
            submissionId: submission?.id ?? null,
            mySubmission: submission
              ? {
                  id: submission.id,
                  assignmentId: submission.assignment_id,
                  studentId: submission.student_id,
                  content: submission.content,
                  status: submission.status,
                  score: submission.score,
                  teacherFeedback: submission.teacher_feedback,
                  submittedAt: submission.submitted_at,
                  gradedAt: submission.graded_at,
                }
              : null,
          }
        }),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/courses/:courseId/assignments', async (request, reply) => {
    const actor = await requireRole(request, ['teacher'])
    const params = request.params as { courseId: string }
    const payload = assignmentDraftSchema.parse(request.body)

    const course = (await context.database
      .prepare(
        `
          SELECT id, teacher_id
          FROM courses
          WHERE id = ?
          LIMIT 1
        `,
      )
      .get(params.courseId)) as { id: string; teacher_id: string } | undefined

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    if (course.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const now = new Date().toISOString()
    const assignmentId = nanoid()

    await context.database
      .prepare(
        `
          INSERT INTO assignments (
            id, course_id, teacher_id, title, description, requirement,
            start_at, due_at, status, cancel_reason, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        assignmentId,
        params.courseId,
        actor.sub,
        payload.title,
        payload.description,
        payload.requirement,
        payload.startAt,
        payload.dueAt,
        'published',
        null,
        now,
        now,
      )

    context.logger.info('assignment_created', {
      requestId: request.id,
      actorUserId: actor.sub,
      assignmentId,
      courseId: params.courseId,
    })

    return sendCreated(
      reply,
      request,
      {
        assignment: {
          id: assignmentId,
          courseId: params.courseId,
          teacherId: actor.sub,
          title: payload.title,
          description: payload.description,
          requirement: payload.requirement,
          startAt: payload.startAt,
          dueAt: payload.dueAt,
          status: 'published',
        },
      },
      'assignment_created',
    )
  })

  app.patch('/assignments/:assignmentId', async (request) => {
    const actor = await requireRole(request, ['teacher'])
    const params = request.params as { assignmentId: string }
    const payload = assignmentUpdateSchema.parse(request.body)
    const assignment = await getAssignmentById(context.database, params.assignmentId)

    if (!assignment) {
      throw new AppError('assignment_not_found', 404, 'ASSIGNMENT_NOT_FOUND')
    }

    if (assignment.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    if (assignment.status === 'cancelled') {
      throw new AppError('assignment_cancelled', 409, 'ASSIGNMENT_CANCELLED')
    }

    await assertAssignmentEditable(context.database, assignment)

    const now = new Date().toISOString()
    const nextAssignment = {
      title: payload.title ?? assignment.title,
      description: payload.description ?? assignment.description,
      requirement: payload.requirement ?? assignment.requirement,
      startAt: payload.startAt ?? assignment.start_at,
      dueAt: payload.dueAt ?? assignment.due_at,
    }

    await context.database
      .prepare(
        `
          UPDATE assignments
          SET title = ?, description = ?, requirement = ?, start_at = ?, due_at = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .run(
        nextAssignment.title,
        nextAssignment.description,
        nextAssignment.requirement,
        nextAssignment.startAt,
        nextAssignment.dueAt,
        now,
        params.assignmentId,
      )

    const updatedAssignment = await getAssignmentById(context.database, params.assignmentId)

    if (!updatedAssignment) {
      throw new AppError('assignment_not_found', 404, 'ASSIGNMENT_NOT_FOUND')
    }

    context.logger.info('assignment_updated', {
      requestId: request.id,
      actorUserId: actor.sub,
      assignmentId: params.assignmentId,
    })

    return {
      success: true,
      message: 'assignment_updated',
      data: {
        assignment: toAssignment(updatedAssignment),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/assignments/:assignmentId/cancel', async (request) => {
    const actor = await requireRole(request, ['teacher'])
    const params = request.params as { assignmentId: string }
    const payload = assignmentCancelSchema.parse(request.body)
    const assignment = await getAssignmentById(context.database, params.assignmentId)

    if (!assignment) {
      throw new AppError('assignment_not_found', 404, 'ASSIGNMENT_NOT_FOUND')
    }

    if (assignment.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const now = new Date().toISOString()

    await context.database.prepare('DELETE FROM submissions WHERE assignment_id = ?').run(params.assignmentId)
    await context.database
      .prepare(
        `
          UPDATE assignments
          SET status = 'cancelled', cancel_reason = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .run(payload.reason, now, params.assignmentId)

    const cancelledAssignment = await getAssignmentById(context.database, params.assignmentId)

    if (!cancelledAssignment) {
      throw new AppError('assignment_not_found', 404, 'ASSIGNMENT_NOT_FOUND')
    }

    context.logger.info('assignment_cancelled', {
      requestId: request.id,
      actorUserId: actor.sub,
      assignmentId: params.assignmentId,
    })

    return {
      success: true,
      message: 'assignment_cancelled',
      data: {
        assignment: toAssignment(cancelledAssignment),
      },
      meta: {
        requestId: request.id,
      },
    }
  })
}
