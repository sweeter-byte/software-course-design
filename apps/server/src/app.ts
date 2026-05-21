import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import Fastify from 'fastify'
import { randomUUID } from 'node:crypto'

import { APP_NAME } from '../../../packages/config/src/index'
import { resolveAppConfig, type BuildAppOptions } from './lib/config'
import { createDatabase } from './lib/db/client'
import { seedDemoData } from './lib/db/seed'
import { errorResponse, successResponse, toAppError } from './lib/http'
import { createLogWriter } from './lib/logging'
import { registerAuthRoutes } from './modules/auth/routes'
import { registerAssignmentRoutes } from './modules/assignments/routes'
import { registerCourseFeedbackRoutes } from './modules/course-feedbacks/routes'
import { registerCourseRoutes } from './modules/courses/routes'
import { registerDashboardRoutes } from './modules/dashboard/routes'
import { registerFeedbackRoutes } from './modules/feedback/routes'
import { registerResponseRoutes } from './modules/responses/routes'
import { registerSubmissionRoutes } from './modules/submissions/routes'
import { registerUserRoutes } from './modules/users/routes'

const START_TIME = Symbol('request-start-time')

export async function buildApp(options: BuildAppOptions = {}) {
  const config = resolveAppConfig(options)
  const database = await createDatabase(config.databaseConfig, { reset: options.resetDatabase })
  const logger = createLogWriter(config.logsDir)

  if (options.seedDemoData) {
    await seedDemoData(database)
  }

  const app = Fastify({
    logger: false,
    genReqId: () => randomUUID(),
  })

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(jwt, {
    secret: config.jwtSecret,
  })

  app.addHook('onRequest', async (request) => {
    ;(request as unknown as Record<symbol, number>)[START_TIME] = Date.now()
  })

  app.addHook('onResponse', async (request, reply) => {
    const startedAt = (request as unknown as Record<symbol, number>)[START_TIME] ?? Date.now()

    logger.info('http_request', {
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs: Date.now() - startedAt,
    })
  })

  app.addHook('onClose', async () => {
    await database.close()
  })

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(errorResponse(request, 'not_found', 'NOT_FOUND'))
  })

  app.setErrorHandler((error, request, reply) => {
    const normalized = toAppError(error)

    if (normalized.statusCode >= 500) {
      logger.error('request_failed', {
        requestId: request.id,
        method: request.method,
        url: request.url,
        message: error instanceof Error ? error.message : 'unknown_error',
      })
    }

    reply
      .status(normalized.statusCode)
      .send(errorResponse(request, normalized.message, normalized.code, normalized.details))
  })

  app.get('/', async (_request, reply) => {
    reply
      .type('text/html; charset=utf-8')
      .send(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${APP_NAME} API</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "PingFang SC", "Noto Sans SC", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #f7f1e3 0%, #efe4c9 100%);
        color: #1f2937;
      }
      main {
        width: min(720px, calc(100vw - 32px));
        padding: 32px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.16);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 32px;
      }
      p {
        margin: 0 0 12px;
        line-height: 1.7;
      }
      code {
        padding: 2px 8px;
        border-radius: 999px;
        background: #f3f4f6;
      }
      ul {
        margin: 20px 0 0;
        padding-left: 20px;
      }
      a {
        color: #0f766e;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${APP_NAME}</h1>
      <p>这是后端 API 服务，不是前端页面。</p>
      <p>如果你是想打开系统界面，请访问启动脚本终端里打印出来的 <code>Web</code> 地址，通常是 <code>http://localhost:5173</code>。</p>
      <p>如果你是在检查后端状态，可以使用下面这些入口：</p>
      <ul>
        <li><a href="/health">/health</a></li>
        <li><code>/api/v1/*</code> 业务接口</li>
      </ul>
    </main>
  </body>
</html>`)
  })

  app.get('/health', async (request) =>
    successResponse(
      request,
      {
        status: 'healthy',
        service: APP_NAME,
      },
      'ok',
    ),
  )

  await app.register(async (api) => {
    registerAuthRoutes(api, {
      config,
      database,
      logger,
    })
  }, {
    prefix: '/api/v1/auth',
  })

  await app.register(async (api) => {
    registerCourseRoutes(api, {
      database,
      logger,
    })
  }, {
    prefix: '/api/v1/courses',
  })

  await app.register(async (api) => {
    registerUserRoutes(api, {
      database,
    })
  }, {
    prefix: '/api/v1/users',
  })

  await app.register(async (api) => {
    registerAssignmentRoutes(api, {
      database,
      logger,
    })
  }, {
    prefix: '/api/v1',
  })

  await app.register(async (api) => {
    registerSubmissionRoutes(api, {
      database,
      logger,
    })
  }, {
    prefix: '/api/v1',
  })

  await app.register(async (api) => {
    registerFeedbackRoutes(api, {
      database,
      logger,
    })
  }, {
    prefix: '/api/v1',
  })

  await app.register(async (api) => {
    registerResponseRoutes(api, {
      database,
      logger,
    })
  }, {
    prefix: '/api/v1',
  })

  await app.register(async (api) => {
    registerCourseFeedbackRoutes(api, {
      database,
      logger,
    })
  }, {
    prefix: '/api/v1',
  })

  await app.register(async (api) => {
    registerDashboardRoutes(api, {
      database,
    })
  }, {
    prefix: '/api/v1/dashboard',
  })

  return app
}
