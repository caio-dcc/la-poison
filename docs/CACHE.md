# docs/CACHE.md — Decisões arquiteturais

> **LEIA ANTES DE PERGUNTAR.** Toda decisão registrada aqui já foi tomada.
> Reduz tokens em sessões futuras evitando re-discussão.

---

## 2026-05-12 — Stack base do projeto

**Contexto:** definir framework, banco, auth, payments e AI para o relançamento do MVP original como SaaS SEO-first.

**Decisão:** Next.js 14 App Router + TypeScript strict + Tailwind + shadcn/ui + PostgreSQL (Supabase) + Stripe + Cloudflare R2 + Claude Haiku + Vercel. ~~Prisma~~ → substituído por Supabase Edge Functions (vide decisão 2026-05-13).

**Alternativas consideradas:**

- React Native + FastAPI → descartado: zero SEO, app na Play Store não captura buscas orgânicas
- Astro → descartado: chatbot streaming + auth interativa exigem React no edge
- Neon ao invés de Supabase → descartado: Supabase entrega DB + Auth + Storage no mesmo painel
- Gemini Flash ao invés de Claude Haiku → cacheado abaixo

**Trade-offs aceitos:**

- Vercel Hobby tem limite de execução (10s função serverless) — chatbot streaming precisa caber nisso ou migrar para Edge runtime
- Supabase free tier 500MB do DB — suficiente para anos no início

---

## 2026-05-12 — Provider de IA: Claude Haiku

**Contexto:** chatbot precisa responder perguntas sobre coquetéis com baixo custo + alta qualidade + latência baixa.

**Decisão:** Claude Haiku como provider primário do chatbot, com `prompt caching` da Anthropic para reduzir custo de contexto compartilhado.

**Alternativas consideradas:**

- Gemini 2.0 Flash → similar em custo, mas Anthropic tem prompt caching mais barato para esse caso
- GPT-4o-mini → mais caro por token, sem vantagem clara
- Modelo open-source self-hosted → infra adicional não justifica nesse estágio

**Trade-offs aceitos:**

- Vendor lock-in com Anthropic — mitigado por abstração `src/lib/ai/provider.ts`

---

## 2026-05-12 — Embeddings locais (sem API)

**Contexto:** RAG para "quais drinks posso fazer com X, Y, Z" precisa de embeddings de ~600 coquetéis.

**Decisão:** `@xenova/transformers` rodando no servidor com modelo `Xenova/all-MiniLM-L6-v2` (384 dims). Embeddings gerados uma vez em build-time e armazenados como `Bytes` no campo `Cocktail.embeddingVector`. Busca por cosine similarity em memória.

**Alternativas consideradas:**

- OpenAI embeddings API → custo recorrente sem necessidade
- pgvector → over-engineering para 600 vetores; adicionar quando passar de 10k itens
- Pinecone/Weaviate → idem

**Trade-offs aceitos:**

- Carga de modelo no cold start (~200ms) — aceitável; pode-se mover para serviço separado depois

---

## 2026-05-12 — SSG para páginas de drink

**Contexto:** decidir entre SSG, ISR ou SSR para `/drinks/[slug]`.

**Decisão:** SSG com `generateStaticParams` em build-time. Revalidação via ISR (`revalidate: 86400`) para conteúdo enriquecido novo.

**Justificativa:** SSG entrega HTML estático do CDN da Vercel — LCP < 1s, melhor possível para SEO. ISR garante que novos drinks e enrichments via IA apareçam sem rebuild manual.

**Alternativas consideradas:**

- SSR puro → LCP 1.5–2s, dependente de banco no request — pior para SEO
- CSR → catastrófico para SEO (não negociável)

**Trade-offs aceitos:**

- Build time mais longo quando passar de 1k drinks — mitigar com `dynamicParams: true` + ISR

---

## 2026-05-12 — Pricing do chatbot SaaS

**Contexto:** monetização via freemium gated chatbot.

**Decisão:**

- Anônimo (IP): 3 queries/dia
- Logado free: 10 queries/dia
- Pro mensal: R$19,90 — ilimitado
- Pro anual: R$159 — ilimitado (33% off, atrai retenção)
- Trial: 7 dias grátis no primeiro acesso ao Pro

**Justificativa:** preço alinhado com SaaS de hobby/lifestyle no Brasil (Spotify Premium R$21,90, Duolingo Super R$19,90). Cauda longa de pessoas que cozinham/curtem coquetel.

**Trade-offs aceitos:**

- Conversão estimada conservadora: 0,5–2% dos usuários ativos viram Pro
- Custo de churn alto típico de SaaS de lazer — mitigar com email de retenção

---

## 2026-05-12 — Compatibilidade com MVP original

