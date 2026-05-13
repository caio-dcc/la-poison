# Setup multi-IDE — LaPoison

Este projeto é desenvolvido em paralelo com **Claude Code**, **Cursor** e **Antigravity**. Todas as três IDEs leem e escrevem em `AGENT_STATE.json` para coordenação.

## Arquivos por IDE

| IDE           | Arquivo                      | Função                                      |
| ------------- | ---------------------------- | ------------------------------------------- |
| Claude Code   | `CLAUDE.md`                  | Instruções completas do agente (raiz)       |
| Cursor        | `.cursor/rules/main.mdc`     | Regras compactas referenciando `CLAUDE.md`  |
| Antigravity   | `.antigravity/agent.md`      | Mesmas regras, formato Antigravity          |
| Compartilhado | `AGENT_STATE.json`           | Estado do desenvolvimento                   |
| Compartilhado | `docs/CACHE.md`              | Decisões arquiteturais (evita re-perguntar) |
| Compartilhado | `docs/SEO_CHECKLIST.md`      | Checklist técnico de SEO                    |
| Compartilhado | `docs/API_SPEC.md`           | Endpoints do MVP original                   |
| Compartilhado | `docs/AGENT_STATE_SCHEMA.md` | Schema do estado                            |

## Como começar

1. **Clone o repo** com esses arquivos no lugar
2. **Abra na IDE de sua escolha** (qualquer uma das três)
3. **Pergunte a IA:** "Qual é a próxima task?"
   - Ela vai ler `AGENT_STATE.json`, identificar a próxima task elegível (priority mais baixa + blockers em `completed_tasks`) e começar
4. **Ao trocar de IDE:** a próxima IDE vai detectar que `last_agent` mudou e sincronizar

## Protocolo de concorrência

Se você abrir uma segunda IDE enquanto outra está mexendo:

- IDE B lê `AGENT_STATE.json` e vê `current_task !== null` com `last_agent: "claude-code"` há 5 minutos
- IDE B **para** e pergunta: "Outra IDE (claude-code) parece estar trabalhando em T-022. Continuar mesmo assim?"
- Se você confirmar, IDE B substitui `current_task.agent` e continua

## Comandos úteis

```bash
cat AGENT_STATE.json | jq '.current_task'

cat AGENT_STATE.json | jq '[.tasks_queue[] | select(.blockers | length == 0)]'

cat AGENT_STATE.json | jq '.session_log[-5:]'

echo "Completed: $(cat AGENT_STATE.json | jq '.completed_tasks | length')"
echo "Queued:    $(cat AGENT_STATE.json | jq '.tasks_queue | length')"
```

todas economiza tempo.
