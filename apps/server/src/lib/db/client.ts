import { createPool, type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'

import { applyMigrations } from './schema'

export type SqlParam = string | number | bigint | boolean | null | Date | Buffer

export interface RunResult {
  changes: number
  lastInsertRowid: number | bigint
}

export interface Statement {
  run(...params: SqlParam[]): Promise<RunResult>
  get<T = unknown>(...params: SqlParam[]): Promise<T | undefined>
  all<T = unknown>(...params: SqlParam[]): Promise<T[]>
}

export interface Database {
  prepare(sql: string): Statement
  exec(sql: string): Promise<void>
  close(): Promise<void>
}

export interface MySqlConnectionConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

class MySqlStatement implements Statement {
  constructor(
    private readonly pool: Pool,
    private readonly sql: string,
  ) {}

  async run(...params: SqlParam[]): Promise<RunResult> {
    const [result] = await this.pool.query<ResultSetHeader>(this.sql, params)
    return {
      changes: result.affectedRows,
      lastInsertRowid: result.insertId,
    }
  }

  async get<T = unknown>(...params: SqlParam[]): Promise<T | undefined> {
    const [rows] = await this.pool.query<RowDataPacket[]>(this.sql, params)
    return rows[0] as T | undefined
  }

  async all<T = unknown>(...params: SqlParam[]): Promise<T[]> {
    const [rows] = await this.pool.query<RowDataPacket[]>(this.sql, params)
    return rows as unknown as T[]
  }
}

class MySqlDatabase implements Database {
  constructor(private readonly pool: Pool) {}

  prepare(sql: string): Statement {
    return new MySqlStatement(this.pool, sql)
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql)
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

export async function createDatabase(
  config: MySqlConnectionConfig,
  options: { reset?: boolean } = {},
): Promise<Database> {
  const pool = createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
    multipleStatements: false,
  })

  const database = new MySqlDatabase(pool)
  await applyMigrations(database, options)
  return database
}