**Contexto:** o repositório https://github.com/caio-dcc/the-drinking-man tem schema Prisma com `User`, `Bar`, `Cocktail`, `Ingredient`, `CocktailIngredient`, `InventoryItem` e API REST documentada.

**Decisão:** preservar 100% dos modelos originais e endpoints. Adicionar novos modelos sem quebrar os existentes. Endpoints mapeiam 1:1 da spec original.

**Justificativa:** permite migração de dados se houver usuários do MVP, e mantém clients existentes funcionando.

---

## 2026-05-13 — Remover Prisma, usar Supabase Edge Functions

**Contexto:** Prisma v7 CLI falha ao conectar em PostgreSQL direto (P1001) via rede. REST API do Supabase funciona normalmente. Prisma adicionaria overhead de ORM sem valor agregado em um projeto serverless.

**Decisão:** Remover Prisma completamente. Usar:

- **SQL direto** no Supabase SQL Editor para criar schema
- **Supabase Edge Functions (Deno)** para CRUD operations
- **Tipagem manual (TypeScript)** das respostas de queries
- **Supabase Client (`@supabase/supabase-js`)** no frontend para queries simples

**Alternativas consideradas:**

- Manter Prisma + usar Supabase Data API → Prisma v7 não suporta Data API, exigiria downgrade v5
- Usar node-postgres direto → reinventar CRUD patterns; Edge Functions já entregam isso
- Usar Drizzle ORM → overhead desnecessário para essa escala; SQL direto é mais claro

**Trade-offs aceitos:**

- Sem migrations automáticas — schema é versionado como SQL em `supabase/migrations/`
- Queries mais verbosas (SQL direto vs Prisma query builder) — mitigado por type safety via TypeScript interfaces e comentários
- Sem auto-completion de campos — compensado por comentários em Edge Functions

**Benefícios:**

- ✅ Zero problemas de conexão (Supabase REST sempre funciona)
- ✅ Edge Functions rodam no Supabase (serverless nativo, não em Vercel)
- ✅ Embeddings e RAG armazenados em `vector` PostgreSQL (pgvector built-in)
- ✅ Queries otimizadas manualmente para SEO/cache
- ✅ Reduz build time (sem compilação Prisma)

---

## 2026-05-13 — Modelagem i18n de ingredientes e categorias

**Contexto:** CocktailDB oferece dados em EN; precisamos PT/EN/ES com filtros, SEO e chatbot funcional em 3 idiomas. Ingredientes e categorias são reutilizados massivamente.

**Decisão:**

- **Cocktails (long-form content):** Colunas i18n na tabela (`name_pt`, `name_en`, `description_pt`, `description_en`, `history_pt`, etc.)
- **Ingredients/Categories (reutilizado):** JSONB `name_i18n: {pt: "", en: "", es: ""}` com GIN index para queries rápidas
- **Slugs:** Global único (`slug TEXT UNIQUE`) — não traduzido. URL `/drinks/caipirinha` em qualquer idioma (melhor SEO + compartilhamento)
- **Traduções ingredientes:** Dicionário manual dos ~100 ingredientes top (PT/ES) curado à mão + Claude Haiku em batch pra restante na T-013
- **Full-text search:** `tsvector` gerado por idioma (`search_doc_pt`, `search_doc_en`, `search_doc_es`) com GIN index
- **Flavor/occasion tags:** `flavor_tags TEXT[]` + `occasion_tags TEXT[]` para filtros facetados
- **ABV/dificuldade/tempo:** Colunas dedicadas (`abv_estimate FLOAT`, `difficulty INT`, `prep_time_minutes INT`)
- **Medidas normalizadas:** `amount_ml DECIMAL` + `unit_original TEXT` (preserva "1 oz" original) + `measure_text TEXT` (display)
- **UI:** Selector de idioma (bandeiras PT/EN/ES) em navbar de todas as rotas, persistido em localStorage, default = browser language ou PT

**Alternativas consideradas:**

- Tabela `translations` poliglota separada → mais normalizado, mas JOIN overhead. Rejeitado.
- Colunas por idioma em tudo → explosion de colunas. Rejeitado.
- Apenas EN + API externo pra tradução → latência inaceitável. Rejeitado.

**Trade-offs aceitos:**

- JSONB é leve overhead vs tabela separada, mas queries diretas e GIN index compensa
- Dicionário manual é curadoria inicial, mas escalável via Haiku na T-013
- Slug global: URL nunca muda (melhor SEO), conteúdo muda via idioma em localStorage

---

## TEMPLATE PARA NOVAS DECISÕES

```markdown
## YYYY-MM-DD — Título conciso

**Contexto:** o problema que motivou a decisão.

**Decisão:** o que foi escolhido (frase clara).

**Alternativas consideradas:**

- Opção A → por que descartada
- Opção B → por que descartada

**Trade-offs aceitos:**

- Custo X em troca de benefício Y
```
