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

# CLI global (COPY de .bin/prisma quebra paths dos arquivos .wasm; ts-node fica em packages/core-db/node_modules)
RUN npm install -g prisma@6.19.3 ts-node@10.9.2 typescript@5.8.3

COPY --from=builder --chown=nextjs:nodejs /app/apps/painel-dev/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/painel-dev/.next/static ./apps/painel-dev/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/painel-dev/public ./apps/painel-dev/public

# Prisma query engine (externalized via serverExternalPackages)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Prisma Client + schema (migrate/seed via CLI global acima)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder --chown=nextjs:nodejs /app/packages/core-db/package.json ./packages/core-db/package.json
COPY --from=builder --chown=nextjs:nodejs /app/packages/core-db/tsconfig.json ./packages/core-db/tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/packages/core-db/src ./packages/core-db/src
COPY --from=builder --chown=nextjs:nodejs /app/packages/core-db/prisma ./packages/core-db/prisma

USER nextjs
EXPOSE 3000
# Seed idempotente (upsert) — cria SUPERADMIN e tenants de dev. SKIP_DB_SEED=true para desativar.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=packages/core-db/prisma/schema.prisma && if [ \"$SKIP_DB_SEED\" != \"true\" ]; then cd packages/core-db && ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts; fi && cd /app && node apps/painel-dev/server.js"]
