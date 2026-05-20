#!/usr/bin/env bash

latest_run_segment() {
  local log_file="$1"
  awk '
    /^\[[^]]+\] starting / { start = NR }
    { lines[NR] = $0 }
    END {
      if (start) {
        for (i = start; i <= NR; i += 1) {
          print lines[i]
        }
      } else {
        for (i = 1; i <= NR; i += 1) {
          print lines[i]
        }
      }
    }
  ' "$log_file"
}

extract_vite_local_url() {
  local log_file="$1"
  latest_run_segment "$log_file" | sed -nE 's/^.*Local:[[:space:]]+(https?:\/\/[^[:space:]]+).*$/\1/p' | tail -n 1
}

extract_vite_network_url() {
  local log_file="$1"
  latest_run_segment "$log_file" | sed -nE 's/^.*Network:[[:space:]]+(https?:\/\/[^[:space:]]+).*$/\1/p' | tail -n 1
}

extract_preferred_vite_url() {
  local log_file="$1"
  local url

  url="$(extract_vite_local_url "$log_file")"
  if [[ -n "$url" ]]; then
    printf '%s' "$url"
    return 0
  fi

  url="$(extract_vite_network_url "$log_file")"
  if [[ -n "$url" ]]; then
    printf '%s' "$url"
  fi
}

wait_for_vite_url() {
  local log_file="$1"
  local timeout_seconds="${2:-8}"
  local elapsed=0
  local url=""

  while ((elapsed < timeout_seconds * 10)); do
    url="$(extract_preferred_vite_url "$log_file")"
    if [[ -n "$url" ]]; then
      printf '%s' "$url"
      return 0
    fi

    sleep 0.1
    ((elapsed += 1))
  done

  return 1
}

load_env_file() {
  local env_file="$1"

  if [[ ! -f "$env_file" ]]; then
    return 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
}
