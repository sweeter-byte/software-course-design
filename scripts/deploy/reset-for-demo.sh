#!/bin/bash
# Reset production database to initial seeded state.
#
# Use right before formal acceptance / demo: drops every table, re-applies
# schema, re-seeds the teacher (13900139000) and officer (13700137000) demo
# accounts. Brief downtime while the systemd service restarts.
#
# Run on the server as root:
#     bash /opt/course-manage-system/scripts/deploy/reset-for-demo.sh

set -euo pipefail

PROJECT_DIR=/opt/course-manage-system
SERVICE=course-server.service
PASSWORD_FILE=/root/.secrets/course_app_mysql_password

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "Error: $PROJECT_DIR not found" >&2
  exit 1
fi
if [[ ! -f "$PASSWORD_FILE" ]]; then
  echo "Error: $PASSWORD_FILE not found" >&2
  exit 1
fi

echo "=== Stopping $SERVICE ==="
systemctl stop "$SERVICE"

echo "=== Resetting schema (DROP + CREATE all tables) ==="
sudo -u course bash -lc "cd $PROJECT_DIR && npm run db:reset --workspace @course/server"

echo "=== Seeding teacher + officer demo accounts ==="
sudo -u course bash -lc "cd $PROJECT_DIR && npm run seed --workspace @course/server"

echo "=== Starting $SERVICE ==="
systemctl start "$SERVICE"
sleep 2

echo "=== Service status ==="
systemctl status "$SERVICE" --no-pager | head -5

echo "=== Verifying database state ==="
APP_PASS=$(cat "$PASSWORD_FILE")
mysql -u course_app -p"$APP_PASS" -h 127.0.0.1 course_manage_system \
  -e "SELECT role, phone, real_name FROM users;
      SELECT COUNT(*) AS courses FROM courses;
      SELECT COUNT(*) AS submissions FROM submissions;
      SELECT COUNT(*) AS feedbacks FROM feedbacks;"

echo "=== Smoke testing https://rmywiki.cn ==="
curl -sS https://rmywiki.cn/health
echo
curl -sS -X POST https://rmywiki.cn/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13900139000","password":"Teacher123!"}' | head -c 200
echo

echo
echo "✓ Reset complete. The system is back to initial seeded state."
