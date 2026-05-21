-- Initial MySQL setup for course-manage-system.
--
-- 1. Generate a strong password (e.g. `openssl rand -base64 24 | tr -d '/+=' | head -c 24`)
--    and replace the REPLACE_WITH_STRONG_PASSWORD placeholder below.
-- 2. Mirror that password into .env.local as MYSQL_PASSWORD before booting the app.
-- 3. Run once with privileged access:
--        sudo mysql < scripts/setup-mysql.sql
--
-- The application connects as course_app using the .env.local credentials.

CREATE DATABASE IF NOT EXISTS course_manage_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS course_manage_system_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'course_app'@'localhost'
  IDENTIFIED BY 'REPLACE_WITH_STRONG_PASSWORD';

GRANT ALL PRIVILEGES ON course_manage_system.*      TO 'course_app'@'localhost';
GRANT ALL PRIVILEGES ON course_manage_system_test.* TO 'course_app'@'localhost';

FLUSH PRIVILEGES;
