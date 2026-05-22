# saudegov

Plataforma SaaS multi-tenant de gestão de saúde pública municipal no Brasil. O MVP atual é o módulo TFD (Tratamento Fora de Domicílio), com dois painéis: desenvolvedor (plataforma) e servidor (operação municipal).

## Pré-requisitos

- Node.js >= 20
- npm >= 10
- PostgreSQL (banco local: `saudegov` — ver `docs/MONOREPO.md` e `cursorrules`)

## Setup

```bash
npm install
```

Configure variáveis de ambiente conforme `.env.example` (quando disponível) e rode migrations quando `packages/core-db` existir:

```bash
npm run db:migrate
npm run db:generate
```

Após um `git pull` que traga **migrations novas** em `packages/core-db/prisma/migrations`, regenere o Prisma Client antes de subir o servidor ou rodar scripts locais:

```bash
npm run db:migrate   # se ainda não aplicou as migrations no banco local
npm run db:generate  # obrigatório — evita delegates ausentes (ex.: tfdSolicitacao)
```

## Desenvolvimento

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe todos os apps em modo dev |
| `npm run dev:dev` | Painel desenvolvedor — porta **3000** |
| `npm run dev:servidor` | Painel servidor — porta **3001** |
| `npm run build` | Build de todos os workspaces |
| `npm run lint` | ESLint em todo o monorepo |
| `npm run type-check` | TypeScript em todo o monorepo |
| `npm run db:generate` | Gera o Prisma Client (`@saude/core-db`) |
| `npm run db:migrate` | Migrations de desenvolvimento |
| `npm run db:studio` | Prisma Studio (`packages/core-db`) |

Documentação completa da estrutura: [`docs/MONOREPO.md`](docs/MONOREPO.md).
