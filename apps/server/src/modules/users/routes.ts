import type { DatabaseSync } from 'node:sqlite'
import type { FastifyInstance } from 'fastify'

import { profileUpdateSchema } from '../../../../../packages/shared/src/index'

import { requireAuth } from '../../lib/guards'
import { AppError } from '../../lib/http'

interface UserRouteContext {
  database: DatabaseSync
}

type UserRow = {
  id: string
  role: 'student' | 'teacher' | 'officer'
  status: 'active' | 'cancelled' | 'disabled'
  phone: string
  username: string
  real_name: string
  email: string | null
  gender: string | null
  student_no: string | null
  teacher_no: string | null
  college: string | null
  major: string | null
  class_name: string | null
  created_at: string
  updated_at: string
}

function toUserProfile(row: UserRow) {
  return {
    id: row.id,
    role: row.role,
    status: row.status,
    phone: row.phone,
    username: row.username,
    realName: row.real_name,
    email: row.email,
    gender: row.gender,
    studentNo: row.student_no,
    teacherNo: row.teacher_no,
    college: row.college,
    major: row.major,
    className: row.class_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getCurrentUser(database: DatabaseSync, userId: string) {
  return database
    .prepare(
      `
        SELECT
          id, role, status, phone, username, real_name, email, gender,
          student_no, teacher_no, college, major, class_name, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(userId) as UserRow | undefined
}

export function registerUserRoutes(app: FastifyInstance, context: UserRouteContext) {
  app.get('/me', async (request) => {
    const actor = await requireAuth(request)
    const user = getCurrentUser(context.database, actor.sub)

    if (!user || user.status !== 'active') {
      throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
    }

    return {
      success: true,
      message: 'ok',
      data: {
        user: toUserProfile(user),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.patch('/me', async (request) => {
    const actor = await requireAuth(request)
    const payload = profileUpdateSchema.parse(request.body)
    const currentUser = getCurrentUser(context.database, actor.sub)

    if (!currentUser || currentUser.status !== 'active') {
      throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
    }

    const now = new Date().toISOString()
    const nextUser = {
      username: payload.username ?? currentUser.username,
      realName: payload.realName ?? currentUser.real_name,
      email: payload.email === undefined ? currentUser.email : payload.email,
      gender: payload.gender === undefined ? currentUser.gender : payload.gender,
      college: payload.college === undefined ? currentUser.college : payload.college,
      major: payload.major === undefined ? currentUser.major : payload.major,
      className: payload.className === undefined ? currentUser.class_name : payload.className,
    }

    context.database
      .prepare(
        `
          UPDATE users
          SET username = ?, real_name = ?, email = ?, gender = ?, college = ?,
              major = ?, class_name = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .run(
        nextUser.username,
        nextUser.realName,
        nextUser.email,
        nextUser.gender,
        nextUser.college,
        nextUser.major,
        nextUser.className,
        now,
        actor.sub,
      )

    const updatedUser = getCurrentUser(context.database, actor.sub)

    if (!updatedUser) {
      throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
    }

    return {
      success: true,
      message: 'profile_updated',
      data: {
        user: toUserProfile(updatedUser),
      },
      meta: {
        requestId: request.id,
      },
    }
  })
}
