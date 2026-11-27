# syntax=docker/dockerfile:1

# ---- deps: install + warm the prisma engine cache ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: generate prisma client, build the app ----
FROM deps AS builder
COPY prisma ./prisma
COPY tsconfig.json next.config.ts postcss.config.mjs ./
COPY app ./app
COPY lib ./lib
COPY modules ./modules
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
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/generated ./lib/generated
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
USER nextjs

HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
