# MOVI Backend — production image (Railway / Render / any container host)
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# Generate Prisma client for PostgreSQL (production); build-time URL is a placeholder.
ENV DATABASE_PROVIDER=postgresql
ENV DATABASE_URL=postgresql://build:build@localhost:5432/movi?schema=public
RUN npm run db:generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install prisma@6.9.0 --no-save

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3001}/health" || exit 1

CMD ["sh", "-c", "node scripts/prepare-prisma.mjs && npx prisma generate && npx prisma migrate deploy && node dist/main.js"]
