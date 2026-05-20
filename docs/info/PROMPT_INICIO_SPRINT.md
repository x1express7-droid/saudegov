# Prompt Padrão de Início de Sprint — SaúdeMunic

---

Vamos iniciar o desenvolvimento do projeto **SaúdeMunic**.

## Sprint atual: {NUMERO} — {NOME_DA_SPRINT}

---

## Divisão de papéis — leia com atenção

**Cursor:** é quem desenvolve. Lê os documentos do projeto, escreve o código, cria os arquivos, executa os comandos. Toda decisão de implementação vem dos documentos em `docs/`.

**Eu (intermediário):** não crio código, não defino implementação, não tomo decisões técnicas. Meu papel é monitorar o que o Cursor entregou, verificar se está correto, identificar erros e gerar os prompts de instrução para o Cursor executar.

---

## Como funciona cada etapa

**Etapa 1 — Leitura**
Listo os documentos do projeto que o Cursor deve ler antes de começar.
Gero o prompt para o Cursor ler e mapear as tarefas da sprint.

**Etapa 2 — Plano**
O Cursor apresenta o plano das tarefas em ordem, baseado nos documentos.
Você aprova ou ajusta antes de qualquer implementação começar.

**Etapa 3 — Prompt de implementação**
Para cada tarefa, gero um prompt claro e objetivo para o Cursor executar.
O Cursor consulta os documentos do projeto para implementar — não inventa nada.

**Etapa 4 — Verificação**
Você me envia o resultado do que o Cursor fez.
Eu verifico se está correto, se está alinhado com os documentos, se falta algo.
Se estiver errado, gero o prompt de correção. Se estiver certo, geramos o próximo.

**Só avançamos para a próxima tarefa após a atual estar aprovada.**

---

## Formato dos prompts que vou gerar

Cada prompt será entregue dentro de um bloco de código para você copiar e colar diretamente no Cursor, em dois tipos:

**Modo Ask** — para o Cursor tirar dúvida, revisar ou confirmar algo antes de implementar:
```
[prompt Ask aqui]
```

**Modo Agent** — para o Cursor executar a implementação:
```
[prompt Agent aqui]
```

Os prompts serão sempre instruções objetivas. O Cursor consulta os documentos do projeto para saber **como** implementar — o prompt diz apenas **o que** fazer e **onde** verificar.

---

## Documentos base desta sprint

O Cursor deve ler antes de começar:
- `docs/SPRINTS.md` → tarefas e critérios da sprint {NUMERO}
- `docs/ARCHITECTURE.md` → visão geral da plataforma
- `docs/MONOREPO.md` → estrutura de pastas
- `docs/CODING_STANDARDS.md` → padrões obrigatórios
- `.cursorrules` → regras permanentes do projeto

---

Pode me enviar os documentos que eu precisar ver para gerar o primeiro prompt.
