# Database Backup and Recovery Runbook

Satisfies **NFR-20** (database backup and recovery procedures shall be documented) and supports **NFR-21** (errors logged without exposing sensitive information — credentials in this runbook are referenced only via environment variables, never hardcoded).

## 1. Backup

### 1.1 Full logical backup (`pg_dump`, custom archive format)

Recommended for scheduled off-VM backups. Custom format (`.dump`) is compressed and allows selective restore:

```sh
pg_dump \
  --format=custom \
  --file=stockflow-backup-$(date +%Y%m%dT%H%M%S).dump \
  "$DATABASE_URL"
```

Environment-variable driven template (see `scripts/backup-db.sh`):

```sh
#!/bin/sh
# usage: DATABASE_URL=... BACKUP_DIR=... scripts/backup-db.sh
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
mkdir -p "$BACKUP_DIR"
ts="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/stockflow-$ts.dump"
pg_dump --format=custom --file="$out" "$DATABASE_URL" \
  && echo "backup written to $out"
```

### 1.2 Retention

- Keep the most recent **7 daily** and **4 weekly** full backups (adjust to storage policy).
- Store backups in an object store separate from the database host (e.g. S3-compatible bucket) so a single-host failure does not destroy backups.
- Rotate/expire old dumps on a schedule (e.g. `find "$BACKUP_DIR" -name 'stockflow-*.dump' -mtime +30 -delete`).

## 2. Restore

### 2.1 Restore into a clean database

```sh
createdb stockflow
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --role=postgres \
  --dbname=stockflow \
  stockflow-backup-XXXXXX.dump
```

`--clean --if-exists` drops and recreates objects; run against an empty or disposable database.

### 2.2 After restore

- Apply any outstanding migrations: `npm run db:deploy` (or `npx prisma@7.10.1 migrate deploy`).
- Verify the seeded admin account still works (login at `/login`).
- Verify `GET /api/health` returns `200` against the restored database.

## 3. Point-in-Time Recovery (PITR)

StockFlow MVP uses standard logical backups; PITR is available on managed PostgreSQL platforms (RDS/Wal-G, Cloud SQL, Neon, etc.) via WAL archiving / continuous backups:

- Enable the platform's continuous backup feature (default 5-minute intervals on RDS).
- Configure WAL (archive) retention on the platform.
- To restore to a point in time, use the platform's "restore to point in time" console/API to a new instance, then promote it and repoint `DATABASE_URL`.

## 4. Verification drill

Quarterly, run a **restore drill** on a scratch database from the most recent dump and execute the post-restore checks in §2.2. Record the drill date and outcome in the operations log.

## 5. Backup automation

The `scripts/backup-db.sh` template is intended for:

- Local/CI scheduled jobs (cron) writing to shared/object storage.
- Managed-platform automated backup features (preferred in production, replacing manual dumps).

Production should prefer managed-provider automated backups + PITR over manual `pg_dump` runs, and keep `scripts/backup-db.sh` as a manual/last-resort path.
