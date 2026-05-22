# syntax=docker/dockerfile:1
# Build context: repository root (monorepo)
#   docker build -f apps/painel-dev/Dockerfile -t saudegov-painel-dev .
#
# Coolify: Dockerfile path = apps/painel-dev/Dockerfile, Base Directory = / (root)

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS builder
COPY . .
RUN npm install
RUN cd packages/core-db && npx prisma generate
RUN npx turbo build --filter=@saude/app-painel-dev

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/painel-dev/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/painel-dev/.next/static ./apps/painel-dev/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/painel-dev/public ./apps/painel-dev/public

# Prisma query engine (externalized via serverExternalPackages)
COPY --from=builder --chown=nextjs:nodejs /app/packages/core-db/node_modules/.prisma ./packages/core-db/node_modules/.prisma

USER nextjs
EXPOSE 3000
CMD ["node", "apps/painel-dev/server.js"]
