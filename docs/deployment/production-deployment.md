# Production Deployment Runbook

Satisfies **NFR-19** (production secrets managed outside source control) and **NFR-20** (backup/recovery documented, see `backup-and-recovery.md`), and implements the cloud deployment model from architecture §9.1/§9.2.

## 1. Deployment model

- Application: Next.js (standalone build) packaged as an OCI image (`Dockerfile` in repo root).
- Database: managed PostgreSQL (any provider offering `pg` protocol + `pg_isready`).
- Environments: Development (local/`docker compose`), Testing (CI), Production (cloud platform).
- Orchestration: run the `app` service with the `postgres` service from `docker-compose.yml` locally; on cloud platforms deploy the built image + provision managed PostgreSQL and point `DATABASE_URL` at it.

## 2. Environment configuration

All deployment-specific configuration is passed via environment variables (see `.env.example` for the full list). No secret may ever be committed to the repository, baked into the image, or echoed into logs (NFR-19, NFR-21).

### Required variables (production)

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Managed PostgreSQL connection string (credentials via platform secret store, not in git). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed administrator credentials (password ≥ 12 chars). |
| `SESSION_COOKIE_NAME` | Session cookie name (default `stockflow_session`). |
| `SESSION_COOKIE_SECURE` | Set `true` in production (HTTPS). |
| `ALLOWED_ORIGINS` | Comma-separated allowed origins for state-changing requests. |
| `ALLOW_SEED` | `false` by default; set `true` only for an initial seed run against a fresh database. |
| `TZ` | IANA timezone for deterministic date rendering. |

### Secret management

- Store secrets in the platform's secret/vault manager (e.g. AWS Secrets Manager, GCP Secret Manager, a Kubernetes secrets manager) and inject them into the container at runtime.
- Never commit secrets to git (`.env*` files are git-ignored except `.env.example`).
- The image build (Dockerfile) does not receive any secret; only the runtime environment provides them.

## 3. Migrations

The application uses Prisma migrations (`prisma/migrations`). Deploy workflow:

1. Build the new image and deploy it **with migrations pending** — or, preferably:
2. Before switching traffic to the new version, run:
   ```sh
   DATABASE_URL="$DATABASE_URL" npx prisma@7.10.1 migrate deploy
   ```
3. Confirm `GET /api/health` returns `200` and the database is at the expected schema version.

Run migrations **before** routing user traffic to the new version to keep the running application and the database schema in sync.

## 4. Rollback

If a release misbehaves:

1. Revert the container image to the last known-good tag.
2. If the failing release included a database migration that cannot be rolled back automatically, restore the database from the pre-migration backup (`backup-and-recovery.md` §2) and redeploy.
3. Confirm `GET /api/health` returns `200` before declaring the rollback complete.

## 5. Post-deploy verification checklist

- [ ] `GET /api/health` → `200 { "status": "healthy", "database": "connected" }`
- [ ] Login at `/login` with the seeded administrator works.
- [ ] A product can be created and listed via the UI/API.
- [ ] Database backup schedule is active (managed platform) or the last `pg_dump` is within retention window.

## 6. Local development

`docker compose up` starts `app` + `postgres` and applies the health checks defined in `docker-compose.yml`. Set `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and any other variables in `.env` (never commit it) before starting.
