# syntax=docker/dockerfile:1
# Build context: repository root (monorepo)
#   docker build -f apps/painel-dev/Dockerfile -t saudegov-painel-dev .
#
# Coolify: Dockerfile path = apps/painel-dev/Dockerfile, Base Directory = / (root)

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
RUN npx turbo build --filter=@saude/app-painel-dev
ENV NODE_ENV=production

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
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copia o prisma CLI e schema para rodar migrations no startup
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/packages/core-db/prisma ./packages/core-db/prisma

USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/core-db/prisma/schema.prisma && node apps/painel-dev/server.js"]
