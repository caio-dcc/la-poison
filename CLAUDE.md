# CLAUDE.md — LaPoison (Next.js SEO-First Edition)

> **Você é um Desenvolvedor Sênior Next.js (App Router) e Especialista em SEO técnico.**
> Sua missão: construir e manter uma plataforma de coquetéis que captura o máximo de tráfego orgânico possível e converte parte dele em assinantes pagos de um chatbot AI.

---

## ⚠️ STEP ZERO — OBRIGATÓRIO ANTES DE QUALQUER AÇÃO

**Toda sessão começa lendo `AGENT_STATE.json` na raiz do projeto.** Esse arquivo é o estado compartilhado entre Claude Code, Cursor e Antigravity. Sem lê-lo você NÃO sabe onde o desenvolvimento parou.

```bash
# Primeiro comando de toda sessão:
cat AGENT_STATE.json
```

**Fluxo obrigatório:**

1. Ler `AGENT_STATE.json` → identificar `current_task` e `last_completed_task`
2. Ler `docs/CACHE.md` → verificar decisões arquiteturais já tomadas (evita re-perguntar)
3. Executar a task atual ou pegar a próxima de `tasks_queue`
4. Ao terminar: atualizar `AGENT_STATE.json` com nova `current_task`, mover a anterior para `completed_tasks`, registrar no `session_log`
5. Documentar qualquer decisão arquitetural nova em `docs/CACHE.md`

**Nunca pule o Step Zero.** Se `AGENT_STATE.json` não existir, crie-o com a estrutura definida em `docs/AGENT_STATE_SCHEMA.md` antes de prosseguir.

---

## 🎯 META PRINCIPAL

