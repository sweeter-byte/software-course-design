#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs/runtime"
SERVER_LOG="$LOG_DIR/server-dev.log"
WEB_LOG="$LOG_DIR/web-dev.log"
MOBILE_LOG="$LOG_DIR/mobile-dev.log"
SERVER_URL="http://localhost:4100"
WEB_URL="http://localhost:5173"

START_MOBILE=false
SKIP_INSTALL=false
PIDS=()

source "$ROOT_DIR/scripts/lib/runtime-info.sh"

usage() {
  cat <<'EOF'
用法:
  bash scripts/dev.sh [--mobile] [--skip-install]

参数:
  --mobile        同时启动 Expo 移动端
  --skip-install  即使缺少 node_modules 也不自动执行 npm install
  -h, --help      显示帮助
EOF
}

log() {
  printf '[dev.sh] %s\n' "$1"
}

append_banner() {
  local target="$1"
  local label="$2"
  printf '\n[%s] %s\n' "$(date '+%F %T')" "$label" >>"$target"
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    log "缺少命令: $command_name"
    exit 1
  fi
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM

  if ((${#PIDS[@]} > 0)); then
    log "正在停止后台进程..."
    for pid in "${PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
      fi
    done
    wait "${PIDS[@]}" 2>/dev/null || true
  fi

  exit "$exit_code"
}

start_service() {
  local name="$1"
  local log_file="$2"
  shift 2

  append_banner "$log_file" "starting $name"
  (
    cd "$ROOT_DIR"
    exec "$@"
  ) >>"$log_file" 2>&1 &

  local pid=$!
  PIDS+=("$pid")
  log "$name 已启动，PID=$pid，日志: ${log_file#$ROOT_DIR/}"
}

while (($# > 0)); do
  case "$1" in
    --mobile)
      START_MOBILE=true
      ;;
    --skip-install)
      SKIP_INSTALL=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      log "未知参数: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

trap cleanup EXIT INT TERM

require_command npm
mkdir -p "$LOG_DIR"

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  if [[ "$SKIP_INSTALL" == true ]]; then
    log "未检测到 node_modules，且已指定 --skip-install，无法继续。"
    exit 1
  fi

  log "未检测到 node_modules，开始执行 npm install..."
  (
    cd "$ROOT_DIR"
    npm install
  )
fi

log "准备启动课程互动管理系统..."
log "默认服务: server + web"
if [[ "$START_MOBILE" == true ]]; then
  log "附加服务: mobile"
fi

start_service "server" "$SERVER_LOG" npm run dev:server
start_service "web" "$WEB_LOG" npm run dev:web

resolved_web_url="$(wait_for_vite_url "$WEB_LOG" 10 || true)"
if [[ -n "$resolved_web_url" ]]; then
  WEB_URL="$resolved_web_url"
fi

if [[ "$START_MOBILE" == true ]]; then
  append_banner "$MOBILE_LOG" "starting mobile"
  (
    cd "$ROOT_DIR"
    export EXPO_NO_INTERACTIVE=1
    exec npm run dev:mobile
  ) >>"$MOBILE_LOG" 2>&1 &
  mobile_pid=$!
  PIDS+=("$mobile_pid")
  log "mobile 已启动，PID=$mobile_pid，日志: ${MOBILE_LOG#$ROOT_DIR/}"
fi

cat <<EOF

服务启动中，请查看:
  API:    $SERVER_URL
  Web:    $WEB_URL

浏览器请打开 Web 地址，不要直接打开 API 地址。

日志文件:
  ${SERVER_LOG#$ROOT_DIR/}
  ${WEB_LOG#$ROOT_DIR/}
EOF

if [[ "$START_MOBILE" == true ]]; then
  printf '  %s\n' "${MOBILE_LOG#$ROOT_DIR/}"
fi

printf '\n按 Ctrl+C 可停止全部进程。\n'

wait -n "${PIDS[@]}"
