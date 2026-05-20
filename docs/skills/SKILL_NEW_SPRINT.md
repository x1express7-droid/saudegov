# SKILL_NEW_SPRINT.md
# Como Iniciar uma Nova Sprint — saudegov

## Quando usar
Ao iniciar qualquer sprint do projeto. Use este guia para garantir que o contexto
está correto antes de escrever a primeira linha de código.

---

## Passo 1 — Leitura obrigatória antes de começar

```
1. docs/SPRINTS.md          → identifique a sprint atual e suas tasks
2. docs/ARCHITECTURE.md     → contexto geral da plataforma
3. docs/MUNICIPAL_MAP.md    → se a sprint envolve novo módulo
4. docs/DATABASE_SCHEMA.md  → se a sprint envolve migrations
5. docs/BUSINESS_RULES.md   → regras que a sprint deve implementar
```

---

## Passo 2 — Verificar o que já existe

Antes de criar qualquer arquivo, execute:

```sql
-- Ver o que já foi implementado no módulo desta sprint
SELECT funcionalidade, painel_dev, painel_servidor, status, sprint
FROM public.platform_features
WHERE modulo = '{modulo_da_sprint}'
ORDER BY funcionalidade;
```

Verifique também fisicamente:
```bash
# Ver arquivos existentes no módulo
ls modules/saude/{modulo}/src/actions/
ls modules/saude/{modulo}/src/queries/
ls modules/saude/{modulo}/src/validators/
```

**Regra:** se algo já existe, melhore — nunca duplique.

---

## Passo 3 — Ordem de implementação dentro da sprint

Sempre nesta sequência:

```
1. Migrations de banco (se houver)
2. Validators (schemas Zod)
3. Queries de leitura (get-*)
4. Server Actions (lógica com efeito)
5. Componentes de UI
6. Páginas (Server Components)
7. Registro em platform_features
```

Nunca construir UI antes de ter as actions funcionando.

---

## Passo 4 — Checklist pré-implementação de cada task

Antes de implementar cada task da sprint, confirme:

- [ ] Li as regras de negócio correspondentes em `BUSINESS_RULES.md`?
- [ ] O contrato de API está em `API_CONTRACTS.md`?
- [ ] Sei qual papel mínimo e permissão são exigidos (`AUTH_PERMISSIONS.md`)?
- [ ] Sei em qual arquivo o código vai ficar (`MONOREPO.md`)?
- [ ] A funcionalidade é para um ou dois painéis?

---

## Passo 5 — Validação de paridade entre painéis

Ao implementar qualquer funcionalidade, pergunte:
> "Esta funcionalidade tem equivalente no outro painel?"

Se sim e o outro painel não tem → implemente nos dois.
Se não tem certeza → consulte `public.platform_features`.

---

## Passo 6 — Registrar em platform_features ao concluir cada task

```sql
INSERT INTO public.platform_features
  (sistema, modulo, funcionalidade, descricao, painel_dev, painel_servidor, permissao_chave, status, sprint)
VALUES
  ('saude', '{modulo}', '{funcionalidade}', '{descricao}', {true|false}, {true|false}, '{chave}', 'ativo', '{sprint}');
```

---

## Passo 7 — Critério de conclusão da sprint

Sprint concluída quando:
- [ ] Todas as tasks marcadas como concluídas no `SPRINTS.md`
- [ ] Nenhum erro TypeScript (`tsc --noEmit` passa)
- [ ] RLS validado — teste com 2 tenants diferentes
- [ ] Todas as funcionalidades em `platform_features`
- [ ] `SPRINTS.md` atualizado com status ✅
