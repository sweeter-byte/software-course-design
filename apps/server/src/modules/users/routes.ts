import type { DatabaseSync } from 'node:sqlite'
import type { FastifyInstance } from 'fastify'

import {
  profileUpdateSchema,
  userListQuerySchema,
  userStatusUpdateSchema,
} from '../../../../../packages/shared/src/index'

import { requireAuth, requireRole } from '../../lib/guards'
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

  app.get('/', async (request) => {
    await requireRole(request, ['officer'])
    const query = userListQuerySchema.parse(request.query ?? {})

    const rows = (
      query.role
        ? context.database
            .prepare(
              `
                SELECT
                  id, role, status, phone, username, real_name, email, gender,
                  student_no, teacher_no, college, major, class_name,
                  created_at, updated_at
                FROM users
                WHERE role = ?
                ORDER BY created_at ASC
              `,
            )
            .all(query.role)
        : context.database
            .prepare(
              `
                SELECT
                  id, role, status, phone, username, real_name, email, gender,
                  student_no, teacher_no, college, major, class_name,
                  created_at, updated_at
                FROM users
                ORDER BY created_at ASC
              `,
            )
            .all()
    ) as UserRow[]

    return {
      success: true,
      message: 'ok',
      data: {
        users: rows.map(toUserProfile),
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.patch('/:userId/status', async (request) => {
    const actor = await requireRole(request, ['officer'])
    const params = request.params as { userId: string }
    const payload = userStatusUpdateSchema.parse(request.body)

    if (params.userId === actor.sub) {
      throw new AppError('cannot_modify_self', 400, 'CANNOT_MODIFY_SELF')
    }

    const target = context.database
      .prepare('SELECT id, status FROM users WHERE id = ? LIMIT 1')
      .get(params.userId) as { id: string; status: 'active' | 'cancelled' | 'disabled' } | undefined

    if (!target) {
      throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
    }

    if (target.status === 'cancelled') {
      throw new AppError('account_cancelled', 409, 'ACCOUNT_CANCELLED')
    }

    const nextStatus: 'active' | 'disabled' = payload.disabled ? 'disabled' : 'active'

    if (target.status === nextStatus) {
      const unchanged = getCurrentUser(context.database, target.id)
      if (!unchanged) {
        throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
      }
      return {
        success: true,
        message: 'user_status_unchanged',
        data: {
          user: toUserProfile(unchanged),
        },
        meta: {
          requestId: request.id,
        },
      }
    }

    const now = new Date().toISOString()

    context.database
      .prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
      .run(nextStatus, now, target.id)

    if (nextStatus === 'disabled') {
      context.database.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(target.id)
    }

    const updated = getCurrentUser(context.database, target.id)

    if (!updated) {
      throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
    }

    return {
      success: true,
      message: payload.disabled ? 'user_disabled' : 'user_enabled',
      data: {
        user: toUserProfile(updated),
      },
      meta: {
        requestId: request.id,
      },
    }
  })
}
