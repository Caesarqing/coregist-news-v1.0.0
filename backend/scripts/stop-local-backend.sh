#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.runtime/pids"

if [ ! -d "$PID_DIR" ]; then
  echo "No PID directory found: $PID_DIR"
  exit 0
fi

for pid_file in "$PID_DIR"/*.pid; do
  [ -f "$pid_file" ] || continue
  pid="$(cat "$pid_file")"
  name="$(basename "$pid_file" .pid)"
  if kill -0 "$pid" >/dev/null 2>&1; then
    echo "Stopping $name ($pid)"
    kill "$pid" >/dev/null 2>&1 || true
  else
    echo "Skipping $name (not running)"
  fi
  rm -f "$pid_file"
done

echo "Done."
