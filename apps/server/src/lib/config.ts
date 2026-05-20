import path from 'node:path'

import { DB_DIR, DEFAULT_SERVER_PORT, LOG_DIR } from '../../../../packages/config/src/index'

export type AppEnv = 'development' | 'test' | 'production'

export interface BuildAppOptions {
  databasePath?: string
  env?: AppEnv
  seedDemoData?: boolean
  verificationProvider?: 'local' | 'cloudbase'
  cloudBaseApiBaseUrl?: string
  cloudBaseApiToken?: string
}

export interface AppConfig {
  env: AppEnv
  serverPort: number
  databasePath: string
  logsDir: string
  allowVerificationPreview: boolean
  jwtSecret: string
  verificationProvider: 'local' | 'cloudbase'
  cloudBaseApiBaseUrl?: string
  cloudBaseApiToken?: string
}

export function resolveAppConfig(options: BuildAppOptions = {}): AppConfig {
  const rootDir = process.cwd()
  const env = options.env ?? 'development'
  const envVerificationProvider = process.env.VERIFICATION_PROVIDER === 'cloudbase' ? 'cloudbase' : 'local'

  return {
    env,
    serverPort: DEFAULT_SERVER_PORT,
    databasePath: options.databasePath ?? path.join(rootDir, DB_DIR, 'course-manage-system.db'),
    logsDir: path.join(rootDir, LOG_DIR),
    allowVerificationPreview: env !== 'production',
    jwtSecret: 'course-manage-system-dev-secret',
    verificationProvider: options.verificationProvider ?? envVerificationProvider,
    cloudBaseApiBaseUrl: options.cloudBaseApiBaseUrl ?? process.env.CLOUDBASE_API_BASE_URL,
    cloudBaseApiToken:
      options.cloudBaseApiToken ??
      process.env.CLOUDBASE_API_TOKEN ??
      process.env.CLOUDBASE_API_KEY ??
      process.env.CLOUDBASE_PUBLISHABLE_KEY,
  }
}
