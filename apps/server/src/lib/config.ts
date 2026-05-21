import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { DEFAULT_SERVER_PORT, LOG_DIR } from '../../../../packages/config/src/index'

import type { MySqlConnectionConfig } from './db/client'

export type AppEnv = 'development' | 'test' | 'production'

export interface BuildAppOptions {
  env?: AppEnv
  seedDemoData?: boolean
  resetDatabase?: boolean
  databaseConfig?: Partial<MySqlConnectionConfig>
  verificationProvider?: 'local' | 'cloudbase'
  cloudBaseApiBaseUrl?: string
  cloudBaseApiToken?: string
}

export interface AppConfig {
  env: AppEnv
  serverPort: number
  databaseConfig: MySqlConnectionConfig
  logsDir: string
  allowVerificationPreview: boolean
  jwtSecret: string
  verificationProvider: 'local' | 'cloudbase'
  cloudBaseApiBaseUrl?: string
  cloudBaseApiToken?: string
}

let envFileLoaded = false

function loadProjectEnvFile() {
  if (envFileLoaded) return
  envFileLoaded = true

  let dir = process.cwd()
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, '.env.local')
    if (existsSync(candidate)) {
      const contents = readFileSync(candidate, 'utf8')
      for (const rawLine of contents.split('\n')) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq === -1) continue
        const key = line.slice(0, eq).trim()
        if (!key || key in process.env) continue
        let value = line.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
      return
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
}

function resolveDatabaseConfig(
  env: AppEnv,
  override?: Partial<MySqlConnectionConfig>,
): MySqlConnectionConfig {
  const host = override?.host ?? process.env.MYSQL_HOST ?? '127.0.0.1'
  const port = override?.port ?? Number(process.env.MYSQL_PORT ?? 3306)
  const user = override?.user ?? process.env.MYSQL_USER ?? 'course_app'
  const password = override?.password ?? process.env.MYSQL_PASSWORD ?? ''

  const defaultDatabase =
    env === 'test'
      ? process.env.MYSQL_TEST_DATABASE ?? 'course_manage_system_test'
      : process.env.MYSQL_DATABASE ?? 'course_manage_system'
  const database = override?.database ?? defaultDatabase

  return { host, port, user, password, database }
}

export function resolveAppConfig(options: BuildAppOptions = {}): AppConfig {
  loadProjectEnvFile()

  const env = options.env ?? 'development'
  const envVerificationProvider = process.env.VERIFICATION_PROVIDER === 'cloudbase' ? 'cloudbase' : 'local'

  return {
    env,
    serverPort: DEFAULT_SERVER_PORT,
    databaseConfig: resolveDatabaseConfig(env, options.databaseConfig),
    logsDir: path.join(process.cwd(), LOG_DIR),
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
