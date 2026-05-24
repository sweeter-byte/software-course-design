import { createDatabase, type Database } from './client'
import { resolveAppConfig } from '../config'
import { hashPassword } from '../security'

export async function seedDemoData(database: Database) {
  const countRow = (await database.prepare('SELECT COUNT(*) AS count FROM users').get()) as
    | { count: number }
    | undefined

  if (countRow && countRow.count > 0) {
    return
  }

  const now = new Date().toISOString()
  const teacherPassword = await hashPassword('Teacher123!')
  const officerPassword = await hashPassword('Officer123!')

  const insertUser = database.prepare(`
    INSERT INTO users (
      id, role, status, phone, password_hash, username, real_name, email, gender,
      student_no, teacher_no, college, major, class_name, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `)

  await insertUser.run(
    'teacher-demo-001',
    'teacher',
    'active',
    '13900139000',
    teacherPassword,
    'teach_echo',
    '陈海燕',
    'chenhaiyan@example.com',
    '女',
    null,
    'T-1001',
    '计算机科学与技术学院',
    '软件工程',
    null,
    now,
    now,
  )

  await insertUser.run(
    'officer-demo-001',
    'officer',
    'active',
    '13700137000',
    officerPassword,
    'office_orbit',
    '王静怡',
    'officer@example.com',
    '女',
    null,
    null,
    '教务处',
    '教学管理',
    null,
    now,
    now,
  )
}

export async function seedDatabase() {
  const config = resolveAppConfig()
  const database = await createDatabase(config.databaseConfig)
  try {
    await seedDemoData(database)
  } finally {
    await database.close()
  }
}
