import type { FastifyInstance, FastifyReply } from 'fastify'
import { nanoid } from 'nanoid'

import {
  loginSchema,
  passwordChangeSchema,
  passwordForgotSchema,
  phoneChangeSchema,
  studentRegisterSchema,
  verificationCodeRequestSchema,
} from '../../../../../packages/shared/src/index'

import type { AppConfig } from '../../lib/config'
import type { Database } from '../../lib/db/client'
import { requireAuth } from '../../lib/guards'
import type { LogWriter } from '../../lib/logging'
import { AppError, sendCreated } from '../../lib/http'
import { hashPassword, verifyPassword } from '../../lib/security'

interface AuthRouteContext {
  config: AppConfig
  database: Database
  logger: LogWriter
}

type VerificationPurpose = 'register' | 'reset_password' | 'change_phone'

interface VerificationRecord {
  id: string
  code: string
  expires_at: string
  used_at: string | null
}

interface UserIdentityRecord {
  id: string
  role: 'student' | 'teacher' | 'officer'
  status: 'active' | 'cancelled' | 'disabled'
}

function createVerificationCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`
}

function getCloudBaseApiBaseUrl(config: AppConfig) {
  const baseUrl = config.cloudBaseApiBaseUrl?.replace(/\/$/, '')

  if (!baseUrl) {
    throw new AppError('cloudbase_config_missing', 500, 'CLOUDBASE_CONFIG_MISSING')
  }

  return baseUrl
}

function getCloudBaseApiToken(config: AppConfig) {
  if (!config.cloudBaseApiToken) {
    throw new AppError('cloudbase_config_missing', 500, 'CLOUDBASE_CONFIG_MISSING')
  }

  return config.cloudBaseApiToken
}

function formatCloudBasePhone(phone: string) {
  const trimmed = phone.trim()

  if (trimmed.startsWith('+')) {
    return trimmed
  }

  return `+86 ${trimmed}`
}

function getCloudBaseErrorStatus(error: string, status: number) {
  if (error === 'rate_limit_exceeded') return 429
  if (status >= 400 && status < 500) return 400
  return 502
}

function getCloudBaseErrorCode(error: string, isVerificationCheck = false) {
  if (error === 'invalid_verification_code' || (isVerificationCheck && error === 'invalid_argument')) {
    return 'VERIFICATION_CODE_INVALID'
  }
  if (error === 'verification_code_expired') return 'VERIFICATION_CODE_EXPIRED'
  if (error === 'rate_limit_exceeded') return 'VERIFICATION_RATE_LIMITED'
  if (error === 'captcha_required') return 'VERIFICATION_CAPTCHA_REQUIRED'

  return 'CLOUDBASE_VERIFICATION_FAILED'
}

async function readCloudBaseJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>
}

async function requestCloudBaseVerification(config: AppConfig, path: string, body: Record<string, unknown>) {
  try {
    return await fetch(`${getCloudBaseApiBaseUrl(config)}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getCloudBaseApiToken(config)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AppError(
      'cloudbase_verification_unavailable',
      502,
      'CLOUDBASE_VERIFICATION_UNAVAILABLE',
    )
  }
}

function throwCloudBaseError(status: number, payload: Record<string, unknown>, isVerificationCheck = false) {
  const error = typeof payload.error === 'string' ? payload.error : 'cloudbase_verification_failed'
  const description = typeof payload.error_description === 'string' ? payload.error_description : undefined
  const isInvalidVerificationCode =
    error === 'invalid_verification_code' || (isVerificationCheck && error === 'invalid_argument')

  throw new AppError(
    isInvalidVerificationCode ? 'verification_code_invalid' : error,
    getCloudBaseErrorStatus(error, status),
    getCloudBaseErrorCode(error, isVerificationCheck),
    description ? [{ path: ['verificationCode'], message: description }] : undefined,
  )
}

async function sendCloudBaseVerificationCode(config: AppConfig, phone: string) {
  const response = await requestCloudBaseVerification(config, '/auth/v1/verification', {
    phone_number: formatCloudBasePhone(phone),
    target: 'ANY',
  })

  const payload = await readCloudBaseJson(response)

  if (!response.ok) {
    throwCloudBaseError(response.status, payload)
  }

  if (typeof payload.verification_id !== 'string') {
    throw new AppError('cloudbase_response_invalid', 502, 'CLOUDBASE_RESPONSE_INVALID')
  }

  return {
    verificationId: payload.verification_id,
    expiresIn: typeof payload.expires_in === 'number' ? payload.expires_in : 600,
  }
}

