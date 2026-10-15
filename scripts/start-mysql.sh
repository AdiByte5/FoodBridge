#!/usr/bin/env bash
# Starts the dedicated FoodBridge MySQL instance (isolated from any other
# MySQL server on this machine) on port 3307.
set -euo pipefail

MYSQL_BASE="${MYSQL_BASE:-/opt/homebrew/opt/mysql}"
MYSQL_BIN="$MYSQL_BASE/bin"
PORT="${FOODBRIDGE_MYSQL_PORT:-3307}"
DATADIR="$HOME/.foodbridge/mysql-data"
RUNDIR="$HOME/.foodbridge/run"

mkdir -p "$RUNDIR"

if "$MYSQL_BIN/mysqladmin" --protocol=TCP -h 127.0.0.1 -P "$PORT" -u root ping >/dev/null 2>&1; then
  echo "✓ FoodBridge MySQL already running on port $PORT"
  exit 0
fi

if [ ! -d "$DATADIR/mysql" ]; then
  echo "Initialising FoodBridge MySQL data directory at $DATADIR …"
  mkdir -p "$DATADIR"
  "$MYSQL_BIN/mysqld" --initialize-insecure --datadir="$DATADIR" --basedir="$MYSQL_BASE"
fi

nohup "$MYSQL_BIN/mysqld_safe" \
  --datadir="$DATADIR" \
  --basedir="$MYSQL_BASE" \
  --port="$PORT" \
  --socket="$RUNDIR/mysql.sock" \
  --pid-file="$RUNDIR/mysqld.pid" \
  --log-error="$RUNDIR/mysqld.log" \
  --mysqlx=0 \
  >/dev/null 2>&1 &
disown || true

for _ in $(seq 1 45); do
  if "$MYSQL_BIN/mysqladmin" --protocol=TCP -h 127.0.0.1 -P "$PORT" -u root ping >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

"$MYSQL_BIN/mysql" --protocol=TCP -h 127.0.0.1 -P "$PORT" -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS foodbridge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'foodbridge'@'%' IDENTIFIED BY 'foodbridge123';
GRANT ALL PRIVILEGES ON foodbridge.* TO 'foodbridge'@'%';
FLUSH PRIVILEGES;
SQL

echo "✓ MySQL ready on 127.0.0.1:$PORT  ·  database: foodbridge  ·  user: foodbridge"
