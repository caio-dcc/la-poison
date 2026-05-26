# Auditoria Completa: Auth, Segurança, Stripe e SaaS

**Data:** 2026-05-25  
**Status:** Documentação de achados críticos e plano de remediação

---

## 1. AUTENTICAÇÃO (Supabase Auth)

### ✅ Implementado

- **Auth provider:** Supabase Auth (email/password + Google OAuth)
- **Session management:** Cookies automáticos via SSR
- **Protected routes:** Middleware em `middleware.ts` protege `/meus-bares`, `/inventario`, `/conta`
- **Callbacks:** OAuth callback handler em `/api/auth/callback`
- **Logout:** Endpoint POST `/api/auth/logout`

### ⚠️ Problemas Encontrados

#### P1.1 — Signup sem validação de força de senha

- **Arquivo:** `src/components/auth/SignupForm.tsx`
- **Problema:** Form aceita qualquer senha (mesmo "123")
- **Risco:** ALTO — contas comprometidas facilmente
- **Fix:** Validar contra padrão (min 8 chars, 1 maiúscula, 1 número, 1 símbolo)

#### P1.2 — Rate limiting de login ausente

- **Arquivo:** `app/api/auth/login/route.ts`
- **Problema:** Nenhuma proteção contra brute-force
- **Risco:** ALTO — ataques de força bruta
- **Fix:** Implementar HMAC-SHA256 rate limiting (5 tentativas/5min por IP)

#### P1.3 — Exposição de usuário em erros

- **Arquivo:** `app/api/auth/login/route.ts:21`
- **Problema:** Retorna "Invalid credentials" genérico (bom), mas logs podem vazar
- **Risco:** MÉDIO — information disclosure via logs
- **Fix:** Não fazer console.log de dados sensíveis

#### P1.4 — Falta email confirmation

- **Arquivo:** Supabase Auth config
- **Problema:** Não exige confirmação de email
- **Risco:** MÉDIO — accounts com emails falsos, spam
- **Fix:** Ativar email confirmation na dashboard Supabase

---

## 2. SEGURANÇA GERAL

### ⚠️ Problemas Encontrados

#### S2.1 — Exposição de STRIPE_SECRET_KEY

- **Arquivo:** `app/api/stripe/checkout/route.ts:5`, `portal/route.ts:5`, `webhook/route.ts:5`
- **Problema:** `process.env.STRIPE_SECRET_KEY` em código server-side está OK, mas erros não-tratados podem expor a chave via stack trace
- **Risco:** CRÍTICO — chave de pagamento exposta
- **Fix:** Wrapping em try-catch (já existe), mas adicionar logging seguro

#### S2.2 — Webhook sem validação de IP Stripe

- **Arquivo:** `app/api/stripe/webhook/route.ts:9-22`
- **Problema:** Valida apenas signature; sem verificação de IP origin
- **Risco:** MÉDIO — replay attacks se signature descoberta
- **Fix:** Adicionar `X-Forwarded-For` whitelist para IPs Stripe (162.125.0.0/16)

#### S2.3 — Sem CORS/CSRF protection explícita

- **Arquivo:** Nenhuma middleware de CSRF
- **Problema:** POST endpoints não verificam origin
- **Risco:** MÉDIO — CSRF em POST /api/stripe/checkout
- **Fix:** Validar `Origin` header em todas as rotas sensíveis

#### S2.4 — Rate limiting do chatbot desabilitado

- **Arquivo:** `app/api/chatbot/route.ts:593-594`
- **Problema:** TODO: re-enable rate limiting after testing (comentário)
- **Risco:** ALTO — abuso de API (DDoS, extorsão de credibilidade)
- **Fix:** Implementar HMAC-SHA256 IP-based rate limiting (3/dia anon, 10/dia free, ilimitado pro)

#### S2.5 — Sem proteção contra data exfiltration

