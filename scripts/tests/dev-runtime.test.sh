#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT_DIR/scripts/lib/runtime-info.sh"

tmp_log="$(mktemp)"
trap 'rm -f "$tmp_log"' EXIT

cat >"$tmp_log" <<'EOF'
> @course/web@0.0.0 dev
> vite

Port 5173 is in use, trying another one...
Port 5174 is in use, trying another one...

  VITE v8.0.10  ready in 259 ms

  ➜  Local:   http://localhost:5175/
  ➜  Network: http://192.168.1.25:5175/
EOF

actual="$(extract_preferred_vite_url "$tmp_log")"
expected="http://localhost:5175/"

if [[ "$actual" != "$expected" ]]; then
  printf 'expected %s, got %s\n' "$expected" "$actual"
  exit 1
fi

cat >"$tmp_log" <<'EOF'
[2026-04-23 20:21:55] starting web
  ➜  Local:   http://localhost:5175/

[2026-04-23 20:22:21] starting web
> @course/web@0.0.0 dev
> vite
EOF

actual="$(extract_preferred_vite_url "$tmp_log")"
expected=""

if [[ "$actual" != "$expected" ]]; then
  printf 'expected empty url for incomplete current run, got %s\n' "$actual"
  exit 1
fi

cat >"$tmp_log" <<'EOF'
[2026-04-23 20:21:55] starting web
  ➜  Local:   http://localhost:5175/

[2026-04-23 20:22:21] starting web
> @course/web@0.0.0 dev
> vite
  ➜  Local:   http://localhost:5173/
EOF

actual="$(extract_preferred_vite_url "$tmp_log")"
expected="http://localhost:5173/"

if [[ "$actual" != "$expected" ]]; then
  printf 'expected %s for latest run, got %s\n' "$expected" "$actual"
  exit 1
fi

printf 'dev runtime url parsing test passed\n'
