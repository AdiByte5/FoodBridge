#!/usr/bin/env bash
# Boots the whole FoodBridge stack: MySQL (3307) + Spring Boot API (8080) + React app (5173).
# Safe to run repeatedly: anything that is already running is detected and left alone.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNDIR="$HOME/.foodbridge/run"
mkdir -p "$RUNDIR"

is_up() { # is_up <port> <path>
  curl -s -o /dev/null -m 3 "http://localhost:$1$2" 2>/dev/null
}

# ---------------------------------------------------------------- database
"$ROOT/scripts/start-mysql.sh"

# ----------------------------------------------------------------- backend
if is_up 8080 /actuator/health; then
  echo "✓ API already running on http://localhost:8080"
else
  echo "Starting Spring Boot API (log: $RUNDIR/backend.log) …"
  # the subshell exec-s into the process itself, so no wrapper shell lingers
  ( cd "$ROOT/backend" && exec nohup ./mvnw -q spring-boot:run < /dev/null > "$RUNDIR/backend.log" 2>&1 ) &
  echo $! > "$RUNDIR/backend.pid"
  for _ in $(seq 1 60); do
    if is_up 8080 /actuator/health; then
      echo "✓ API healthy on http://localhost:8080"
      break
    fi
    sleep 2
  done
fi

# ---------------------------------------------------------------- frontend
if is_up 5173 /; then
  echo "✓ Web app already running on http://localhost:5173"
else
  echo "Starting React app (log: $RUNDIR/frontend.log) …"
  # stdin from /dev/null: vite exits when its stdin closes (e.g. Terminal window closed),
  # so it must never inherit the terminal's stdin.
  ( cd "$ROOT/frontend" && exec nohup npm run dev -- --strictPort < /dev/null > "$RUNDIR/frontend.log" 2>&1 ) &
  echo $! > "$RUNDIR/frontend.pid"
  for _ in $(seq 1 40); do
    if is_up 5173 /; then
      echo "✓ Web app ready on http://localhost:5173"
      break
    fi
    sleep 1
  done
fi

if ! is_up 5173 / || ! is_up 8080 /actuator/health; then
  echo
  echo "✗ Something did not start correctly."
  echo "  Web app log: $RUNDIR/frontend.log"
  echo "  API log:     $RUNDIR/backend.log"
  exit 1
fi

cat <<'EOF'

FoodBridge is running. Open it in any browser on this laptop:

    http://localhost:5173

  • REST API  →  http://localhost:8080/api
  • Health    →  http://localhost:8080/actuator/health

Sample logins (password pattern <Role>@123):
  admin@foodbridge.org     / Admin@123      (administrator)
  donor@foodbridge.org     / Donor@123      (Spice Route Restaurant)
  recipient@foodbridge.org / Recipient@123  (Akshaya Patra Community Kitchen)
  volunteer@foodbridge.org / Volunteer@123  (Ravi Kumar)

Handy:
  open http://localhost:5173     # launch it straight from the terminal
  ./scripts/stop-all.sh          # stop the web app, API and database
EOF
