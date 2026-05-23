import type { Database } from './client'

export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    role VARCHAR(16) NOT NULL CHECK (role IN ('student', 'teacher', 'officer')),
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'disabled')),
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(128) NOT NULL,
    real_name VARCHAR(128) NOT NULL,
    email VARCHAR(255),
    gender VARCHAR(16),
    id_number VARCHAR(32),
    student_no VARCHAR(64) UNIQUE,
    teacher_no VARCHAR(64) UNIQUE,
    college VARCHAR(128),
    major VARCHAR(128),
    class_name VARCHAR(128),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS verification_codes (
    id VARCHAR(36) PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('register', 'reset_password', 'change_phone')),
    code TEXT NOT NULL,
    expires_at VARCHAR(40) NOT NULL,
    used_at VARCHAR(40),
    created_at VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at VARCHAR(40) NOT NULL,
    last_seen_at VARCHAR(40) NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(36) PRIMARY KEY,
    course_code VARCHAR(64) NOT NULL UNIQUE,
    course_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    semester VARCHAR(64) NOT NULL,
    location VARCHAR(255) NOT NULL,
    schedule_text VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    start_date VARCHAR(40) NOT NULL,
    end_date VARCHAR(40) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('not_started', 'active', 'completed', 'suspended')),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_courses_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_courses_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS course_enrollments (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped')),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    UNIQUE KEY uq_course_enrollments_course_student (course_id, student_id),
    CONSTRAINT fk_course_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_enrollments_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS assignments (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirement TEXT NOT NULL,
    start_at VARCHAR(40) NOT NULL,
    due_at VARCHAR(40) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('draft', 'published', 'cancelled', 'closed')),
    cancel_reason TEXT,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_assignments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS submissions (
    id VARCHAR(36) PRIMARY KEY,
    assignment_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('draft', 'submitted', 'graded')),
    score DOUBLE,
    teacher_feedback TEXT,
    submitted_at VARCHAR(40),
    graded_at VARCHAR(40),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    UNIQUE KEY uq_submissions_assignment_student (assignment_id, student_id),
    CONSTRAINT fk_submissions_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    assignment_id VARCHAR(36) NOT NULL,
    submission_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('question', 'feedback')),
    content TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'deleted')),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_feedbacks_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedbacks_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedbacks_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS responses (
    id VARCHAR(36) PRIMARY KEY,
    feedback_id VARCHAR(36) NOT NULL,
    teacher_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    edited_at VARCHAR(40),
    CONSTRAINT fk_responses_feedback FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE,
    CONSTRAINT fk_responses_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS course_feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    course_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    dimension VARCHAR(32) NOT NULL CHECK (dimension IN ('content', 'method', 'teaching', 'gain', 'other')),
    content TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'deleted')),
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    CONSTRAINT fk_course_feedbacks_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_feedbacks_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    actor_user_id VARCHAR(36),
    actor_role VARCHAR(16),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64),
    summary TEXT NOT NULL,
    created_at VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
]

export const TABLE_NAMES: string[] = [
  'audit_logs',
  'course_feedbacks',
  'responses',
  'feedbacks',
  'submissions',
  'assignments',
  'course_enrollments',
  'courses',
  'auth_sessions',
  'verification_codes',
  'users',
]

export async function applyMigrations(database: Database, options: { reset?: boolean } = {}) {
  if (options.reset) {
    await database.exec('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of TABLE_NAMES) {
      await database.exec(`DROP TABLE IF EXISTS ${table}`)
    }
    await database.exec('SET FOREIGN_KEY_CHECKS = 1')
  }
  for (const statement of SCHEMA_STATEMENTS) {
    await database.exec(statement)
  }
}
