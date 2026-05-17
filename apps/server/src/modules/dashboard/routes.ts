import type { DatabaseSync } from 'node:sqlite'
import type { FastifyInstance } from 'fastify'

import { requireRole } from '../../lib/guards'

interface DashboardRouteContext {
  database: DatabaseSync
}

export function registerDashboardRoutes(app: FastifyInstance, context: DashboardRouteContext) {
  app.get('/officer', async (request) => {
    await requireRole(request, ['officer'])

    const totalCourses = (context.database.prepare('SELECT COUNT(*) AS count FROM courses').get() as { count: number }).count
    const totalTeachers = (
      context.database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'teacher'").get() as { count: number }
    ).count
    const totalStudents = (
      context.database.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'student'").get() as { count: number }
    ).count
    const openFeedbacks = (
      context.database.prepare("SELECT COUNT(*) AS count FROM feedbacks WHERE status = 'open'").get() as { count: number }
    ).count
    const courseFeedbacks = (
      context.database.prepare('SELECT COUNT(*) AS count FROM course_feedbacks').get() as { count: number }
    ).count

    return {
      success: true,
      message: 'ok',
      data: {
        summary: {
          totalCourses,
          totalTeachers,
          totalStudents,
          openFeedbacks,
          courseFeedbacks,
        },
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.get('/teacher', async (request) => {
    const actor = await requireRole(request, ['teacher'])

    const totalCourses = (
      context.database
        .prepare('SELECT COUNT(*) AS count FROM courses WHERE teacher_id = ?')
        .get(actor.sub) as { count: number }
    ).count
    const publishedAssignments = (
      context.database
        .prepare("SELECT COUNT(*) AS count FROM assignments WHERE teacher_id = ? AND status = 'published'")
        .get(actor.sub) as { count: number }
    ).count
    const pendingGrades = (
      context.database
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM submissions
            INNER JOIN assignments ON assignments.id = submissions.assignment_id
            WHERE assignments.teacher_id = ? AND submissions.status = 'submitted'
          `,
        )
        .get(actor.sub) as { count: number }
    ).count
    const openFeedbacks = (
      context.database
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM feedbacks
            INNER JOIN assignments ON assignments.id = feedbacks.assignment_id
            WHERE assignments.teacher_id = ? AND feedbacks.status = 'open'
          `,
        )
        .get(actor.sub) as { count: number }
    ).count
    const courseFeedbacks = (
      context.database
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM course_feedbacks
            INNER JOIN courses ON courses.id = course_feedbacks.course_id
            WHERE courses.teacher_id = ?
          `,
        )
        .get(actor.sub) as { count: number }
    ).count

    return {
      success: true,
      message: 'ok',
      data: {
        summary: {
          totalCourses,
          publishedAssignments,
          pendingGrades,
          openFeedbacks,
          courseFeedbacks,
        },
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.get('/student', async (request) => {
    const actor = await requireRole(request, ['student'])

    const enrolledCourses = (
      context.database
        .prepare("SELECT COUNT(*) AS count FROM course_enrollments WHERE student_id = ? AND status = 'enrolled'")
        .get(actor.sub) as { count: number }
    ).count
    const pendingAssignments = (
      context.database
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM assignments
            INNER JOIN course_enrollments ON course_enrollments.course_id = assignments.course_id
            LEFT JOIN submissions
              ON submissions.assignment_id = assignments.id
             AND submissions.student_id = course_enrollments.student_id
            WHERE course_enrollments.student_id = ?
              AND course_enrollments.status = 'enrolled'
              AND assignments.status = 'published'
              AND submissions.id IS NULL
          `,
        )
        .get(actor.sub) as { count: number }
    ).count
    const gradedSubmissions = (
      context.database
        .prepare("SELECT COUNT(*) AS count FROM submissions WHERE student_id = ? AND status = 'graded'")
        .get(actor.sub) as { count: number }
    ).count
    const openFeedbacks = (
      context.database
        .prepare("SELECT COUNT(*) AS count FROM feedbacks WHERE student_id = ? AND status = 'open'")
        .get(actor.sub) as { count: number }
    ).count
    const courseFeedbacks = (
      context.database
        .prepare('SELECT COUNT(*) AS count FROM course_feedbacks WHERE student_id = ?')
        .get(actor.sub) as { count: number }
    ).count

    return {
      success: true,
      message: 'ok',
      data: {
        summary: {
          enrolledCourses,
          pendingAssignments,
          gradedSubmissions,
          openFeedbacks,
          courseFeedbacks,
        },
      },
      meta: {
        requestId: request.id,
      },
    }
  })
}
