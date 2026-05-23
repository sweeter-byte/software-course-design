import type { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'

import { courseCreateSchema, courseUpdateSchema } from '../../../../../packages/shared/src/index'

import type { Database } from '../../lib/db/client'
import type { LogWriter } from '../../lib/logging'
import { requireRole } from '../../lib/guards'
import { AppError, sendCreated } from '../../lib/http'

interface CourseRouteContext {
  database: Database
  logger: LogWriter
}

type CourseRow = {
  id: string
  course_code: string
  course_name: string
  description: string
  teacher_id: string
  teacher_name?: string | null
  teacher_no?: string | null
  semester: string
  location: string
  schedule_text: string
  capacity: number
  start_date: string
  end_date: string
  status: string
  enrolled?: number | null
}

/**
 * Course status is derived from the schedule plus a suspended flag instead
 * of being a free-form column an officer can flip manually. The stored
 * status column is used purely to remember the suspended state (status =
 * 'suspended' means the course is paused); every other value is recomputed
 * from start_date / end_date / today on each read.
 */
function deriveCourseStatus(
  row: Pick<CourseRow, 'status' | 'start_date' | 'end_date'>,
  nowMs: number = Date.now(),
): 'not_started' | 'active' | 'completed' | 'suspended' {
  if (row.status === 'suspended') return 'suspended'
  const startMs = Date.parse(row.start_date)
  const endMs = Date.parse(row.end_date)
  if (Number.isFinite(endMs) && nowMs > endMs) return 'completed'
  if (Number.isFinite(startMs) && nowMs < startMs) return 'not_started'
  return 'active'
}

function toCourse(row: CourseRow, options?: { includeEnrolled?: boolean }) {
  const derivedStatus = deriveCourseStatus(row)
  const base = {
    id: row.id,
    courseCode: row.course_code,
    courseName: row.course_name,
    description: row.description,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name ?? null,
    teacherNo: row.teacher_no ?? null,
    semester: row.semester,
    location: row.location,
    scheduleText: row.schedule_text,
    capacity: row.capacity,
    startDate: row.start_date,
    endDate: row.end_date,
    status: derivedStatus,
    suspended: row.status === 'suspended',
  }

  if (options?.includeEnrolled) {
    return { ...base, enrolled: Boolean(row.enrolled) }
  }

  return base
}

async function getCourseById(database: Database, courseId: string, studentId?: string) {
  if (studentId) {
    return (await database
      .prepare(
        `
          SELECT
            courses.id,
            courses.course_code,
            courses.course_name,
            courses.description,
            courses.teacher_id,
            teachers.real_name AS teacher_name,
            teachers.teacher_no AS teacher_no,
            courses.semester,
            courses.location,
            courses.schedule_text,
            courses.capacity,
            courses.start_date,
            courses.end_date,
            courses.status,
            CASE WHEN enrollments.id IS NULL THEN 0 ELSE 1 END AS enrolled
          FROM courses
          LEFT JOIN users AS teachers
            ON teachers.id = courses.teacher_id
          LEFT JOIN course_enrollments AS enrollments
            ON enrollments.course_id = courses.id
            AND enrollments.student_id = ?
            AND enrollments.status = 'enrolled'
          WHERE courses.id = ?
          LIMIT 1
        `,
      )
      .get(studentId, courseId)) as CourseRow | undefined
  }

  return (await database
    .prepare(
      `
        SELECT
          courses.id,
          courses.course_code,
          courses.course_name,
          courses.description,
          courses.teacher_id,
          teachers.real_name AS teacher_name,
          teachers.teacher_no AS teacher_no,
          courses.semester,
          courses.location,
          courses.schedule_text,
          courses.capacity,
          courses.start_date,
          courses.end_date,
          courses.status
        FROM courses
        LEFT JOIN users AS teachers
          ON teachers.id = courses.teacher_id
        WHERE courses.id = ?
        LIMIT 1
      `,
    )
    .get(courseId)) as CourseRow | undefined
}

export function registerCourseRoutes(app: FastifyInstance, context: CourseRouteContext) {
  app.get('/:courseId/enrollments', async (request) => {
    const actor = await requireRole(request, ['officer', 'teacher'])
    const params = request.params as { courseId: string }

    const course = (await context.database
      .prepare('SELECT id, teacher_id FROM courses WHERE id = ? LIMIT 1')
      .get(params.courseId)) as { id: string; teacher_id: string } | undefined

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    // Teachers may only see the roster of their own courses; officers can
    // see any course.
    if (actor.role === 'teacher' && course.teacher_id !== actor.sub) {
      throw new AppError('forbidden', 403, 'FORBIDDEN')
    }

    const rows = (await context.database
      .prepare(
        `
          SELECT
            users.id AS student_id,
            users.real_name AS real_name,
            users.student_no AS student_no,
            users.phone AS phone,
            users.email AS email,
            users.college AS college,
            users.major AS major,
            users.class_name AS class_name,
            course_enrollments.created_at AS enrolled_at,
            course_enrollments.status AS enrollment_status
          FROM course_enrollments
          INNER JOIN users ON users.id = course_enrollments.student_id
          WHERE course_enrollments.course_id = ?
            AND course_enrollments.status = 'enrolled'
          ORDER BY course_enrollments.created_at ASC
        `,
      )
      .all(params.courseId)) as Array<{
      student_id: string
      real_name: string
      student_no: string | null
      phone: string
      email: string | null
      college: string | null
      major: string | null
      class_name: string | null
      enrolled_at: string
      enrollment_status: string
    }>

    return {
      success: true,
      message: 'ok',
      data: {
        items: rows.map((row) => ({
          studentId: row.student_id,
          realName: row.real_name,
          studentNo: row.student_no,
          phone: row.phone,
          email: row.email,
          college: row.college,
          major: row.major,
          className: row.class_name,
          enrolledAt: row.enrolled_at,
          status: row.enrollment_status,
        })),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/:courseId/enroll', async (request, reply) => {
    const actor = await requireRole(request, ['student'])
    const params = request.params as { courseId: string }
    const course = (await context.database
      .prepare('SELECT id, capacity FROM courses WHERE id = ? LIMIT 1')
      .get(params.courseId)) as { id: string; capacity: number } | undefined

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    const existingEnrollment = (await context.database
      .prepare(
        `
          SELECT id
          FROM course_enrollments
          WHERE course_id = ? AND student_id = ? AND status = 'enrolled'
          LIMIT 1
        `,
      )
      .get(params.courseId, actor.sub)) as { id: string } | undefined

    if (existingEnrollment) {
      throw new AppError('already_enrolled', 409, 'ALREADY_ENROLLED')
    }

    const enrolledCount = (await context.database
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM course_enrollments
          WHERE course_id = ? AND status = 'enrolled'
        `,
      )
      .get(params.courseId)) as { count: number }

    if (enrolledCount.count >= course.capacity) {
      throw new AppError('course_full', 409, 'COURSE_FULL')
    }

    const now = new Date().toISOString()
    const enrollmentId = nanoid()

    await context.database
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

  app.get('/options', async (request) => {
    await requireRole(request, ['officer'])

    const semesterRows = (await context.database
      .prepare(
        `SELECT DISTINCT semester FROM courses
         WHERE semester IS NOT NULL AND semester != ''
         ORDER BY semester DESC`,
      )
      .all()) as Array<{ semester: string }>

    const locationRows = (await context.database
      .prepare(
        `SELECT DISTINCT location FROM courses
         WHERE location IS NOT NULL AND location != ''
         ORDER BY location`,
      )
      .all()) as Array<{ location: string }>

    return {
      success: true,
      message: 'ok',
      data: {
        semesters: semesterRows.map((row) => row.semester),
        locations: locationRows.map((row) => row.location),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.get('/:courseId', async (request) => {
    const actor = await requireRole(request, ['student', 'teacher', 'officer'])
    const params = request.params as { courseId: string }
    const studentId = actor.role === 'student' ? actor.sub : undefined
    const course = await getCourseById(context.database, params.courseId, studentId)

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    return {
      success: true,
      message: 'ok',
      data: {
        course: toCourse(course, { includeEnrolled: Boolean(studentId) }),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.get('/', async (request) => {
    const actor = await requireRole(request, ['student', 'teacher', 'officer'])

    const query = (request.query ?? {}) as {
      keyword?: string
      teacherId?: string
      semester?: string
      location?: string
      status?: string
      enrolledOnly?: string
    }
    const keyword = query.keyword?.trim()
    const filters: string[] = []
    const params: (string | number)[] = []
    const isStudent = actor.role === 'student'
    const enrolledOnly = isStudent && query.enrolledOnly === 'true'

    if (keyword) {
      filters.push('(courses.course_name LIKE ? OR courses.course_code LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    if (query.teacherId) {
      filters.push('courses.teacher_id = ?')
      params.push(query.teacherId)
    }

    if (query.semester) {
      filters.push('courses.semester = ?')
      params.push(query.semester)
    }

    if (query.location) {
      filters.push('courses.location LIKE ?')
      params.push(`%${query.location}%`)
    }

    if (query.status) {
      filters.push('courses.status = ?')
      params.push(query.status)
    }

    if (enrolledOnly) {
      filters.push('enrollments.id IS NOT NULL')
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''

    const sql = isStudent
      ? `
          SELECT
            courses.id,
            courses.course_code,
            courses.course_name,
            courses.description,
            courses.teacher_id,
            courses.semester,
            courses.location,
            courses.schedule_text,
            courses.capacity,
            courses.start_date,
            courses.end_date,
            courses.status,
            CASE WHEN enrollments.id IS NULL THEN 0 ELSE 1 END AS enrolled
          FROM courses
          LEFT JOIN course_enrollments AS enrollments
            ON enrollments.course_id = courses.id
            AND enrollments.student_id = ?
            AND enrollments.status = 'enrolled'
          ${whereClause}
          ORDER BY courses.created_at DESC
        `
      : `
          SELECT
            courses.id,
            courses.course_code,
            courses.course_name,
            courses.description,
            courses.teacher_id,
            courses.semester,
            courses.location,
            courses.schedule_text,
            courses.capacity,
            courses.start_date,
            courses.end_date,
            courses.status
          FROM courses
          ${whereClause}
          ORDER BY courses.created_at DESC
        `

    const queryParams = isStudent ? [actor.sub, ...params] : params

    const items = (await context.database
      .prepare(sql)
      .all(...queryParams)) as CourseRow[]

    return {
      success: true,
      message: 'ok',
      data: {
        items: items.map((row) => toCourse(row, { includeEnrolled: isStudent })),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/', async (request, reply) => {
    const actor = await requireRole(request, ['officer'])
    const payload = courseCreateSchema.parse(request.body)

    const teacher = (await context.database
      .prepare('SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1')
      .get(payload.teacherId, 'teacher')) as { id: string } | undefined

    if (!teacher) {
      throw new AppError('teacher_not_found', 404, 'TEACHER_NOT_FOUND')
    }

    const courseExists = (await context.database
      .prepare('SELECT id FROM courses WHERE course_code = ? LIMIT 1')
      .get(payload.courseCode)) as { id: string } | undefined

    if (courseExists) {
      throw new AppError('course_code_exists', 409, 'COURSE_CODE_EXISTS')
    }

    const now = new Date().toISOString()
    const courseId = nanoid()

    await context.database
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
    const currentCourse = await getCourseById(context.database, params.courseId)

    if (!currentCourse) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    if (payload.teacherId) {
      const teacher = (await context.database
        .prepare('SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1')
        .get(payload.teacherId, 'teacher')) as { id: string } | undefined

      if (!teacher) {
        throw new AppError('teacher_not_found', 404, 'TEACHER_NOT_FOUND')
      }
    }

    // suspended is the only manual lever; everything else is recomputed from
    // dates on read. Default the stored status to 'not_started' for active
    // courses so it stays inside the CHECK constraint while leaving the real
    // status to deriveCourseStatus().
    const isSuspended =
      payload.suspended === undefined
        ? currentCourse.status === 'suspended'
        : payload.suspended
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
      status: isSuspended ? 'suspended' : 'not_started',
    }
    const now = new Date().toISOString()

    await context.database
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

    const updatedCourse = await getCourseById(context.database, params.courseId)

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
    const course = await getCourseById(context.database, params.courseId)

    if (!course) {
      throw new AppError('course_not_found', 404, 'COURSE_NOT_FOUND')
    }

    await context.database.prepare('DELETE FROM courses WHERE id = ?').run(params.courseId)

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