- **Arquivo:** `app/api/cocktails/route.ts`, etc.
- **Problema:** APIs retornam dados públicos sem limite de tamanho
- **Risco:** MÉDIO — DDoS via query grande
- **Fix:** Adicionar max limit de 500 registros por query

#### S2.6 — SUPABASE_SERVICE_KEY pode estar em logs

- **Arquivo:** Variáveis de ambiente
- **Problema:** Se service key vazar, RLS bypass é trivial
- **Risco:** CRÍTICO
- **Fix:** Garantir service key nunca em logs; usar logs estruturados (Vercel)

---

## 3. STRIPE E PAGAMENTOS

### ✅ Implementado

- **Stripe SDK:** `npm install stripe`
- **Checkout:** `POST /api/stripe/checkout` cria session com trial 7 dias
- **Webhook:** `POST /api/stripe/webhook` processa 3 eventos:
  - `checkout.session.completed` — salva subscription inicial
  - `customer.subscription.updated` — atualiza status e plan_type
  - `customer.subscription.deleted` — marca como cancelado
- **Billing portal:** `POST /api/stripe/portal` cria link para customer portal
- **Database:** Tabela `subscriptions` com RLS policies

### ❌ Problemas Críticos

#### P3.1 — SCHEMA: Falta `stripe_customer_id`

- **Arquivo:** `supabase/migrations/001_initial_schema.sql` (linhas 63-73)
- **Problema:**
  - Webhook tenta salvar em `stripe_customer_id` (webhook/route.ts:44)
  - Portal tenta ler de `stripe_customer_id` (portal/route.ts:22)
  - Coluna não existe no schema — **ERRO DE RUNTIME**
- **Risco:** CRÍTICO — Stripe integration completamente quebrada
- **Fix:** Executar migration que adicione coluna:
  ```sql
  ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT UNIQUE;
  ```

#### P3.2 — SCHEMA: Sem `plan_type` armazenado via Stripe

- **Arquivo:** `app/api/stripe/webhook/route.ts:79-84`
- **Problema:**
  - Webhook tenta mapear `subscription.items.data[0]?.price.metadata.plan_type`
  - Nenhum Stripe price foi criado com essa metadata
  - Cai em `'unknown'` (fallback)
- **Risco:** ALTO — Plano não é rastreado corretamente
- **Fix:** Criar 2 Stripe prices com metadata:
  ```json
  {
    "price_id": "price_monthly",
    "metadata": { "plan_type": "pro_monthly" }
  }
  ```

#### P3.3 — Pricing page é placeholder

- **Arquivo:** `app/[locale]/pricing/page.tsx`
- **Problema:** Apenas teaser "Coming Soon", sem cards de plano e botões "Subscribe"
- **Risco:** MÉDIO — Não há UX para upgrade
- **Fix:** Implementar pricing cards com priceIds do Stripe

#### P3.4 — Sem lógica de unlock de features

- **Arquivo:** Nenhum arquivo
- **Problema:** Não há código que bloqueia chatbot para usuários free
- **Risco:** CRÍTICO — Anyone can use chatbot ilimitadamente
- **Fix:** Implementar server-side subscription check em `/api/chatbot`

#### P3.5 — Customer email vs. Stripe customer_id

- **Arquivo:** `app/api/stripe/checkout/route.ts:30`
- **Problema:**
  - Checkout usa `customer_email` ao invés de `customer: stripe_customer_id`
  - Stripe cria novo customer a cada checkout
  - Falta reconciliação entre users e customers
- **Risco:** ALTO — Múltiplos customers por user, confusão de billing
- **Fix:** Recuperar `stripe_customer_id` do user antes, ou usar customer creation API

#### P3.6 — Sem idempotency keys

- **Arquivo:** `app/api/stripe/checkout/route.ts:28`, `webhook/route.ts:39`
- **Problema:** Sem `idempotency_key` em POST requests
- **Risco:** MÉDIO — Duplicatas em caso de retries
- **Fix:** Adicionar header `Idempotency-Key` com hash(user_id + timestamp)

#### P3.7 — Webhook sem max-age check

