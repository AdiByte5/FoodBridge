#!/usr/bin/env bash
# Stops the React dev server, Spring Boot API and the FoodBridge MySQL instance.
set -uo pipefail

RUNDIR="$HOME/.foodbridge/run"
MYSQL_BIN="${MYSQL_BASE:-/opt/homebrew/opt/mysql}/bin"
PORT="${FOODBRIDGE_MYSQL_PORT:-3307}"

for name in frontend backend; do
  if [ -f "$RUNDIR/$name.pid" ]; then
    PID="$(cat "$RUNDIR/$name.pid")"
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" 2>/dev/null || true
      echo "✓ stopped $name (pid $PID)"
    fi
    rm -f "$RUNDIR/$name.pid"
  fi
done

# Child processes (java spring-boot, vite) may outlive the wrapper shell.
pkill -f "spring-boot:run" 2>/dev/null && echo "✓ stopped spring-boot runner" || true
pkill -f "vite" 2>/dev/null && echo "✓ stopped vite" || true

if "$MYSQL_BIN/mysqladmin" --protocol=TCP -h 127.0.0.1 -P "$PORT" -u root ping >/dev/null 2>&1; then
  "$MYSQL_BIN/mysqladmin" --protocol=TCP -h 127.0.0.1 -P "$PORT" -u root shutdown >/dev/null 2>&1 || true
  echo "✓ stopped FoodBridge MySQL"
fi

echo "FoodBridge stopped."
