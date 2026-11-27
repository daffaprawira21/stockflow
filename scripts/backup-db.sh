#!/bin/sh
# StockFlow — database backup script (NFR-20)
#
# Usage:
#   DATABASE_URL="postgresql://user:pass@host:5432/stockflow" BACKUP_DIR=./backups \
#     sh scripts/backup-db.sh
#
# Produces: $BACKUP_DIR/stockflow-<UTC-timestamp>.dump (custom, compressed archive)
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
command -v pg_dump >/dev/null 2>&1 || {
  echo "pg_dump not found on PATH" >&2
  exit 1
}

ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="${BACKUP_DIR%/}/stockflow-${ts}.dump"
mkdir -p "$BACKUP_DIR"

pg_dump --format=custom --file="$out" "$DATABASE_URL"
echo "backup written to ${out}" >&2
