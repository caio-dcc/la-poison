# Setup Completo — T-008 e T-009 ✅

**Data:** 2026-05-13  
**Commit:** 615fced

---

## ✅ O que foi feito

### T-008 — PostgreSQL Schema (Supabase SQL Editor)

- Executado DDL completo com 9 tabelas
- Indexes criados para performance
- pgvector extension habilitada

**Tabelas criadas:**

1. `cocktails` (SEO-ready com meta_title*, meta_desc*, description*, history*, fun_fact\*, embedding_vector, view_count)
2. `ingredients`
3. `cocktail_ingredients` (many-to-many)
4. `bars`
5. `inventory_items`
6. `subscriptions` (Stripe integration)
7. `user_drinks` (UGC)
8. `comments`
9. `chatbot_usage` (rate limiting + cost tracking)

### T-009 — Supabase Edge Functions Boilerplate

- Criado `supabase/` com estrutura de funções
- 8 Edge Functions implementadas em Deno/TypeScript:

| Função               | Responsabilidade                                    |
| -------------------- | --------------------------------------------------- |
| `hello`              | Hello World para teste                              |
| `cocktails-crud`     | GET (list/filter), POST (create)                    |
| `ingredients-crud`   | GET (list/filter), POST (create)                    |
| `bars-crud`          | GET (user's bars), POST, PUT, DELETE                |
| `chatbot-rate-limit` | Verifica limite diário (3 anon, 10 free, ∞ pro)     |
| `subscriptions-crud` | GET (check active), POST (from Stripe), PUT, DELETE |
| `chatbot-rag`        | Similarity search em cocktails (vector search)      |
| `chatbot-cache`      | Cache de respostas idênticas (hash-based)           |
| `moderation`         | Auto-approve/flag user_drinks (wordlist)            |

---

## ⚠️ Ação adicional necessária

Execute este SQL em **Supabase SQL Editor** para criar a tabela de cache que `chatbot-cache` função usa:

```sql
CREATE TABLE chatbot_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_chatbot_cache_hash ON chatbot_cache(query_hash);
```

---

## 🎯 Próximo passo

**T-010** está pronto: implementar `scripts/ingest-cocktaildb.ts` para iterar CocktailDB API e baixar ~600 coquetéis.

Após T-010, desbloqueados:

- T-011 (upload imagens para R2)
- T-012 (seed DB com drinks)
- T-013 (enriquecimento via Claude Haiku)
- T-014 (geração de embeddings)

Depois de T-014, começa Phase 2 (SEO pages) com T-020+.

---

## 📝 Notas técnicas

- **Edge Functions** rodam em Deno (não Node.js) — mais rápidas, sem cold start penalizado
- **Rate limiting** usa timestamp diário no UTC — reset em 00:00 UTC
- **RAG** precisa de RPC PostgreSQL `match_cocktails` (criar manualmente ou via trigger)
- **Cache** é simplista (BASE64 hash) — OK para MVP, pode ser Redis depois
- **Moderation** usa hardcoded wordlist — OK para MVP, pode ser ML depois

---

## ✅ Progresso geral

```
Fase 0 — Setup:       ✅ COMPLETE (T-001 a T-009)
Fase 1 — Ingestão:    ⏳ NEXT (T-010 a T-014)
Fase 2 — SEO core:    ⏳ (T-020 a T-029)
Fase 3 — API:         ⏳ (T-030 a T-042)
Fase 4 — Auth+Stripe: ⏳ (T-050 a T-058)
Fase 5 — Chatbot:     ⏳ (T-060 a T-066)
Fase 6 — Engagement:  ⏳ (T-070 a T-074)
Fase 7 — Monetização: ⏳ (T-080 a T-082)
Fase 8 — Deploy:      ⏳ (T-090 a T-097)
```

ETA para MVP: 12 semanas (3 meses) a partir de hoje.
