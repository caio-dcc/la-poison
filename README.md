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

## Environment variables

All secrets live in `.env.local` (gitignored). A redacted template is committed at `.env.example` — copy it and fill in values from the sources below.

| Variable                                            | Required by                             | Where to find it                                                                                               |
| --------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                          | app + scripts                           | Supabase Dashboard → Project Settings → API → Project URL                                                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`              | app                                     | Supabase Dashboard → Project Settings → API → `anon` / `publishable` key                                       |
| `SUPABASE_SERVICE_KEY`                              | server routes, scripts                  | Supabase Dashboard → Project Settings → API → `service_role` secret. **Never expose to client.**               |
| `DATABASE_URL`                                      | scripts only (seed, ingest, embeddings) | Supabase Dashboard → Project Settings → Database → Connection string → URI. Rotate password under same screen. |
| `STRIPE_SECRET_KEY`                                 | `/api/stripe/*`                         | Stripe Dashboard → Developers → API keys → Secret key                                                          |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                | client checkout                         | same screen as above, Publishable key                                                                          |
| `STRIPE_WEBHOOK_SECRET`                             | `/api/stripe/webhook`                   | Stripe Dashboard → Developers → Webhooks → endpoint → Signing secret                                           |
| `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_ANNUAL` | checkout                                | Stripe Dashboard → Products → Pro plan → Prices → API id                                                       |
| `ANTHROPIC_API_KEY`                                 | chatbot, enrichment                     | console.anthropic.com → Settings → API keys                                                                    |
| `IP_HASH_SECRET`                                    | chatbot rate limiting                   | Generate locally: `openssl rand -base64 32`                                                                    |
| `R2_*`                                              | image uploads                           | Cloudflare Dashboard → R2 → API tokens (Object Read & Write on the bucket)                                     |
| `NEXT_PUBLIC_APP_URL`                               | absolute URLs, OG images                | `http://localhost:3000` in dev, production domain in prod                                                      |

### Security notes

- `.env` and `.env.local` are in `.gitignore`. Verify with `git check-ignore .env.local` before committing.
- `.claude/settings.local.json` is gitignored. Historically it contained an embedded `DATABASE_URL` — if your clone predates 2026-05-15, rotate the Supabase database password.
- `SUPABASE_SERVICE_KEY` bypasses Row-Level Security. Use it only in `app/api/*` server routes or in `scripts/`, never in `'use client'` files.
- `IP_HASH_SECRET` must be stable across deploys, otherwise rate-limit counters reset every restart.
