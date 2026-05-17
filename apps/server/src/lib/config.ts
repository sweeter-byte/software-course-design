import path from 'node:path'

import { DB_DIR, DEFAULT_SERVER_PORT, LOG_DIR } from '../../../../packages/config/src/index'

export type AppEnv = 'development' | 'test' | 'production'

export interface BuildAppOptions {
  databasePath?: string
  env?: AppEnv
  seedDemoData?: boolean
}

export interface AppConfig {
  env: AppEnv
  serverPort: number
  databasePath: string
  logsDir: string
  allowVerificationPreview: boolean
  jwtSecret: string
}

export function resolveAppConfig(options: BuildAppOptions = {}): AppConfig {
  const rootDir = process.cwd()
  const env = options.env ?? 'development'

  return {
    env,
    serverPort: DEFAULT_SERVER_PORT,
    databasePath: options.databasePath ?? path.join(rootDir, DB_DIR, 'course-manage-system.db'),
    logsDir: path.join(rootDir, LOG_DIR),
    allowVerificationPreview: env !== 'production',
    jwtSecret: 'course-manage-system-dev-secret',
  }
}