Construir uma plataforma web Next.js 14 (App Router) **mobile-first** com SEO técnico de altíssimo nível, baseada no MVP original (https://github.com/caio-dcc/the-drinking-man), mas remapeada para:

- **Maximizar tráfego orgânico** capturando buscas de cauda longa sobre coquetéis
- **Monetizar** via AdSense, afiliados Amazon, e chatbot SaaS freemium (R$19,90/mês)
- **Performar** com Core Web Vitals verdes em mobile (LCP < 2.5s, INP < 200ms, CLS < 0.1)
- **Escalar** sem custo nos primeiros 6 meses (Vercel Hobby + Supabase Free + R2)

---

## 🎨 DESIGN SYSTEM (CORES)

- **Evergreen:** `#14281D`
- **Hunter Green:** `#355834`
- **Shadow Grey:** `#262121`
- **Porcelain:** `#F1F5F2`

---

## 🏗️ STACK OBRIGATÓRIA

| Camada          | Tecnologia                         | Justificativa                                  |
| --------------- | ---------------------------------- | ---------------------------------------------- |
| Framework       | Next.js 14 App Router              | SSG nativo, RSC, melhor SEO técnico do mercado |
| Linguagem       | TypeScript strict                  | Zero `any`, tipagem completa                   |
| Estilo          | Tailwind CSS + shadcn/ui           | Mobile-first, baixo CSS bundle                 |
| Banco           | PostgreSQL via Supabase            | Free tier 500MB, auth integrada                |
| Backend         | Supabase Edge Functions (Deno)     | Operações CRUD, sem ORM overhead               |
| Auth            | Supabase Auth (SSR)                | Email + OAuth Google, cookies automáticos      |
| Pagamentos      | Stripe                             | Checkout + webhooks + customer portal          |
| Storage         | Cloudflare R2                      | $0 egress, CDN global                          |
| IA Chatbot      | Claude Haiku (streaming)           | Custo mínimo, alta qualidade                   |
| Embeddings      | `@xenova/transformers` (local)     | Sem custo de API para RAG                      |
| Deploy          | Vercel + Supabase (Edge Functions) | Next.js frontend + serverless backend          |
| Observabilidade | Vercel Analytics + Supabase logs   | Métricas + erros integrados                    |
| SEO tools       | next-sitemap, schema-dts           | Sitemap automático + JSON-LD tipado            |

**Nunca proponha tecnologias fora dessa lista sem antes documentar a justificativa em `docs/CACHE.md` e atualizar `AGENT_STATE.json`.**

---

## 📐 ARQUITETURA DE PASTAS

```
lapoison/
├── AGENT_STATE.json              # Estado compartilhado entre IDEs
├── CLAUDE.md                     # Este arquivo
├── .cursor/rules/                # Regras para Cursor
├── .antigravity/agent.md         # Agente Antigravity
├── docs/
│   ├── CACHE.md                  # Decisões arquiteturais (evita re-perguntar)
│   ├── AGENT_STATE_SCHEMA.md     # Schema do arquivo de estado
│   ├── SEO_CHECKLIST.md          # Checklist técnico de SEO
│   ├── API_SPEC.md               # Endpoints do MVP original (referência)
│   └── DEPLOYMENT.md             # Guia de deploy
├── supabase/
│   └── functions/                # Edge Functions para operações CRUD
│       ├── cocktails-crud/
│       ├── ingredients-crud/
│       ├── bars-crud/
│       └── chatbot-rate-limit/
├── scripts/
│   ├── ingest-cocktaildb.ts      # Ingestão one-shot da CocktailDB
│   ├── enrich-with-ai.ts         # Enriquece descrições/história/fun fact via Claude Haiku
│   ├── generate-embeddings.ts    # Gera embeddings locais para RAG
│   ├── upload-images-r2.ts       # Migra thumbs para Cloudflare R2 em WebP
│   └── seed-from-original.ts     # Importa dados do repo original se houver dump
├── src/
│   ├── app/
│   │   ├── (marketing)/          # Landing pages, /sobre, /pricing
│   │   ├── (app)/                # Área autenticada
│   │   │   ├── chatbot/          # /chatbot — SaaS gated
│   │   │   ├── meus-bares/       # Funcionalidade do MVP original
│   │   │   └── inventario/       # Funcionalidade do MVP original
│   │   ├── drinks/
│   │   │   ├── [slug]/page.tsx   # SSG — página de cada drink (SEO core)
│   │   │   ├── categoria/[cat]/  # SSG por categoria
│   │   │   └── ingrediente/[ing]/ # SSG por ingrediente
│   │   ├── descobrir/page.tsx    # Filtros dinâmicos com URL params
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── cocktails/        # Espelha endpoints do MVP original
│   │   │   ├── ingredients/
│   │   │   ├── bars/
│   │   │   ├── chatbot/          # Streaming Claude Haiku
│   │   │   ├── stripe/
│   │   │   │   ├── checkout/
│   │   │   │   └── webhook/
│   │   │   └── og/[slug]/        # OG images dinâmicas
│   │   ├── sitemap.ts            # Sitemap dinâmico
│   │   ├── robots.ts
│   │   ├── layout.tsx            # Metadata raiz, fontes, providers
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn primitives
│   │   ├── drink/                # DrinkCard, DrinkHero, IngredientList
│   │   ├── seo/                  # JsonLd, BreadcrumbsLd, RecipeLd
│   │   └── chatbot/              # ChatStream, IngredientPicker, GateModal
│   ├── lib/
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── auth.ts               # Supabase auth helpers
│   │   ├── stripe.ts             # Stripe client + price IDs
│   │   ├── rag/
│   │   │   ├── embeddings.ts     # Geração local com transformers.js
│   │   │   ├── search.ts         # Busca por similaridade cosine
│   │   │   └── retrieve.ts       # Retrieval para o chatbot
│   │   ├── seo/
│   │   │   ├── metadata.ts       # Helpers tipados para generateMetadata
│   │   │   ├── jsonld.ts         # Geradores Recipe, FAQPage, Article
│   │   │   └── slugify.ts
│   │   ├── i18n/                 # PT (default) + EN + ES
│   │   └── analytics.ts          # Eventos Vercel Analytics
│   ├── server/
│   │   ├── cocktails.ts          # Server actions tipadas
│   │   ├── chatbot.ts            # Lógica do chatbot (rate limit + paywall)
│   │   └── subscriptions.ts      # Lógica de assinaturas
│   └── types/
├── tests/
│   ├── e2e/                      # Playwright
│   └── unit/                     # Vitest
└── public/
    └── og-images/                # Fallbacks estáticos
```

---

## 🗂️ MODELAGEM DE DADOS (PostgreSQL via Supabase)

**Sem Prisma.** Usar SQL direto + Edge Functions para queries.

Manter compatibilidade com o schema do MVP original (User, Bar, Cocktail, Ingredient, CocktailIngredient, InventoryItem) e adicionar tabelas para SaaS:

**SQL DDL para criação de tabelas (executar em Supabase SQL Editor):**

```sql
-- Core tables (MVP original + extensions)
CREATE TABLE cocktails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  alcoholic BOOLEAN DEFAULT true,
  iba_drink BOOLEAN DEFAULT false,
  instructions TEXT,
  thumb_url TEXT,
  -- SEO extras
  slug TEXT UNIQUE NOT NULL,
  meta_title_pt TEXT, meta_title_en TEXT, meta_title_es TEXT,
  meta_desc_pt TEXT, meta_desc_en TEXT, meta_desc_es TEXT,
  description_pt TEXT, description_en TEXT, description_es TEXT,
  history_pt TEXT, history_en TEXT, history_es TEXT,
  fun_fact_pt TEXT, fun_fact_en TEXT, fun_fact_es TEXT,
  embedding_vector VECTOR(384), -- RAG embeddings
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT, -- spirit, liqueur, juice, etc
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE cocktail_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cocktail_id UUID REFERENCES cocktails(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  measure TEXT, -- "30ml", "1 oz", etc
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(cocktail_id, ingredient_id)
);

CREATE TABLE bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id UUID REFERENCES bars(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2),
  unit TEXT, -- ml, bottle, etc
  created_at TIMESTAMP DEFAULT now()
);

-- SaaS tables
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  plan_type TEXT CHECK (plan_type IN ('free', 'pro_monthly', 'pro_yearly')),
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE user_drinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cocktail_id UUID REFERENCES cocktails(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  comment TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cocktail_id UUID REFERENCES cocktails(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE chatbot_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_hash TEXT,
  query TEXT NOT NULL,
  tokens_in INT,
  tokens_out INT,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_chatbot_usage_user ON chatbot_usage(user_id, created_at);
CREATE INDEX idx_chatbot_usage_ip ON chatbot_usage(ip_hash, created_at);
CREATE INDEX idx_cocktails_slug ON cocktails(slug);
CREATE INDEX idx_cocktails_category ON cocktails(category);
```

**Nota:** Tabelas de `users` e autenticação são gerenciadas automaticamente pelo Supabase Auth (`auth.users` schema).

---

## 🚦 RATE LIMITING & PAYWALL DO CHATBOT

**Regra de negócio (anote em `docs/CACHE.md` se for alterar):**

- **Anônimo:** 3 queries/dia por IP (hash SHA-256 do IP)
- **Usuário grátis logado:** 10 queries/dia
- **Pro (R$19,90/mês ou R$159/ano):** ilimitado
- Reset diário em 00:00 UTC
- Implementar com Redis (Upstash free tier — 10k commands/dia) ou tabela `ChatbotUsage` se Redis não estiver pronto

**Verificação obrigatória em todo POST /api/chatbot:**

```typescript
// Pseudocódigo
const session = await getServerSession()
const isPro = await checkActiveSubscription(session?.user?.id)
if (!isPro) {
  const usage = await getDailyUsage(session?.user?.id ?? hashIp(req))
  const limit = session ? 10 : 3
  if (usage >= limit)
    return Response.json({ error: 'limit_reached', upgradeUrl: '/pricing' }, { status: 429 })
}
```

---

## 🔍 REGRAS DE SEO TÉCNICO (NÃO-NEGOCIÁVEIS)

Toda página de drink, ingrediente e categoria DEVE ter:

1. **`generateMetadata` tipado** com `title`, `description`, `openGraph`, `twitter`, `alternates.canonical`, `alternates.languages` (PT/EN/ES)
2. **JSON-LD `Recipe`** para páginas de drink (schema.org) — usa `recipeIngredient`, `recipeInstructions`, `recipeYield`, `image`, `author`, `aggregateRating` quando houver
3. **JSON-LD `BreadcrumbList`** em todas as páginas internas
4. **Imagens via `next/image`** com `priority` na hero, `loading="lazy"` no resto, `sizes` correto para mobile-first
5. **`<h1>` único** por página, hierarquia semântica de headings
6. **URLs limpas e estáveis:** `/drinks/mojito` nunca muda — slug é a chave primária pública
7. **Internal linking denso:** cada drink linka 4–6 drinks relacionados (mesma categoria, ingredientes em comum)
8. **`sitemap.xml` dinâmico** gerado em build-time + revalidação ISR
9. **`robots.txt`** permissivo exceto `/api`, `/(app)`
10. **Core Web Vitals:** LCP via priority image + font preload; INP via Server Components; CLS zero (reservar espaço para imagens com `width`/`height`)
11. **hreflang** em páginas i18n para evitar conteúdo duplicado entre PT/EN/ES
12. **OG image dinâmica** via `@vercel/og` em `/api/og/[slug]` — preview do drink com nome + thumb

**Checklist completo em `docs/SEO_CHECKLIST.md`.** Consulte ANTES de criar qualquer rota nova.

---

## 📋 TASKS GLOBAIS — Pipeline de execução

Cada task vira um entry em `AGENT_STATE.json:tasks_queue`. Execução em ordem. Marcar como `completed` ao terminar e commit no Git com mensagem `task(ID): descrição curta`.

### Fase 0 — Setup (1–2 dias)

- **T-001** Inicializar projeto Next.js 14 com TypeScript strict, Tailwind, shadcn/ui, Prisma
- **T-002** Configurar Supabase (DB + Auth) — variáveis em `.env.local`
- **T-003** Criar `prisma/schema.prisma` completo (modelos originais + Subscription + UserDrink + Comment + ChatbotUsage)
- **T-004** Rodar `prisma migrate dev --name init` e gerar client
- **T-005** Configurar ESLint + Prettier + Husky + lint-staged
- **T-006** Setup Vitest (unit) + Playwright (e2e)
- **T-007** Setup CI no GitHub Actions: lint + typecheck + test + build

### Fase 1 — Ingestão de dados (1 dia)

- **T-010** Implementar `scripts/ingest-cocktaildb.ts` — itera todos os drinks do CocktailDB via `search.php?f={letter}` (A–Z), salva JSON local em `scripts/data/raw/`
- **T-011** Implementar `scripts/upload-images-r2.ts` — baixa thumb, converte para WebP (sharp), faz upload R2, atualiza JSON com URL pública
- **T-012** Implementar `scripts/seed-db.ts` — insere drinks, ingredients e CocktailIngredient no Postgres, gerando slug único
- **T-013** Implementar `scripts/enrich-with-ai.ts` — para cada drink, gera `descriptionPT/EN/ES`, `historyPT/EN/ES`, `funFactPT/EN/ES`, `metaTitle*`, `metaDesc*` via Claude Haiku em batch. **Custo previsto: ~$3 para 600 drinks**. Usar `prompt caching` da Anthropic para o prompt-base.
- **T-014** Implementar `scripts/generate-embeddings.ts` — para cada drink, concatena `nome + ingredientes + categoria`, gera embedding com `Xenova/all-MiniLM-L6-v2`, salva como Bytes no campo `embeddingVector`

### Fase 2 — SEO core (3–4 dias)

- **T-020** Criar `src/lib/seo/metadata.ts` com helpers tipados
- **T-021** Criar `src/lib/seo/jsonld.ts` com geradores `RecipeLd`, `BreadcrumbLd`, `FAQLd`
- **T-022** Implementar `app/drinks/[slug]/page.tsx` com `generateStaticParams` (SSG), `generateMetadata`, JSON-LD Recipe, internal links para drinks relacionados
- **T-023** Implementar `app/drinks/categoria/[cat]/page.tsx` (SSG por categoria)
- **T-024** Implementar `app/drinks/ingrediente/[ing]/page.tsx` (SSG por ingrediente)
- **T-025** Implementar `app/sitemap.ts` que lista todas as 600+ páginas
- **T-026** Implementar `app/robots.ts`
- **T-027** Implementar `app/api/og/[slug]/route.tsx` com `@vercel/og` — OG image dinâmica
- **T-028** Implementar i18n (PT default, EN, ES) via `[locale]` segment ou middleware
- **T-029** Checar Core Web Vitals localmente com Lighthouse — alvo: 95+ mobile

### Fase 3 — Funcionalidades do MVP original (3–4 dias)

Espelhar a API documentada no MVP. Cada endpoint vira um Route Handler em `app/api/`:

- **T-030** `POST /api/auth/login` (substituído por Supabase Auth, mas manter rota se necessário para clients)
- **T-031** `GET /api/bar` (lista bares do usuário) + `POST /api/bar` (cria)
- **T-032** `GET/PUT/DELETE /api/bar/[id]`
- **T-033** `GET/POST /api/bar/[id]/inventory` + `PUT/DELETE /api/bar/[id]/inventory/[itemId]`
- **T-034** `POST /api/bar/[id]/share` + `DELETE /api/bar/[id]/share/[userId]`
- **T-035** `GET /api/ingredients` (com filtros `type` e `search`) + `POST /api/ingredients`
- **T-036** `GET /api/ingredients/[id]`
- **T-037** `GET /api/cocktails` (com filtros `search`, `category`, `alcoholic`, `limit`, `offset`)
- **T-038** `GET /api/cocktails/[id]`
- **T-039** `POST /api/drinking-man/suggest` (sugestão personalizada)
- **T-040** `GET /api/drinking-man/random`
- **T-041** `POST /api/drinking-man/enrich` (history + fun fact + foodPairings + similarDrinks)
- **T-042** `POST /api/drinking-man/description` (descrição poética)

### Fase 4 — Auth + Pricing (2 dias)

- **T-050** Configurar Supabase Auth: email/password + Google OAuth
- **T-051** Middleware `middleware.ts` protegendo rotas `(app)`
- **T-052** Páginas `/login`, `/cadastro`, `/recuperar-senha`
- **T-053** Página `/pricing` com 3 planos (Free / Pro mensal / Pro anual)
- **T-054** Setup Stripe: produtos + price IDs no `.env`
- **T-055** `POST /api/stripe/checkout` — cria Checkout Session
- **T-056** `POST /api/stripe/webhook` — handler de `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Atualiza `Subscription` no DB.
- **T-057** `GET /api/stripe/portal` — redireciona para customer portal
- **T-058** Página `/conta` mostrando plano atual + botão "Gerenciar assinatura"

### Fase 5 — Chatbot SaaS (3 dias)

- **T-060** `POST /api/chatbot` — streaming via Vercel AI SDK + Claude Haiku
- **T-061** Rate limit: middleware lendo `ChatbotUsage` (ou Upstash Redis)
- **T-062** Paywall: se `usage >= limit && !isPro`, retornar 429 com `upgradeUrl`
- **T-063** UI `app/(app)/chatbot/page.tsx`: chat streaming + chip picker de ingredientes (vindos de `GET /api/ingredients`)
- **T-064** Modal de upgrade quando atingir limite (CTA → `/pricing`)
- **T-065** Implementar RAG: dado ingredientes selecionados, embed a query, busca cosine no Postgres (ou em memória), retorna top-K cocktails como contexto para o Haiku
- **T-066** Implementar cache de respostas idênticas (hash da query → resposta) em tabela ou Redis — reduz custo drasticamente

### Fase 6 — Engagement (2 dias)

- **T-070** `POST /api/cocktails/[id]/comments` — adicionar comentário
- **T-071** `POST /api/user-drinks` — endpoint "envie seu drink" com upload R2 + form
- **T-072** UI "envie seu drink" na página de cada drink
- **T-073** Página `/comunidade` listando UserDrinks aprovados (paginação, ordenação)
- **T-074** Moderação automática básica (palavrões em PT/EN/ES via lista; flag `approved`)

### Fase 7 — Monetização passiva (1 dia)

- **T-080** Componente `<AdSlot />` para AdSense — slots em páginas de drink (no meio do conteúdo, nunca atrapalhando CWV)
- **T-081** Componente `<AmazonAffiliate />` — link automatizado para destilados/ingredientes citados, usando tag de afiliado em env
- **T-082** Página `/pricing` com copy convertendo bem (3 planos, social proof, garantia 7 dias)

### Fase 8 — Polimento + deploy (1 dia)

- **T-090** Deploy preview no Vercel
- **T-091** Configurar domínio + SSL
- **T-092** Submeter sitemap ao Google Search Console
- **T-093** Submeter ao Bing Webmaster Tools
- **T-094** Verificar todos os JSON-LD no Rich Results Test
- **T-095** Audit Lighthouse final — todas as métricas verdes em mobile
- **T-096** Setup Sentry + alertas de erro
- **T-097** Documentar processo de deploy em `docs/DEPLOYMENT.md`

---

## 💾 SISTEMA DE CACHE DE DECISÕES (REDUÇÃO DE TOKENS)

Toda decisão arquitetural deve ser registrada em `docs/CACHE.md` no formato:

```markdown
## [DATA] — [TÍTULO DA DECISÃO]

**Contexto:** o que estava sendo decidido
**Decisão:** o que foi escolhido
**Alternativas consideradas:** o que foi descartado e por quê
**Trade-offs:** custos aceitos
```

**Antes de fazer qualquer pergunta arquitetural ao usuário, consulte `docs/CACHE.md`.** Se a resposta já estiver lá, use-a. Isso reduz tokens drasticamente entre sessões.

Exemplos de decisões que devem ser cacheadas:

- Por que Supabase em vez de Neon
- Por que Claude Haiku em vez de Gemini Flash
- Por que SSG em vez de SSR para `/drinks/[slug]`
- Esquema de pricing escolhido
- Estratégia de moderação de UGC

---

## 🤝 PROTOCOLO ENTRE IDEs (Claude Code / Cursor / Antigravity)

Todas as IDEs leem e escrevem em `AGENT_STATE.json`. Schema completo em `docs/AGENT_STATE_SCHEMA.md`. Resumo:

```json
{
  "version": "1.0",
  "last_updated": "ISO 8601 timestamp",
  "last_agent": "claude-code | cursor | antigravity",
  "current_task": { "id": "T-022", "status": "in_progress", "started_at": "..." },
  "completed_tasks": [{ "id": "T-001", "completed_at": "...", "agent": "..." }],
  "tasks_queue": [{ "id": "T-023", "priority": 1, "blockers": [] }],
  "session_log": [{ "timestamp": "...", "agent": "...", "action": "...", "files_changed": [] }],
  "cache_keys": ["arch_db_choice", "arch_ai_provider", ...]
}
```

**Regra de ouro:** se outra IDE estava mexendo (`last_agent != você` e `last_updated < 30 min`), avise o usuário e pergunte se pode continuar.

---

## 🧪 TDD OBRIGATÓRIO

Para cada endpoint novo:

1. Escrever teste Vitest cobrindo o happy path + 2 edge cases
2. Rodar → falhar (red)
3. Implementar o endpoint
4. Rodar → passar (green)
5. Refatorar se necessário, manter teste verde

Para cada componente UI:

1. Storybook entry (se viável) + Playwright e2e do fluxo principal
2. Verificar acessibilidade com `@axe-core/playwright`

---

## 📊 MÉTRICAS DE SUCESSO

**Por sprint (1 semana):**

- 100% das tasks marcadas completed têm commit + teste
- 0 erros de TypeScript
- 0 warnings de ESLint
- Lighthouse mobile ≥ 95 em todas as métricas

**Por mês (após deploy):**

- Mês 1: ≥ 100 páginas indexadas no Google Search Console
- Mês 2: ≥ 1k visitas orgânicas
- Mês 3: ≥ 10k visitas orgânicas + 5 assinantes pagos
- Mês 6: ≥ 50k visitas/mês + 100 assinantes pagos = ~R$2k MRR

---

## 🚨 REGRAS INVIOLÁVEIS

1. **NUNCA** rode `prisma migrate reset` em produção
2. **NUNCA** comite `.env.local`, chaves Stripe, ou tokens Anthropic
3. **NUNCA** modifique slugs publicados (quebra SEO)
4. **NUNCA** use `any` em TypeScript
5. **NUNCA** crie rota sem `generateMetadata` (exceto rotas de API)
6. **NUNCA** importe pacote sem antes verificar bundle size
7. **NUNCA** pule o Step Zero
8. **SEMPRE** atualize `AGENT_STATE.json` ao final da sessão
9. **SEMPRE** documente decisões novas em `docs/CACHE.md`
10. **SEMPRE** preserve a compatibilidade com o schema do MVP original

---

## 🎓 PERSONA

Você é cético, direto, e prioriza performance + manutenibilidade. Quando o usuário sugerir algo que prejudica SEO ou CWV, **discorde com argumentos técnicos**. Não puxe saco. Não use emojis em código ou em commits. Em respostas curtas, vá direto ao ponto.

Quando uma escolha não tiver resposta óbvia, apresente trade-offs em uma tabela e peça a decisão final ao usuário — depois cacheie em `docs/CACHE.md`.

---

**Fim do CLAUDE.md. Comece SEMPRE lendo `AGENT_STATE.json`.**
