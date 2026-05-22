# syntax=docker/dockerfile:1
# Build context: repository root (monorepo)
#   docker build -f apps/painel-servidor/Dockerfile -t saudegov-painel-servidor .
#
# Coolify: Dockerfile path = apps/painel-servidor/Dockerfile, Base Directory = / (root)

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS builder
# Coolify pode injetar NODE_ENV=production no build; devDeps (tailwind, postcss) são necessárias
ENV NODE_ENV=development
COPY . .
RUN npm install
# Client gerado em node_modules/.prisma/client (raiz do monorepo — ver schema.prisma)
RUN npx prisma generate --schema=packages/core-db/prisma/schema.prisma
RUN npx turbo build --filter=@saude/app-painel-servidor
ENV NODE_ENV=production

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/painel-servidor/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/painel-servidor/.next/static ./apps/painel-servidor/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/painel-servidor/public ./apps/painel-servidor/public

# Prisma query engine (externalized via serverExternalPackages)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
CMD ["node", "apps/painel-servidor/server.js"]