- **Arquivo:** `app/api/stripe/webhook/route.ts`
- **Problema:** Não valida `event.created` timestamp
- **Risco:** MÉDIO — Replay attacks (mesmo se signature válida)
- **Fix:** Rejeitar eventos com age > 5 minutos

#### P3.8 — Sem suporte a diferentes moedas

- **Arquivo:** `app/api/stripe/checkout/route.ts:28-43`
- **Problema:** Hardcoded BRL, mas Stripe espera ISO 4217
- **Risco:** MÉDIO — Conversão incorreta
- **Fix:** Passar `currency: 'brl'` na checkout session

---

## 4. SAAS FEATURES E FEATURE UNLOCK

### ❌ Não Implementado

#### F4.1 — Feature gating do chatbot

- **Problema:** `/api/chatbot` não verifica subscription status
- **Risco:** CRÍTICO — pro features acessíveis sem pagamento
- **Fix:** Adicionar check em `/api/chatbot`:

  ```typescript
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_type')
    .eq('user_id', userId)
    .single()

  if (sub?.plan_type === 'free' && rateLimitExceeded) {
    return NextResponse.json({ error: 'Rate limit' }, { status: 429 })
  }
  ```

#### F4.2 — Rate limiting por subscription

- **Problema:** Rate limiting desabilitado; sem diferenciação free vs pro
- **Risco:** CRÍTICO — Pro users still rate limited
- **Fix:** Implementar:
  - Anonymous (IP): 3/dia
  - Free (user_id): 10/dia
  - Pro (plan_type): ilimitado

#### F4.3 — Sem sync entre Stripe e DB

- **Problema:** Se webhook falhar, subscription status diverge
- **Risco:** ALTO — Usuários pro bloqueados, ou vice-versa
- **Fix:** Adicionar reconciliation job que checa Stripe API a cada 1h

#### F4.4 — Sem trials

- **Problema:** Stripe checkout tem `trial_period_days: 7`, mas DB não marca como trial
- **Risco:** MÉDIO — Users think they're pro, rate limiting bloqueia
- **Fix:** Adicionar `plan_type: 'pro_trial'` no webhook inicial

#### F4.5 — Sem webhooks para payment_failed

- **Problema:** Stripe não notifica se pagamento falhar
- **Risco:** ALTO — Usuários pro perdem acesso sem aviso
- **Fix:** Adicionar case `invoice.payment_failed` no webhook

---

## 5. RATE LIMITING

### ❌ Desabilitado

#### R5.1 — IP-based rate limiting (HMAC-SHA256)

- **Arquivo:** `app/api/chatbot/route.ts:593-594`
- **Status:** TODO comment
- **Risco:** CRÍTICO — Sem proteção contra abuso
- **Fix:** Implementar com `chatbot_usage` table:

  ```typescript
  const ipHash = createHmac('sha256', process.env.IP_HASH_SECRET!).update(clientIp).digest('hex')

  const { count } = await supabase
    .from('chatbot_usage')
    .select('*', { count: 'exact' })
    .eq('ip_hash', ipHash)
    .gte('created_at', yesterday)

  if (count >= 3) return 429
  ```

#### R5.2 — User-based rate limiting

- **Status:** Não implementado
- **Fix:** Depois de auth:

  ```typescript
  const { count } = await supabase
    .from('chatbot_usage')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .gte('created_at', yesterday)

  // Check subscription plan_type
  if (sub?.plan_type === 'free' && count >= 10) return 429
  ```

---

## 6. RLS POLICIES

### ✅ Subscriptions

```sql
-- Users can read own subscription
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Only service role can write (via webhook)
CREATE POLICY "Only service role can manage subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (false);
```

### ⚠️ Bars (potencial problema)

- **Policy:** `Users can read own bars` (via `created_by_user_id`)
- **Verificação pendente:** Testar se um usuário consegue ler/escrever barras alheias

---

## 7. CHECKLIST PELAS RUBRICAS DO CLAUDE.md

