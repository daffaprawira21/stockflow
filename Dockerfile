# syntax=docker/dockerfile:1

# ---- deps: install + warm the prisma engine cache ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts

# ---- builder: generate prisma client, build the app ----
# ARG values are available to the shell during RUN commands as env vars;
# lib/env.ts validates shape only, so build-time values are placeholders.
# Real secrets are injected at runtime via docker-compose / orchestrator.
FROM deps AS builder
ARG DATABASE_URL="postgresql://build:build@build:5432/build"
ARG ADMIN_EMAIL="build@example.com"
ARG ADMIN_PASSWORD="build-password-12345"
ARG ALLOWED_ORIGINS="http://localhost:3000"
ARG TZ="Asia/Jakarta"
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY app ./app
COPY lib ./lib
COPY modules ./modules
COPY components ./components
COPY proxy.ts .
RUN npx prisma@7.10.1 generate
RUN npm run build
# Prisma 7 emits the ORM + engines into `lib/generated/prisma` (schema
# `output` path), which is not a node_modules package. Copy it next to the
# standalone bundle so the runtime imports resolve.
RUN mkdir -p /app/.next/generated && cp -r /app/lib/generated/prisma /app/.next/generated/prisma

# ---- runner: non-root standalone runtime ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root users to satisfy the standalone server's user detection.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/generated ./lib/generated
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
USER nextjs

HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -qO- http://stockflow-app-1:3000/api/health || exit 1

CMD ["node", "server.js"]