async function verifyCloudBaseVerificationCode(
  config: AppConfig,
  verificationId: string,
  verificationCode: string,
) {
  const response = await requestCloudBaseVerification(config, '/auth/v1/verification/verify', {
    verification_id: verificationId,
    verification_code: verificationCode,
  })

  const payload = await readCloudBaseJson(response)

  if (!response.ok) {
    throwCloudBaseError(response.status, payload, true)
  }

  if (typeof payload.verification_token !== 'string') {
    throw new AppError('cloudbase_response_invalid', 502, 'CLOUDBASE_RESPONSE_INVALID')
  }
}

async function getLatestVerificationCode(
  database: Database,
  phone: string,
  purpose: VerificationPurpose,
) {
  return (await database
    .prepare(
      `
        SELECT id, code, expires_at, used_at
        FROM verification_codes
        WHERE phone = ? AND purpose = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
    )
    .get(phone, purpose)) as VerificationRecord | undefined
}

async function assertVerificationCode(
  context: AuthRouteContext,
  verification: VerificationRecord | undefined,
  verificationCode: string,
): Promise<VerificationRecord> {
  if (!verification) {
    throw new AppError('verification_code_not_found', 400, 'VERIFICATION_CODE_NOT_FOUND')
  }

  if (verification.used_at) {
    throw new AppError('verification_code_used', 400, 'VERIFICATION_CODE_USED')
  }

  if (new Date(verification.expires_at).getTime() < Date.now()) {
    throw new AppError('verification_code_expired', 400, 'VERIFICATION_CODE_EXPIRED')
  }

  if (context.config.verificationProvider === 'cloudbase') {
    await verifyCloudBaseVerificationCode(context.config, verification.code, verificationCode)
    return verification
  }

  if (verification.code !== verificationCode) {
    throw new AppError('verification_code_invalid', 400, 'VERIFICATION_CODE_INVALID')
  }

  return verification
}

async function createSessionTokens(reply: FastifyReply, context: AuthRouteContext, user: {
  id: string
  role: string
  phone: string
}) {
  const accessToken = await reply.jwtSign({
    sub: user.id,
    role: user.role,
    phone: user.phone,
  })
  const refreshToken = nanoid(32)
  const refreshTokenHash = await hashPassword(refreshToken)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await context.database
    .prepare(
      `
        INSERT INTO auth_sessions (
          id, user_id, refresh_token_hash, expires_at, last_seen_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .run(nanoid(), user.id, refreshTokenHash, expiresAt.toISOString(), now.toISOString(), now.toISOString())

  return {
    accessToken,
    refreshToken,
  }
}

export function registerAuthRoutes(app: FastifyInstance, context: AuthRouteContext) {
  app.post('/verification-code', async (request, reply) => {
    const payload = verificationCodeRequestSchema.parse(request.body)
    const now = new Date()
    const issued =
      context.config.verificationProvider === 'cloudbase'
        ? await sendCloudBaseVerificationCode(context.config, payload.phone)
        : {
            verificationId: createVerificationCode(),
            expiresIn: 5 * 60,
          }
    const expiresAt = new Date(now.getTime() + issued.expiresIn * 1000)

    await context.database
      .prepare(
        `
          INSERT INTO verification_codes (id, phone, purpose, code, expires_at, used_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        nanoid(),
        payload.phone,
        payload.purpose,
        issued.verificationId,
        expiresAt.toISOString(),
        null,
        now.toISOString(),
      )

    context.logger.info('verification_code_issued', {
      requestId: request.id,
      phone: payload.phone,
      purpose: payload.purpose,
    })

    return sendCreated(
      reply,
      request,
      {
        phone: payload.phone,
        purpose: payload.purpose,
        expiresIn: issued.expiresIn,
        previewCode:
          context.config.verificationProvider === 'local' && context.config.allowVerificationPreview
            ? issued.verificationId
            : undefined,
      },
      'verification_code_sent',
    )
  })

  app.post('/register/student', async (request, reply) => {
    const payload = studentRegisterSchema.parse(request.body)
    const verification = await assertVerificationCode(
      context,
      await getLatestVerificationCode(context.database, payload.phone, 'register'),
      payload.verificationCode,
    )

    const phoneOwner = (await context.database
      .prepare('SELECT id, role, status FROM users WHERE phone = ? LIMIT 1')
      .get(payload.phone)) as UserIdentityRecord | undefined

    if (phoneOwner && (phoneOwner.role !== 'student' || phoneOwner.status !== 'cancelled')) {
      throw new AppError('phone_already_registered', 409, 'PHONE_ALREADY_REGISTERED')
    }

    const studentIdOwner = (await context.database
      .prepare('SELECT id, role, status FROM users WHERE student_no = ? LIMIT 1')
      .get(payload.studentId)) as UserIdentityRecord | undefined

    if (studentIdOwner && (studentIdOwner.role !== 'student' || studentIdOwner.status !== 'cancelled')) {
      throw new AppError('student_id_already_registered', 409, 'STUDENT_ID_ALREADY_REGISTERED')
    }

    if (phoneOwner && studentIdOwner && phoneOwner.id !== studentIdOwner.id) {
      throw new AppError('student_id_already_registered', 409, 'STUDENT_ID_ALREADY_REGISTERED')
    }

    const now = new Date().toISOString()
    const reusableCancelledStudentId = phoneOwner?.id ?? studentIdOwner?.id
    const userId = reusableCancelledStudentId ?? nanoid()
    const passwordHash = await hashPassword(payload.password)
    const profileFields = {
      email: payload.email ?? null,
      gender: payload.gender ?? null,
      college: payload.college ?? null,
      major: payload.major ?? null,
      className: payload.className ?? null,
    }

    if (reusableCancelledStudentId) {
      await context.database
        .prepare(
          `
            UPDATE users
            SET
              status = ?,
              phone = ?,
              password_hash = ?,
              username = ?,
              real_name = ?,
              email = ?,
              gender = ?,
              student_no = ?,
              teacher_no = ?,
              college = ?,
              major = ?,
              class_name = ?,
              updated_at = ?
            WHERE id = ? AND role = ? AND status = ?
          `,
        )
        .run(
          'active',
          payload.phone,
          passwordHash,
          payload.username,
          payload.realName,
          profileFields.email,
          profileFields.gender,
          payload.studentId,
          null,
          profileFields.college,
          profileFields.major,
          profileFields.className,
          now,
          reusableCancelledStudentId,
          'student',
          'cancelled',
        )
    } else {
      await context.database
        .prepare(
          `
            INSERT INTO users (
              id, role, status, phone, password_hash, username, real_name, email, gender,
              student_no, teacher_no, college, major, class_name, created_at, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
          `,
        )
        .run(
          userId,
          'student',
          'active',
          payload.phone,
          passwordHash,
          payload.username,
          payload.realName,
          profileFields.email,
          profileFields.gender,
          payload.studentId,
          null,
          profileFields.college,
          profileFields.major,
          profileFields.className,
          now,
          now,
        )
    }

    await context.database
      .prepare('UPDATE verification_codes SET used_at = ? WHERE id = ?')
      .run(now, verification.id)

    context.logger.info('student_registered', {
      requestId: request.id,
      userId,
      phone: payload.phone,
      studentNo: payload.studentId,
    })

    return sendCreated(
      reply,
      request,
      {
        user: {
          id: userId,
          role: 'student',
          phone: payload.phone,
          username: payload.username,
          realName: payload.realName,
          studentNo: payload.studentId,
        },
      },
      'student_registered',
    )
  })

  app.post('/login', async (request, reply) => {
    const payload = loginSchema.parse(request.body)
    const user = (await context.database
      .prepare(
        `
          SELECT
            id, role, status, phone, username, real_name, password_hash, student_no
          FROM users
          WHERE phone = ?
          LIMIT 1
        `,
      )
      .get(payload.phone)) as
      | {
          id: string
          role: 'student' | 'teacher' | 'officer'
          status: 'active' | 'cancelled' | 'disabled'
          phone: string
          username: string
          real_name: string
          password_hash: string
          student_no: string | null
        }
      | undefined

    if (!user || user.status === 'cancelled') {
      throw new AppError('invalid_credentials', 401, 'INVALID_CREDENTIALS')
    }

    const passwordValid = await verifyPassword(payload.password, user.password_hash)

    if (!passwordValid) {
      throw new AppError('invalid_credentials', 401, 'INVALID_CREDENTIALS')
    }

    if (user.status === 'disabled') {
      throw new AppError('account_disabled', 403, 'ACCOUNT_DISABLED')
    }

    const tokens = await createSessionTokens(reply, context, user)

    context.logger.info('user_logged_in', {
      requestId: request.id,
      userId: user.id,
      role: user.role,
    })

    return reply.send({
      success: true,
      message: 'login_success',
      data: {
        ...tokens,
        user: {
          id: user.id,
          role: user.role,
          phone: user.phone,
          username: user.username,
          realName: user.real_name,
          studentNo: user.student_no,
        },
      },
      meta: {
        requestId: request.id,
      },
    })
  })

  app.post('/logout', async (request) => {
    const actor = await requireAuth(request)

    await context.database.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(actor.sub)

    context.logger.info('user_logged_out', {
      requestId: request.id,
      userId: actor.sub,
      role: actor.role,
    })

    return {
      success: true,
      message: 'logout_success',
      data: {},
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/password/forgot', async (request) => {
    const payload = passwordForgotSchema.parse(request.body)
    const verification = await assertVerificationCode(
      context,
      await getLatestVerificationCode(context.database, payload.phone, 'reset_password'),
      payload.verificationCode,
    )

    const user = (await context.database
      .prepare('SELECT id, status FROM users WHERE phone = ? LIMIT 1')
      .get(payload.phone)) as { id: string; status: string } | undefined

    if (!user || user.status !== 'active') {
      throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
    }

    const now = new Date().toISOString()
    const passwordHash = await hashPassword(payload.newPassword)

    await context.database
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(passwordHash, now, user.id)
    await context.database
      .prepare('UPDATE verification_codes SET used_at = ? WHERE id = ?')
      .run(now, verification.id)
    await context.database.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(user.id)

    context.logger.info('password_reset', {
      requestId: request.id,
      userId: user.id,
      phone: payload.phone,
    })

    return {
      success: true,
      message: 'password_reset',
      data: {},
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/password/change', async (request) => {
    const actor = await requireAuth(request)
    const payload = passwordChangeSchema.parse(request.body)

    const user = (await context.database
      .prepare('SELECT id, password_hash FROM users WHERE id = ? AND status = ? LIMIT 1')
      .get(actor.sub, 'active')) as { id: string; password_hash: string } | undefined

    if (!user) {
      throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
    }

    const oldPasswordValid = await verifyPassword(payload.oldPassword, user.password_hash)

    if (!oldPasswordValid) {
      throw new AppError('old_password_invalid', 400, 'OLD_PASSWORD_INVALID')
    }

    const now = new Date().toISOString()
    const passwordHash = await hashPassword(payload.newPassword)

    await context.database
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(passwordHash, now, user.id)
    await context.database.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(user.id)

    context.logger.info('password_changed', {
      requestId: request.id,
      userId: user.id,
    })

    return {
      success: true,
      message: 'password_changed',
      data: {},
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/phone/change', async (request) => {
    const actor = await requireAuth(request)
    const payload = phoneChangeSchema.parse(request.body)

    const user = (await context.database
      .prepare('SELECT id, phone, status FROM users WHERE id = ? LIMIT 1')
      .get(actor.sub)) as { id: string; phone: string; status: string } | undefined

    if (!user || user.status !== 'active') {
      throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
    }

    if (user.phone !== payload.oldPhone) {
      throw new AppError('old_phone_invalid', 400, 'OLD_PHONE_INVALID')
    }

    const newPhoneOwner = (await context.database
      .prepare('SELECT id FROM users WHERE phone = ? LIMIT 1')
      .get(payload.newPhone)) as { id: string } | undefined

    if (newPhoneOwner) {
      throw new AppError('phone_already_registered', 409, 'PHONE_ALREADY_REGISTERED')
    }

    const oldVerification = await assertVerificationCode(
      context,
      await getLatestVerificationCode(context.database, payload.oldPhone, 'change_phone'),
      payload.oldVerificationCode,
    )
    const newVerification = await assertVerificationCode(
      context,
      await getLatestVerificationCode(context.database, payload.newPhone, 'change_phone'),
      payload.newVerificationCode,
    )

    const now = new Date().toISOString()

    await context.database
      .prepare('UPDATE users SET phone = ?, updated_at = ? WHERE id = ?')
      .run(payload.newPhone, now, user.id)
    await context.database
      .prepare('UPDATE verification_codes SET used_at = ? WHERE id IN (?, ?)')
      .run(now, oldVerification.id, newVerification.id)
    await context.database.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(user.id)

    context.logger.info('phone_changed', {
      requestId: request.id,
      userId: user.id,
      oldPhone: payload.oldPhone,
      newPhone: payload.newPhone,
    })

    return {
      success: true,
      message: 'phone_changed',
      data: {
        user: {
          id: user.id,
          phone: payload.newPhone,
        },
      },
      meta: {
        requestId: request.id,
      },
    }
  })

  app.post('/cancel-account', async (request) => {
    const actor = await requireAuth(request)
    const now = new Date().toISOString()

    const result = await context.database
      .prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ? AND status = ?')
      .run('cancelled', now, actor.sub, 'active')

    if (result.changes === 0) {
      throw new AppError('user_not_found', 404, 'USER_NOT_FOUND')
    }

    await context.database.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(actor.sub)

    context.logger.info('account_cancelled', {
      requestId: request.id,
      userId: actor.sub,
      role: actor.role,
    })

    return {
      success: true,
      message: 'account_cancelled',
      data: {
        user: {
          id: actor.sub,
          status: 'cancelled',
        },
      },
      meta: {
        requestId: request.id,
      },
    }
  })
}
