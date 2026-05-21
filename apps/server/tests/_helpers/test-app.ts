import { afterEach } from 'vitest'
import type { FastifyInstance } from 'fastify'

import { buildApp as baseBuildApp } from '../../src/app'
import type { BuildAppOptions } from '../../src/lib/config'

const createdApps: FastifyInstance[] = []

afterEach(async () => {
  while (createdApps.length > 0) {
    const app = createdApps.shift()
    if (!app) break
    try {
      await app.close()
    } catch {
      // ignore close errors during test teardown
    }
  }
})

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = await baseBuildApp({
    ...options,
    env: options.env ?? 'test',
    resetDatabase: options.resetDatabase ?? true,
    verificationProvider: options.verificationProvider ?? 'local',
  })
  createdApps.push(app)
  return app
}
