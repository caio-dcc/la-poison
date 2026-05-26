# Plano de Implementação: Auth, Stripe e SaaS

**Status:** Prioridades 1 e 2 (P1/P2)  
**Estimado:** 3-5 dias para implementação completa

---

## ✅ JÁ IMPLEMENTADO NESTA SESSÃO

### 1. Re-habilitar Rate Limiting (✅ DONE)

- **Arquivo:** `app/api/chatbot/route.ts`
- **Mudança:** Linha 593-594 → chamada real de `checkRateLimit(req)`
- **Retorno:** 429 se limite atingido, com headers X-RateLimit-\*
- **Limites:**
  - Anônimo (IP hash): 3/dia
  - Free user: 10/dia
  - Pro user: ilimitado
- **Testes:** Ver seção 8.1

### 2. Documentar Auditoria Completa (✅ DONE)

- **Arquivo:** `docs/AUDIT_AUTH_STRIPE_SAAS.md`
- **Conteúdo:** 10 seções de problemas, riscos e fixes

---

## 🚧 PENDENTE P1 (CRÍTICO)

### 3. ADD stripe_customer_id coluna (✅ MIGRATION CREATED)

- **Arquivo:** `supabase/migrations/009_add_stripe_customer_id.sql`
- **SQL:** `ALTER TABLE subscriptions ADD COLUMN stripe_customer_id TEXT UNIQUE;`
- **Índice:** `CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);`
- **Manual step:** Usuário deve rodar via Supabase Dashboard SQL Editor
  - Não posso executar via CLI (pooler deprecated)
  - Link: https://supabase.com/dashboard → SQL Editor → copiar migration 009

### 4. Criar Stripe Prices com Metadata (MANUAL)

**Status:** Requer ação manual no Stripe Dashboard

#### Price 1: Pro Monthly

```
Name: Pro Monthly
Currency: BRL
Amount: 19.90 / month
Metadata:
  plan_type: pro_monthly
Product: LaPoison Pro Subscription
```

#### Price 2: Pro Yearly

```
Name: Pro Yearly
Currency: BRL
Amount: 159.00 / year
Metadata:
  plan_type: pro_yearly
Product: LaPoison Pro Subscription
```

**Após criar:**

- Copiar `price_XXXX` IDs
- Adicionar ao `.env.local`:
  ```
  STRIPE_PRICE_MONTHLY=price_XXXX
  STRIPE_PRICE_YEARLY=price_XXXX
  ```

### 5. Criar IP_HASH_SECRET (ENVIRONMENT VAR)

**Status:** Gerar e adicionar ao `.env.local`

```bash
# Gerar 32-byte secret (hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar output e adicionar:
IP_HASH_SECRET=<32-byte hex>
```

### 6. Fix Stripe Checkout (CÓDIGO)

**Arquivo:** `app/api/stripe/checkout/route.ts`

**Problema:** Usa `customer_email` ao invés de recuperar `stripe_customer_id` existente

**Fix:**

```typescript
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getSession()

    if (!data?.session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, locale } = await req.json()
    if (!priceId || !locale) {
      return NextResponse.json({ error: 'Missing priceId or locale' }, { status: 400 })
    }

    const userId = data.session.user.id

    // Check if user already has stripe_customer_id
    let customerId: string | null = null
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(customerId ? { customer: customerId } : { customer_email: data.session.user.email }),
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/${locale}/pricing?success=1`,
      cancel_url: `${baseUrl}/${locale}/pricing?canceled=1`,
      subscription_data: {
        trial_period_days: 7,
        metadata: { user_id: userId },
      },
      idempotency_key: `${userId}-${priceId}-${Date.now()}`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
```

### 7. Fix Stripe Webhook (CÓDIGO)

**Arquivo:** `app/api/stripe/webhook/route.ts`

**Problemas:**

1. Não valida timestamp do evento (replay attack)
2. plan_type mapping está errado (espera metadata que não existe)

**Fix:**

```typescript
// Add timestamp validation
const maxAge = 5 * 60 * 1000 // 5 minutes
const eventTime = event.created * 1000
if (Date.now() - eventTime > maxAge) {
  console.warn('Webhook event too old, ignoring:', event.type)
  return NextResponse.json({ received: true })
}

