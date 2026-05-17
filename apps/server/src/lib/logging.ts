import { appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

type LogLevel = 'info' | 'error'

export interface LogWriter {
  info(event: string, payload?: Record<string, unknown>): void
  error(event: string, payload?: Record<string, unknown>): void
}

function writeLog(logsDir: string, level: LogLevel, event: string, payload?: Record<string, unknown>) {
  mkdirSync(logsDir, { recursive: true })

  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...payload,
  })

  appendFileSync(path.join(logsDir, 'server-combined.log'), `${entry}\n`, 'utf8')

  if (level === 'error') {
    appendFileSync(path.join(logsDir, 'server-error.log'), `${entry}\n`, 'utf8')
  }
}

export function createLogWriter(logsDir: string): LogWriter {
  return {
    info(event, payload) {
      writeLog(logsDir, 'info', event, payload)
    },
    error(event, payload) {
      writeLog(logsDir, 'error', event, payload)
    },
  }
}
