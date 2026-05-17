import type { DatabaseSync } from 'node:sqlite'
import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'

import { courseCreateSchema, courseUpdateSchema } from '../../../../../packages/shared/src/index'

import type { LogWriter } from '../../lib/logging'
import { requireRole } from '../../lib/guards'
import { AppError, sendCreated } from '../../lib/http'

interface CourseRouteContext {
  database: DatabaseSync
  logger: LogWriter
}

type CourseRow = {
  id: string
  course_code: string
  course_name: string
  description: string
  teacher_id: string
  semester: string
  location: string
  schedule_text: string
  capacity: number
  start_date: string
  end_date: string
  status: string
}

function toCourse(row: CourseRow) {
  return {
    id: row.id,
    courseCode: row.course_code,
    courseName: row.course_name,
    description: row.description,
    teacherId: row.teacher_id,
    semester: row.semester,
    location: row.location,
    scheduleText: row.schedule_text,
    capacity: row.capacity,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  }
}

function getCourseById(database: DatabaseSync, courseId: string) {
  return database
    .prepare(
      `
        SELECT
          id,
          course_code,
          course_name,
          description,
          teacher_id,
          semester,
          location,
          schedule_text,
          capacity,
          start_date,
          end_date,
          status
        FROM courses
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(courseId) as CourseRow | undefined
}

export function registerCourseRoutes(app: FastifyInstance, context: CourseRouteContext) {
  app.post('/:courseId/enroll', async (request, reply) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { courseId: string }
    const course = context.database
      .prepare('SELECT id, capacity FROM courses WHERE id = ? LIMIT 1')
      .get(params.courseId) as { id: string; capacity: number } | undefined

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    const existingEnrollment = context.database
      .prepare(
        `
          SELECT id
          FROM course_enrollments
          WHERE course_id = ? AND student_id = ? AND status = 'enrolled'
          LIMIT 1
        `,
      )
      .get(params.courseId, actor.sub) as { id: string } | undefined

    if (existingEnrollment) {
      throw new AppError('already_enrolled', 409, 'ALREADY_ENROLLED')
    }

    const enrolledCount = context.database
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM course_enrollments
          WHERE course_id = ? AND status = 'enrolled'
        `,
      )
      .get(params.courseId) as { count: number }

    if (enrolledCount.count >= course.capacity) {
      throw new AppError('course_full', 409, 'COURSE_FULL')
    }

    const now = new Date().toISOString()
    const enrollmentId = nanoid()

    context.database
      .prepare(
        `
          INSERT INTO course_enrollments (
            id, course_id, student_id, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(enrollmentId, params.courseId, actor.sub, 'enrolled', now, now)

    context.logger.info('course_enrolled', {
      requestId: request.id,
      actorUserId: actor.sub,
      courseId: params.courseId,
      enrollmentId,
    })

    return sendCreated(
      reply,
      request,
      {
        enrollment: {
          id: enrollmentId,
          courseId: params.courseId,
          studentId: actor.sub,
          status: 'enrolled',
        },
      },
      'course_enrolled',
    )
  })

  app.get('/:courseId', async (request) => {
    await requireRole(request, ['student', 'teacher', 'officer'])
    const params = request.params as { courseId: string }
    const course = getCourseById(context.database, params.courseId)

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    return {
      success: true,
      message: 'ok',
      data: {
        course: toCourse(course),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.get('/', async (request) => {
    await requireRole(request, ['student', 'teacher', 'officer'])

    const query = (request.query ?? {}) as {
      keyword?: string
      teacherId?: string
      semester?: string
      location?: string
      status?: string
    }
    const keyword = query.keyword?.trim()
    const filters: string[] = []
    const params: string[] = []

    if (keyword) {
      filters.push('(course_name LIKE ? OR course_code LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    if (query.teacherId) {
      filters.push('teacher_id = ?')
      params.push(query.teacherId)
    }

    if (query.semester) {
      filters.push('semester = ?')
      params.push(query.semester)
    }

    if (query.location) {
      filters.push('location LIKE ?')
      params.push(`%${query.location}%`)
    }

    if (query.status) {
      filters.push('status = ?')
      params.push(query.status)
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''

    const items = context.database
      .prepare(
        `
          SELECT
            id,
            course_code,
            course_name,
            description,
            teacher_id,
            semester,
            location,
            schedule_text,
            capacity,
            start_date,
            end_date,
            status
          FROM courses
          ${whereClause}
          ORDER BY created_at DESC
        `,
      )
      .all(...params) as CourseRow[]

    return {
      success: true,
      message: 'ok',
      data: {
        items: items.map(toCourse),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/', async (request, reply) => {
    const actor = await requireRole(request, ['officer'])
    const payload = courseCreateSchema.parse(request.body)

    const teacher = context.database
      .prepare('SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1')
      .get(payload.teacherId, 'teacher') as { id: string } | undefined

    if (!teacher) {
      throw new AppError('teacher_not_found', 404, 'TEACHER_NOT_FOUND')
    }

    const courseExists = context.database
      .prepare('SELECT id FROM courses WHERE course_code = ? LIMIT 1')
      .get(payload.courseCode) as { id: string } | undefined

    if (courseExists) {
      throw new AppError('course_code_exists', 409, 'COURSE_CODE_EXISTS')
    }

    const now = new Date().toISOString()
    const courseId = nanoid()

    context.database
      .prepare(
        `
          INSERT INTO courses (
            id, course_code, course_name, description, teacher_id, created_by,
            semester, location, schedule_text, capacity, start_date, end_date,
            status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        courseId,
        payload.courseCode,
        payload.courseName,
        payload.description,
        payload.teacherId,
        actor.sub,
        payload.semester,
        payload.location,
        payload.scheduleText,
        payload.capacity,
        payload.startDate,
        payload.endDate,
        'not_started',
        now,
        now,
      )

    context.logger.info('course_created', {
      requestId: request.id,
      actorUserId: actor.sub,
      courseId,
      courseCode: payload.courseCode,
    })

    return sendCreated(
      reply,
      request,
      {
        course: {
          id: courseId,
          courseCode: payload.courseCode,
          courseName: payload.courseName,
          teacherId: payload.teacherId,
          semester: payload.semester,
          status: 'not_started',
        },
      },
      'course_created',
    )
  })

  app.patch('/:courseId', async (request) => {
    const actor = await requireRole(request, ['officer'])
    const params = request.params as { courseId: string }
    const payload = courseUpdateSchema.parse(request.body)
    const currentCourse = getCourseById(context.database, params.courseId)

    if (!currentCourse) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    if (payload.teacherId) {
      const teacher = context.database
        .prepare('SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1')
        .get(payload.teacherId, 'teacher') as { id: string } | undefined

      if (!teacher) {
        throw new AppError('teacher_not_found', 404, 'TEACHER_NOT_FOUND')
      }
    }

    const nextCourse = {
      courseCode: payload.courseCode ?? currentCourse.course_code,
      courseName: payload.courseName ?? currentCourse.course_name,
      description: payload.description ?? currentCourse.description,
      teacherId: payload.teacherId ?? currentCourse.teacher_id,
      semester: payload.semester ?? currentCourse.semester,
      location: payload.location ?? currentCourse.location,
      scheduleText: payload.scheduleText ?? currentCourse.schedule_text,
      capacity: payload.capacity ?? currentCourse.capacity,
      startDate: payload.startDate ?? currentCourse.start_date,
      endDate: payload.endDate ?? currentCourse.end_date,
      status: payload.status ?? currentCourse.status,
    }
    const now = new Date().toISOString()

    context.database
      .prepare(
        `
          UPDATE courses
          SET course_code = ?, course_name = ?, description = ?, teacher_id = ?,
              semester = ?, location = ?, schedule_text = ?, capacity = ?,
              start_date = ?, end_date = ?, status = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .run(
        nextCourse.courseCode,
        nextCourse.courseName,
        nextCourse.description,
        nextCourse.teacherId,
        nextCourse.semester,
        nextCourse.location,
        nextCourse.scheduleText,
        nextCourse.capacity,
        nextCourse.startDate,
        nextCourse.endDate,
        nextCourse.status,
        now,
        params.courseId,
      )

    const updatedCourse = getCourseById(context.database, params.courseId)

    if (!updatedCourse) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    context.logger.info('course_updated', {
      requestId: request.id,
      actorUserId: actor.sub,
      courseId: params.courseId,
    })

    return {
      success: true,
      message: 'course_updated',
      data: {
        course: toCourse(updatedCourse),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.delete('/:courseId', async (request) => {
    const actor = await requireRole(request, ['officer'])
    const params = request.params as { courseId: string }
    const course = getCourseById(context.database, params.courseId)

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    context.database.prepare('DELETE FROM courses WHERE id = ?').run(params.courseId)

    context.logger.info('course_deleted', {
      requestId: request.id,
      actorUserId: actor.sub,
      courseId: params.courseId,
    })

    return {
      success: true,
      message: 'course_deleted',
      data: {
        course: {
          id: params.courseId,
        },
      },
      meta: {
        requestId: request.id,
      },
    }
  })
}
