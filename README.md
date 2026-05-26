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

Seeds parciais de `platform_features` (após migrations):

```bash
cd packages/core-db
npm run db:seed:sprint-1-8-features   # relatórios PDF básicos, dashboard, audit Dev
npm run db:seed:sprint-2-1-features   # relatórios analíticos, CSV, exportação municipal
npm run db:verify:sprint-2-1-features # confere as 9 entradas da sprint 2.1 no banco
```

Documentação completa da estrutura: [`docs/MONOREPO.md`](docs/MONOREPO.md). Sprint 2.1 (concluída): [`docs/SPRINTS.md`](docs/SPRINTS.md#sprint-21--relatórios-e-exportação-tfd).

## Cron jobs (painel-servidor)

Rotas em `apps/painel-servidor/app/api/cron/`. Todas exigem header `Authorization: Bearer <CRON_SECRET>` (`CRON_SECRET` no ambiente do app). Em produção na Vercel, agendamentos ficam em `apps/painel-servidor/vercel.json`.

| Nome | Rota | Frequência recomendada | O que faz |
|------|------|------------------------|-----------|
| Lembrete de viagem (48h) | `GET /api/cron/tfd-lembrete-viagem` | A cada hora (`0 * * * *`) | Notifica servidor e motorista 48h antes da viagem. Marca `lembrete_48h_enviado_at` ou `lembrete_48h_falhou_at` — reexecução não reenvia para viagens já marcadas. |
| Lembrete de prestação (48h) | `GET /api/cron/tfd-lembrete-prestacao` | A cada hora (`0 * * * *`) | Notifica 48h antes do prazo de envio da PC. Idempotente via `lembrete_48h_enviado_at` / `lembrete_48h_falhou_at`. |
| Transição em viagem | `GET /api/cron/tfd-transicao-em-viagem` | Diária, antes do expediente — ex.: `0 9 * * *` UTC (~06:00 em `America/Sao_Paulo`) | Para viagens `AGENDADA` com `data_viagem` ≤ hoje (timezone do tenant em `settings.timezone`), transiciona solicitação `AGENDADO` → `EM_VIAGEM`, grava `em_viagem_transicionado_at` na viagem e registra tramitação/auditoria. Idempotente: viagens já com `em_viagem_transicionado_at` são ignoradas; se a solicitação já estiver `EM_VIAGEM` (outra viagem no mesmo dia), só marca a viagem sem duplicar o status. |

Teste local (painel-servidor na porta 3001):

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3001/api/cron/tfd-transicao-em-viagem
```