### Regras Invioláveis:

- ✅ Nunca comite `.env.local` ✓
- ❌ Nunca use `any` em TypeScript (sem verificação completa)
- ❌ Stripe secret key protegida contra logs (parcial)
- ✅ SUPABASE_SERVICE_KEY não exposto em frontend (Supabase auth role isolation)

### Core Web Vitals & SEO:

- ✅ Páginas SSG rápidas
- ❌ Rate limiting não implementado (impacts availability)

### Rate Limiting & Paywall:

- ❌ Spec do `docs/RATE_LIMIT_SPEC.md` **não implementado**
- 3 queries/dia (anon): PENDENTE
- 10 queries/dia (free): PENDENTE
- Ilimitado (pro): PENDENTE

---

## 8. RELATÓRIO DE TESTES

### Testes Realizados:

```bash
# Auth flow
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
# Esperado: 200 com user data ou 401 com erro

# Chatbot (sem auth)
curl -X POST http://localhost:3000/api/chatbot \
  -H "Content-Type: application/json" \
  -d '{"message":"Como fazer um mojito?"}'
# Esperado: 200 com streaming response (taxa ilimitada — BUG)

# Stripe checkout (sem session)
curl -X POST http://localhost:3000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_123","locale":"pt"}'
# Esperado: 401 (auth required)

# Stripe webhook signature
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "stripe-signature: <invalid>" \
  -d '{...}'
# Esperado: 400 (Invalid signature) ✓
```

### Testes Pendentes:

- [ ] Signup com senha fraca
- [ ] Brute-force login (5 tentativas rápidas)
- [ ] Webhook retry idempotency
- [ ] Webhook replay attack (old timestamp)
- [ ] Rate limit cheats (VPN, spoofed IP)
- [ ] Subscription divergence (webhook fails)

---

## 9. PLANO DE REMEDIAÇÃO

### Prioridade 1 (CRÍTICO) — 1-2 dias

1. **ADD stripe_customer_id coluna**
   - Migration: `009_add_stripe_customer_id.sql`
   - Teste webhook após apply

2. **Implementar feature gating do chatbot**
   - `/api/chatbot` check subscription
   - Teste: free user hit rate limit

3. **Criar Stripe prices com metadata**
   - Dashboard Stripe: 2 prices (monthly, yearly)
   - `price_XXXX` → metadata `plan_type`

### Prioridade 2 (ALTO) — 2-3 dias

4. **Implementar rate limiting**
   - IP-based (anon): 3/dia
   - User-based (free): 10/dia
   - Test suite: chatbot_usage queries

5. **Signup password validation**
   - Min 8 chars, 1 upper, 1 number, 1 symbol
   - Feedback em real-time

6. **Pricing page real**
   - 3 cards (free, pro_monthly, pro_yearly)
   - Botões POST /api/stripe/checkout

### Prioridade 3 (MÉDIO) — 1 semana

7. **Email confirmation**
   - Supabase auth config

8. **Webhook robustness**
   - Max-age validation
   - IP whitelist Stripe
   - Idempotency keys

9. **Sync job**
   - Background: check Stripe API vs DB

---

## 10. CONCLUSÃO

| Área          | Status          | Risco                      | Blocker |
| ------------- | --------------- | -------------------------- | ------- |
| Auth          | ✅ Funcional    | Médio (sem pwd validation) | Não     |
| Segurança     | ⚠️ Parcial      | Alto                       | Não     |
| Stripe        | ❌ Quebrado     | Crítico                    | **SIM** |
| SaaS Features | ❌ Não existe   | Crítico                    | **SIM** |
| Rate Limiting | ❌ Desabilitado | Crítico                    | **SIM** |

**Conclusão:** Sistema não está pronto para produção. Stripe integration está quebrada (falta coluna no schema). Feature gating não existe — **qualquer user consegue usar chatbot ilimitadamente**.

Recomendação: Aplicar Prioridade 1 antes de qualquer deploy.
