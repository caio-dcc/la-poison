# docs/RATE_LIMIT_SPEC.md — Chatbot Rate Limiting & Paywall

> Spec do rate limiting do chatbot. Consultada pela task T-061.

---

## Regra de Negócio

| Tier                           | Limite         | Identificação                          |
| ------------------------------ | -------------- | -------------------------------------- |
| Anônimo                        | 3 queries/dia  | HMAC-SHA256 do IP com `IP_HASH_SECRET` |
| Usuário grátis (logado)        | 10 queries/dia | `auth.uid()`                           |
| Pro (R$19,90/mês ou R$159/ano) | Ilimitado      | `subscriptions.status = 'active'`      |

- Reset diário em **00:00 UTC**
- Implementar com tabela `chatbot_usage` (fallback) ou Upstash Redis (10k commands/dia free)

---

## Verificação obrigatória em `POST /api/chatbot`

```typescript
import { createHmac } from 'crypto'

function hashIp(ip: string): string {
  return createHmac('sha256', process.env.IP_HASH_SECRET!).update(ip).digest('hex')
}

async function checkRateLimit(req: Request) {
  const session = await getServerSession()
  const isPro = await checkActiveSubscription(session?.user?.id)

  if (isPro) return { allowed: true }

  const identifier = session?.user?.id ?? hashIp(getClientIp(req))
  const limit = session ? 10 : 3

  const usage = await getDailyUsage(identifier)

  if (usage >= limit) {
    return {
      allowed: false,
      error: 'limit_reached',
      upgradeUrl: '/pricing',
      remaining: 0,
    }
  }

  return { allowed: true, remaining: limit - usage }
}
```

---

## Headers de resposta

Sempre incluir nos responses do chatbot:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1716163200 (timestamp UTC do próximo reset)
```

---

## Resposta 429

```json
{
  "error": "limit_reached",
  "message": "Você atingiu o limite diário. Faça upgrade para Pro para uso ilimitado.",
  "upgradeUrl": "/pricing",
  "resetAt": "2026-05-14T00:00:00Z"
}
```

---

## Alterações nesta spec

Registrar em `docs/CACHE.md` antes de modificar limites ou lógica.