// Fix plan_type mapping
case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  // Deterministically map price to plan_type
  const priceId = subscription.items.data[0]?.price.id
  let planType = 'unknown'

  if (priceId === process.env.STRIPE_PRICE_MONTHLY) {
    planType = 'pro_monthly'
  } else if (priceId === process.env.STRIPE_PRICE_YEARLY) {
    planType = 'pro_yearly'
  }

  // ... rest of update logic
}
```

---

## 🚧 PENDENTE P2 (ALTO)

### 8. Implementar Real Pricing Page (CÓDIGO)

**Arquivo:** `app/[locale]/pricing/page.tsx`

**Mudança:** De placeholder para cards com CTA

```typescript
export default async function PricingPage({ params }: ...) {
  const { locale } = await params
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt

  // Render 3 pricing cards with buttons
  // Card 1: Free (current plan for anons) → Login button
  // Card 2: Pro Monthly (R$19.90) → "Subscribe" button → POST /api/stripe/checkout
  // Card 3: Pro Yearly (R$159) → "Save 33%" badge

  // Each card has features list, monthly-to-annual savings calc
}
```

### 9. Password Validation (CÓDIGO)

**Arquivo:** `src/components/auth/SignupForm.tsx`

**Mudança:** Adicionar validação real-time

```typescript
const validatePassword = (pwd: string) => {
  const errors: string[] = []
  if (pwd.length < 8) errors.push('Min 8 characters')
  if (!/[A-Z]/.test(pwd)) errors.push('Need 1 uppercase')
  if (!/[0-9]/.test(pwd)) errors.push('Need 1 number')
  if (!/[!@#$%^&*]/.test(pwd)) errors.push('Need 1 symbol')
  return errors
}

// Show feedback real-time
```

### 10. Webhook Robustness (CÓDIGO)

**Arquivo:** `app/api/stripe/webhook/route.ts`

**Adicionar:**

- IP whitelist Stripe (162.125.0.0/16)
- Idempotency (dedupe by event.id)
- Max-age validation (já em P1)

---

## 📋 ENVIRONMENT VARIABLES NECESSÁRIAS

### .env.local (já devem estar lá)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GROQ_API_KEY=...
```

### .env.local (ADICIONAR)

```
IP_HASH_SECRET=<32-byte hex from node command>
STRIPE_PRICE_MONTHLY=price_XXXX
STRIPE_PRICE_YEARLY=price_XXXX
```

---

## 🧪 TESTES MANUAL

### T1: Rate Limiting Habilitado

```bash
# 1. Abrir 3 abas anônimas (diferentes IPs simulados)
# 2. Enviar 4 chatbot messages da mesma aba
# Esperado: 4ª message retorna 429

# 3. Login com user free
# 4. Enviar 11 messages
# Esperado: 11ª retorna 429

# 5. Login com user pro
# 6. Enviar 100+ messages
# Esperado: Todas passam
```

### T2: Stripe Checkout Flow

```bash
# 1. Login como user
# 2. Navegar para /pt/pricing
# 3. Clicar "Subscribe Pro Monthly"
# Esperado: Redireciona para Stripe checkout

# 4. Simular Stripe test card (4242 4242 4242 4242)
# 5. Concluir checkout
# Esperado:
#   - Webhook `/api/stripe/webhook` chamado
#   - Tabela `subscriptions` atualizada com:
#     - user_id: [login user id]
#     - stripe_customer_id: cus_XXXX
#     - stripe_subscription_id: sub_XXXX
#     - status: active
#     - plan_type: pro_monthly
```

### T3: Feature Gating

```bash
# 1. Login como user free
# 2. Enviar 10 chatbot messages
# 3. 11ª message
# Esperado: 429 Rate limit exceeded

# 4. Upgrade para pro
# 5. Enviar 100+ messages
# Esperado: Todas passam (ilimitado)
```

### T4: Password Validation

```bash
# 1. Signup form
# 2. Digitar password "123"
# Esperado: Erros em tempo real (Min 8 chars, uppercase, etc.)

# 3. Digitar "ValidP@ss123"
# Esperado: Validação passa, botão ativo
```

---

## 📅 TIMELINE SUGERIDA

| Day       | Tarefa                                         | Estimado      |
| --------- | ---------------------------------------------- | ------------- |
| 1         | Aplicar migration 009 (manual Supabase)        | 5min          |
| 1         | Criar Stripe prices (manual Stripe)            | 15min         |
| 1         | Gerar IP_HASH_SECRET e .env updates            | 5min          |
| 1-2       | Fix Stripe checkout (código + test)            | 2h            |
| 1-2       | Fix Stripe webhook (código + test)             | 2h            |
| 2-3       | Rate limiting test manual                      | 1h            |
| 3         | Pricing page real (design + código)            | 4h            |
| 3         | Password validation (código + test)            | 1h            |
| 3-4       | Webhook robustness (IP whitelist, idempotency) | 2h            |
| 4         | Full e2e test (signup → upgrade → chatbot)     | 2h            |
| **Total** |                                                | **~18 horas** |

---

## 🎯 ACCEPTANCE CRITERIA

### AC1: Rate Limiting

- [ ] Anonymous users: 3 queries/dia
- [ ] Free users: 10 queries/dia
- [ ] Pro users: ilimitado
- [ ] 429 response com headers corretos

### AC2: Stripe Integration

- [ ] stripe_customer_id salvo no webhook
- [ ] plan_type determinístico (monthly vs yearly)
- [ ] Checkout redireciona para Stripe
- [ ] Webhook processa 3 eventos

### AC3: Feature Gating

- [ ] Free users bloqueados após limite
- [ ] Pro users ilimitados
- [ ] Trial accounts tratados como pro

### AC4: Pricing Page

- [ ] 3 cards (Free, Pro Monthly, Pro Yearly)
- [ ] CTA buttons funcionais
- [ ] Links corretos para checkout

### AC5: Security

- [ ] Password validation mínima
- [ ] Webhook signature validation
- [ ] IP whitelist Stripe
- [ ] No secrets em logs

---

## 🚨 BLOQUEADORES IDENTIFICADOS

1. **Migration 009 não pode ser rodada via CLI**
   - Supabase Cloud pooler deprecated
   - Solução: Usuário copia SQL no Dashboard

2. **Stripe prices sem metadata**
   - Prices precisam ser criadas no Stripe Dashboard
   - Solução: Usuário cria via UI

3. **IP_HASH_SECRET não gerado**
   - Necessário antes de habilitar rate limiting
   - Solução: Gerar via Node.js

---

## 🔗 LINKS ÚTEIS

- Supabase Dashboard: https://supabase.com/dashboard
- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Webhook Events: https://dashboard.stripe.com/webhooks
- Stripe Price Creation: https://dashboard.stripe.com/products?type=service

---

## PRÓXIMOS PASSOS (APÓS ESTA SESSÃO)

1. **Usuário:** Aplicar migration 009 no Supabase Dashboard
2. **Usuário:** Criar 2 Stripe prices com metadata
3. **Usuário:** Gerar e adicionar IP_HASH_SECRET
4. **Claude:** Implementar os P1 fixes de checkout e webhook
5. **Claude:** Teste manual completo
6. **Usuário:** Feedback e approval para P2 (pricing page, password validation)
