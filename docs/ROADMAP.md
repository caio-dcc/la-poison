# docs/ROADMAP.md — LaPoison Complete Implementation Roadmap

> **Updated 2026-05-13** after Prisma pivot to Supabase Edge Functions.
> All tasks reference this version. Use AGENT_STATE.json for current progress.

---

## 📋 Executive Summary

**Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + PostgreSQL (Supabase) + Supabase Edge Functions (Deno) + Claude Haiku + Stripe + Vercel

**Architecture:**

- Frontend: Next.js SSG pages + Supabase Client for queries
- Backend: Supabase Edge Functions (Deno) for CRUD operations
- Database: PostgreSQL with pgvector for embeddings
- Auth: Supabase Auth (email + OAuth)
- Payments: Stripe integration
- AI: Claude Haiku (chatbot) + local embeddings (Xenova)
- Storage: Cloudflare R2
- Deploy: Vercel (frontend) + Supabase (backend functions)

**Goal:** Build SEO-first cocktail platform with freemium SaaS chatbot. Target: 50k visits/month, 100 paid subscribers by month 6.

---

## 🎯 Phases Overview

### Phase 0 — Foundation (T-001 to T-009)

✅ **Complete:** Project init, Supabase auth, CI/CD, ESLint+Prettier
⏳ **In Progress:** Database schema creation (T-008)
⏳ **Queued:** Edge Functions boilerplate (T-009)

### Phase 1 — Data Ingestion (T-010 to T-014)

⏳ Ingest CocktailDB API, enrich with Claude Haiku, upload images to R2, generate embeddings

### Phase 2 — SEO Core Pages (T-020 to T-029)

⏳ Build SSG drink pages, category pages, ingredient pages, sitemap, robots.txt, OG images, i18n, Lighthouse audit

### Phase 3 — MVP Original API (T-030 to T-042)

⏳ Implement all original endpoints: bars, inventory, ingredients, cocktails, recommendations, random drink

### Phase 4 — Auth + Pricing (T-050 to T-058)

⏳ Supabase Auth pages, pricing page, Stripe checkout, customer portal, subscription management

### Phase 5 — Chatbot SaaS (T-060 to T-066)

⏳ Streaming chatbot, rate limiting, RAG retrieval, response caching

### Phase 6 — Engagement (T-070 to T-074)

⏳ Comments, user-submitted drinks, community page, moderation

### Phase 7 — Monetization (T-080 to T-082)

⏳ AdSense slots, Amazon affiliate links, pricing copy optimization

### Phase 8 — Polish + Deploy (T-090 to T-097)

⏳ Final Lighthouse audit, domain setup, Search Console submission, Sentry alerts, deployment guide

---

## 📝 Phase 0 — Foundation

### T-001 ✅ Initialize Next.js 14 + TypeScript + Tailwind + shadcn/ui

**Status:** Complete (commit 4962c8d)
**Done:**

- Created Next.js 14 project with App Router
- Configured TypeScript strict mode
- Installed Tailwind CSS v4 + shadcn/ui
- Set up initial folder structure

---

### T-002 ✅ Configure Supabase Auth (email + OAuth)

**Status:** Complete (commit 4962c8d + a90f401)
**Done:**

- Installed @supabase/supabase-js + @supabase/ssr
- Created src/utils/supabase/server.ts (SSR client)
- Created src/utils/supabase/client.ts (browser client)
- Created src/utils/supabase/middleware.ts (session refresh)
- Updated root middleware.ts with Supabase session handling
- Verified Supabase REST API is reachable

---

### T-003 ✅ Configure ESLint + Prettier + Husky

**Status:** Complete (commit 4962c8d)
**Done:**

- Installed ESLint 9 with Next.js config + TypeScript rules
- Installed Prettier with config file
- Installed Husky + lint-staged for pre-commit hooks
- Configured .lintstagedrc.json to auto-fix and format on commit

---

### T-004 ✅ Pivot Architecture: Remove Prisma, Use Supabase Edge Functions

**Status:** Complete (commit 950beb2)
**Reason:** Prisma v7 PostgreSQL connection failed (P1001). Edge Functions native approach better for serverless.
**Done:**

- Removed @prisma/client and prisma from dependencies
- Removed prisma/ directory and src/lib/db.ts
- Updated CLAUDE.md stack table (Prisma → Edge Functions)
- Added SQL DDL schema in CLAUDE.md (ready for Supabase SQL Editor)
- Documented decision in docs/CACHE.md
- Verified Supabase REST API works perfectly

---

### T-005 ✅ Setup Vitest (unit) + Playwright (e2e)

**Status:** Complete (commit 4962c8d)
**Done:**

- Installed vitest + @vitest/ui + jsdom + happy-dom
- Configured vitest.config.ts with jsdom environment
- Created tests/setup.ts with window.matchMedia mock
- Created example unit test (tests/unit/example.test.ts)
- Installed Playwright + configured playwright.config.ts
- Created example e2e test (tests/e2e/homepage.spec.ts)
- Tests running: ✅ npm run test, ✅ npm run test:e2e

---

### T-006 ✅ Setup GitHub Actions CI/CD

**Status:** Complete (commit 4962c8d)
**Done:**

- Created .github/workflows/ci.yml
- Test job: runs lint → type-check → unit tests → build on Node 20.x + 22.x
- E2E job: runs on PRs only, uploads Playwright report as artifact
- Pre-commit hooks working (Husky + lint-staged)

---

### T-007 ✅ Setup Supabase SDK + Environment Variables

**Status:** Complete (commit a90f401)
**Done:**

- Updated .env and .env.local with Supabase credentials
- Configured DATABASE_URL for PostgreSQL
- Configured NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

---

### T-008 ⏳ Create PostgreSQL Schema in Supabase SQL Editor

**Status:** Queued
**Blocker:** Waiting for user to execute SQL DDL
**What to do:**

1. Go to https://app.supabase.com → your project → SQL Editor
2. Create new query
3. Copy entire SQL DDL from CLAUDE.md § "MODELAGEM DE DADOS"
4. Execute
5. Verify tables created: `cocktails`, `ingredients`, `cocktail_ingredients`, `bars`, `inventory_items`, `subscriptions`, `user_drinks`, `comments`, `chatbot_usage`

---

### T-009 ⏳ Setup Supabase Edge Functions Boilerplate

**Status:** Queued (after T-008)
**Hours:** 1
**What to do:**

- Create `supabase/functions/` directory
- Create example function: `supabase/functions/hello/index.ts` (Deno)
- Add deployment config to supabase.json
- Test local Edge Functions with supabase start
- Create folder structure for CRUD functions: cocktails-crud/, ingredients-crud/, bars-crud/, chatbot-rate-limit/

---

## 📝 Phase 1 — Data Ingestion

### T-010 ⏳ Implement CocktailDB Ingestion Script

**Status:** Queued (after T-009)
**Hours:** 2
**What to do:**

- Create scripts/ingest-cocktaildb.ts
- Iterate CocktailDB API (search.php?f=A to Z)
- Fetch all drinks JSON
- Save to scripts/data/raw/cocktails.json
- Parse and extract: name, category, alcoholic, iba, instructions, thumb, ingredients

---

### T-011 ⏳ Implement Image Upload to Cloudflare R2

**Status:** Queued (after T-009)
**Hours:** 1.5
**What to do:**

- Create scripts/upload-images-r2.ts
- Download each drink thumbnail
- Convert to WebP (sharp)
- Upload to Cloudflare R2
- Update JSON with public R2 URL
- Output: scripts/data/processed/cocktails-with-r2-urls.json

---

### T-012 ⏳ Implement Database Seeding

**Status:** Queued (after T-010)
**Hours:** 1
**What to do:**

- Create scripts/seed-db.ts
- Read scripts/data/processed/cocktails-with-r2-urls.json
- Call Supabase Edge Function or direct INSERT to create cocktails, ingredients, cocktail_ingredients
- Generate unique slugs (cocktail name → kebab-case)
- Verify all data imported successfully

---

### T-013 ⏳ Implement AI Enrichment (descriptions, history, fun facts)

**Status:** Queued (after T-012)
**Hours:** 3
**What to do:**

- Create scripts/enrich-with-ai.ts
- For each cocktail: call Claude Haiku to generate:
  - descriptionPT, descriptionEN, descriptionES
  - historyPT, historyEN, historyES
  - funFactPT, funFactEN, funFactES
  - metaTitlePT, metaTitleEN, metaTitleES (max 60 chars)
  - metaDescPT, metaDescEN, metaDescES (140–160 chars)
- Use prompt caching for shared context
- Estimated cost: ~$3 for 600 drinks
- Batch in smaller sets (~50 drinks) to avoid timeouts
- Update database via Edge Function (supabase/functions/cocktails-enrich/)

---

### T-014 ⏳ Generate Embeddings for RAG

**Status:** Queued (after T-013)
**Hours:** 2
**What to do:**

- Create scripts/generate-embeddings.ts
- Load @xenova/transformers with Xenova/all-MiniLM-L6-v2
- For each cocktail: concatenate name + ingredients + category
- Generate 384-dim embedding vector
- Store as Bytea in cocktails.embedding_vector
- Create pgvector index for fast similarity search
- Test: query by ingredient set → retrieve top-5 similar drinks

---

## 📝 Phase 2 — SEO Core Pages

### T-020 ⏳ Create SEO Metadata Helper Library

**Status:** Queued (after T-009)
**Hours:** 1
**What to do:**

- Create src/lib/seo/metadata.ts
- Export generateMetadata helpers for:
  - Drink pages: title, description, OG, twitter, canonical, hreflang
  - Category pages: title, description, OG, twitter
  - Ingredient pages: title, description, OG, twitter

---

### T-021 ⏳ Create JSON-LD Helper Library

**Status:** Queued (after T-020)
**Hours:** 1
**What to do:**

- Create src/lib/seo/jsonld.ts
- Export components/helpers for:
  - RecipeLd (drink pages)
  - BreadcrumbLd (all pages)
  - FAQLd (drink pages with comments)
  - Aggregate rating when comments exist

---

### T-022 ⏳ Implement /drinks/[slug] SSG Page

**Status:** Queued (after T-021)
**Hours:** 2
**What to do:**

- Create app/drinks/[slug]/page.tsx
- Implement generateStaticParams() to fetch all cocktails
- Implement generateMetadata() with Cocktail.metaTitle*, Cocktail.metaDesc*
- Display: name, image, category, instructions, ingredients, history, fun fact
- Include JSON-LD Recipe + Breadcrumb
- Internal links: 4–6 related drinks (same category + shared ingredients)
- Comments section at bottom (if T-070 done)
- Call Supabase Edge Function or client to fetch cocktail data

---

### T-023 ⏳ Implement /drinks/categoria/[cat] Category Pages

**Status:** Queued (after T-022)
**Hours:** 1.5
**What to do:**

- Create app/drinks/categoria/[cat]/page.tsx
- generateStaticParams() from unique categories
- generateMetadata() for category
- Display: category title, description, drink grid (thumbnail + name + short desc)
- Pagination: 20 drinks per page
- Internal links: drinks in this category + related categories

---

### T-024 ⏳ Implement /drinks/ingrediente/[ing] Ingredient Pages

**Status:** Queued (after T-023)
**Hours:** 1.5
**What to do:**

- Create app/drinks/ingrediente/[ing]/page.tsx
- generateStaticParams() from unique ingredients
- generateMetadata() for ingredient
- Display: ingredient name, description, all drinks containing it
- Pagination
- Internal links: drinks + related ingredients

---

### T-025 ⏳ Implement Dynamic Sitemap

**Status:** Queued (after T-024)
**Hours:** 1
**What to do:**

- Create app/sitemap.ts
- Export array of all public URLs:
  - /
  - /drinks/[slug] (all cocktails)
  - /drinks/categoria/[cat] (all categories)
  - /drinks/ingrediente/[ing] (all ingredients)
  - /about, /pricing, /community
- Include lastMod from database (cocktail updated_at)
- Set changeFreq: weekly for drinks, daily for /community

---

### T-026 ⏳ Implement robots.txt

**Status:** Queued (after T-025)
**Hours:** 0.5
**What to do:**

- Create app/robots.ts
- Allow: /
- Disallow: /api/, /(app)/, /conta, /chatbot
- Sitemap: https://[domain]/sitemap.xml

---

### T-027 ⏳ Implement OG Image Generation

**Status:** Queued (after T-026)
**Hours:** 1.5
**What to do:**

- Create app/api/og/[slug]/route.tsx
- Use @vercel/og to generate 1200×630 images
- Include: drink name, thumb, category color, LaPoison logo
- Cache: s-maxage=86400, stale-while-revalidate
- Fallback: /public/og-fallback.png

---

### T-028 ⏳ Implement i18n (PT/EN/ES)

**Status:** Queued (after T-027)
**Hours:** 2
**What to do:**

- Add `[locale]` segment to app router (or middleware-based routing)
- Create src/lib/i18n/ with language helpers
- Generate hreflang for PT/EN/ES
- Translate slugs where appropriate (/en/drinks/mojito)
- Use Claude Haiku for quality translations (not machine-translate)

---

### T-029 ⏳ Final Lighthouse Audit

**Status:** Queued (after T-028)
**Hours:** 1
**What to do:**

- Run Lighthouse on mobile for sample pages:
  - /drinks/[slug] (SSG page)
  - /drinks/categoria/aperitivos (category)
  - / (home)
- Target: LCP < 2.5s, INP < 200ms, CLS < 0.1, all metrics ≥ 95
- Fix any violations (image sizing, font loading, JS bundle)

---

## 📝 Phase 3 — MVP Original API

### T-030 to T-042 ⏳ Implement All Original Endpoints

**Status:** Queued (after T-009)
**Total hours:** 6
**Pattern:** Each endpoint maps 1:1 from API_SPEC.md, backed by Supabase Edge Functions

**Endpoints to implement:**

- T-030: POST /api/auth/signin (Supabase Auth)
- T-031: GET /api/bar (list user's bars)
- T-032: POST /api/bar (create bar)
- T-033: GET/PUT/DELETE /api/bar/[id]
- T-034: GET/POST /api/bar/[id]/inventory
- T-035: PUT/DELETE /api/bar/[id]/inventory/[itemId]
- T-036: POST /api/bar/[id]/share
- T-037: DELETE /api/bar/[id]/share/[userId]
- T-038: GET /api/ingredients (with filters)
- T-039: POST /api/ingredients
- T-040: GET /api/ingredients/[id]
- T-041: GET /api/cocktails (with filters: search, category, alcoholic, limit, offset)
- T-042: GET /api/cocktails/[id]

**Implementation pattern:**

1. Create Edge Function in supabase/functions/[endpoint]/index.ts
2. Write SQL query
3. Create Next.js route handler in app/api/[endpoint]/route.ts that calls the Edge Function
4. Add TypeScript types in src/types/
5. Test with Playwright e2e

---

## 📝 Phase 4 — Auth + Pricing

### T-050 ⏳ Implement Login/Signup Pages

**Status:** Queued (after T-009)
**Hours:** 1.5
**What to do:**

- Create app/(marketing)/login/page.tsx
- Create app/(marketing)/signup/page.tsx
- Use Supabase Auth UI or custom forms
- Email + password + Google OAuth
- Redirect to /conta after auth

---

### T-051 ⏳ Implement Account Page

**Status:** Queued (after T-050)
**Hours:** 1
**What to do:**

- Create app/(app)/conta/page.tsx (protected)
- Display: user email, current plan, subscription status
- Button: "Manage subscription" → Stripe customer portal
- Button: "Logout"

---

### T-052 ⏳ Implement Pricing Page

**Status:** Queued (after T-050)
**Hours:** 1.5
**What to do:**

- Create app/(marketing)/pricing/page.tsx
- Display 3 plans: Free / Pro mensal / Pro anual
- Free: 10 queries/day, logo in chatbot footer
- Pro monthly: R$19,90, unlimited
- Pro annual: R$159, unlimited (33% off)
- Trial: 7 days free on first Pro signup
- CTA buttons: "Get started"
- Social proof section

---

### T-053 ⏳ Setup Stripe Products + Price IDs

**Status:** Queued (after T-052)
**Hours:** 0.5
**What to do:**

- Create Stripe products: LaPoison Pro Monthly, LaPoison Pro Annual
- Create prices: price*... (monthly), price*... (annual)
- Add to .env.local: STRIPE_PRICE_ID_MONTHLY, STRIPE_PRICE_ID_ANNUAL

---

### T-054 ⏳ Implement Stripe Checkout

**Status:** Queued (after T-053)
**Hours:** 1
**What to do:**

- Create app/api/stripe/checkout/route.ts
- Accept POST with priceId
- Create Stripe Checkout Session
- Return session.url
- Redirect user to checkout

---

### T-055 ⏳ Implement Stripe Webhook Handler

**Status:** Queued (after T-054)
**Hours:** 1.5
**What to do:**

- Create app/api/stripe/webhook/route.ts
- Listen for: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
- On checkout.completed: create Subscription record in DB (via Edge Function)
- On subscription.updated: update Subscription.status
- On subscription.deleted: set Subscription.status = canceled

---

### T-056 ⏳ Implement Stripe Customer Portal

**Status:** Queued (after T-055)
**Hours:** 0.5
**What to do:**

- Create app/api/stripe/portal/route.ts
- Accept POST, redirect to Stripe customer portal
- Return 302 to portal URL

---

### T-057 ⏳ Create Subscription Management Edge Function

**Status:** Queued (after T-055)
**Hours:** 1
**What to do:**

- Create supabase/functions/subscriptions-crud/index.ts
- Operations:
  - POST: create subscription from Stripe event
  - GET: check if user has active Pro subscription
  - PUT: update status
  - DELETE: cancel subscription

---

### T-058 ⏳ Integrate Subscription Checks in Middleware

**Status:** Queued (after T-057)
**Hours:** 0.5
**What to do:**

- Update middleware.ts to check subscription status
- On protected routes /(app)/, verify user has Pro or fail gracefully

---

## 📝 Phase 5 — Chatbot SaaS

### T-060 ⏳ Implement Streaming Chatbot Endpoint

**Status:** Queued (after T-009)
**Hours:** 2
**What to do:**

- Create app/api/chatbot/route.ts
- Accept POST: { messages, selectedIngredients }
- Check rate limit (T-061)
- Call Supabase Edge Function: chatbot-stream
- Stream Claude Haiku response via Vercel AI SDK
- Track tokens/cost in chatbot_usage table

---

### T-061 ⏳ Implement Rate Limiting

**Status:** Queued (after T-060)
**Hours:** 1
**What to do:**

- Create supabase/functions/chatbot-rate-limit/index.ts
- Rules:
  - Anon (IP): 3 queries/day
  - Free (user): 10 queries/day
  - Pro: unlimited
- Hash IP with SHA-256
- Reset daily at 00:00 UTC
- Return 429 if limit hit

---

### T-062 ⏳ Implement Paywall/Upgrade Modal

**Status:** Queued (after T-061)
**Hours:** 1
**What to do:**

- Create src/components/chatbot/UpgradeModal.tsx
- Trigger when user hits limit
- Show upgrade CTA → /pricing
- Use shadcn Dialog component

---

### T-063 ⏳ Create Chatbot UI Page

**Status:** Queued (after T-062)
**Hours:** 1.5
**What to do:**

- Create app/(app)/chatbot/page.tsx
- Chat interface: user messages + bot responses
- Input box + send button
- Ingredient picker: chips from GET /api/ingredients
- Streaming responses (real-time text)
- Rate limit warning when near limit

---

### T-064 ⏳ Implement RAG Retrieval

**Status:** Queued (after T-014)
**Hours:** 1.5
**What to do:**

- Create supabase/functions/chatbot-rag/index.ts
- Given: user query + selected ingredients
- Embed user query with Xenova transformer
- Cosine similarity search in cocktails.embedding_vector
- Retrieve top-5 drinks with highest similarity
- Include their descriptions, ingredients, instructions
- Return as context for Claude Haiku prompt

---

### T-065 ⏳ Implement Response Caching

**Status:** Queued (after T-064)
**Hours:** 1
**What to do:**

- Create supabase/functions/chatbot-cache/index.ts
- Hash user query + selected ingredients
- Check if response exists in cache table
- If yes: return cached response (instant, no API cost)
- If no: generate response, cache it
- Reduce Anthropic API costs drastically

---

### T-066 ⏳ Setup Claude Haiku Streaming with Prompt Caching

**Status:** Queued (after T-065)
**Hours:** 1
**What to do:**

- Configure Anthropic API client in Edge Function
- Use prompt caching for shared context (RAG results, cocktail database)
- Stream tokens directly to client via SSE
- Track tokens in/out for cost estimation
- Handle errors gracefully

---

## 📝 Phase 6 — Engagement

### T-070 ⏳ Implement Comments on Drink Pages

**Status:** Queued (after T-022)
**Hours:** 1
**What to do:**

- Create app/api/cocktails/[id]/comments/route.ts
- POST: create comment (requires auth)
- GET: list comments for drink (paginated)
- Comments table: user_id, cocktail_id, body, approved, created_at
- Display in /drinks/[slug] page

---

### T-071 ⏳ Implement "Send Your Drink" Feature

**Status:** Queued (after T-070)
**Hours:** 1.5
**What to do:**

- Create app/api/user-drinks/route.ts
- POST: multipart form with name, description, image, comment
- Upload image to Cloudflare R2
- Create user_drinks record (approved: false for moderation)
- Redirect to success page

---

### T-072 ⏳ Create "Send Your Drink" Form

**Status:** Queued (after T-071)
**Hours:** 1
**What to do:**

- Create src/components/drink/SendDrinkForm.tsx
- Fields: name, description, image upload, comment, optional cocktail link
- File upload → R2
- Form validation
- Moderation warning: "Your drink will be reviewed before publishing"

---

### T-073 ⏳ Create Community Page

**Status:** Queued (after T-072)
**Hours:** 1
**What to do:**

- Create app/comunidade/page.tsx
- List all approved user_drinks (paginated)
- Sorting: newest, most popular
- Filter: by cocktail category
- Each card shows: image, drink name, user name, date, comments count

---

### T-074 ⏳ Implement Basic Moderation

**Status:** Queued (after T-073)
**Hours:** 0.5
**What to do:**

- Create supabase/functions/moderation/index.ts
- Check user_drinks body for forbidden words (PT/EN/ES wordlist)
- Auto-approve if clean, else flag for manual review
- Manual review: dashboard (future feature)

---

## 📝 Phase 7 — Monetization (Passive Income)

### T-080 ⏳ Implement AdSense Slots

**Status:** Queued (after T-022)
**Hours:** 0.5
**What to do:**

- Create src/components/AdSlot.tsx
- Add AdSense code to .env: NEXT_PUBLIC_ADSENSE_CLIENT_ID
- Place ads in:
  - /drinks/[slug] (after ingredients section)
  - /drinks/categoria/[cat] (between drink cards)
  - /comunidade (between user drinks)
- Monitor for CLS impact (use space reservation)

---

### T-081 ⏳ Implement Amazon Affiliate Links

**Status:** Queued (after T-080)
**Hours:** 1
**What to do:**

- Create src/components/AffiliateLink.tsx
- Extract ingredients that are bottled spirits
- Link each to Amazon with affiliate tag
- Example: vodka → amazon.com/s?k=vodka+AFFILIATE_TAG
- Add to ingredient pages + drink pages (below ingredients)
- .env: NEXT_PUBLIC_AFFILIATE_TAG

---

### T-082 ⏳ Optimize Pricing Page Copy

**Status:** Queued (after T-058)
**Hours:** 1
**What to do:**

- A/B test pricing page copy
- Add testimonials (future: user quotes)
- Add FAQ section
- Add 7-day trial CTA
- Highlight unlimited features in Pro
- Test conversions with Vercel Analytics

---

## 📝 Phase 8 — Polish + Deployment

### T-090 ⏳ Final Lighthouse Audit (All Pages)

**Status:** Queued (after T-029)
**Hours:** 1
**What to do:**

- Run Lighthouse on 5+ representative pages
- Target: all metrics ≥ 95 on mobile
- Fix violations: images, fonts, JS bundles, layout shift

---

### T-091 ⏳ Setup Custom Domain + SSL

**Status:** Queued (after T-090)
**Hours:** 0.5
**What to do:**

- Configure domain in Vercel
- Enable SSL (automatic)
- Test https://yourdomain.com

---

### T-092 ⏳ Submit Sitemap to Google Search Console

**Status:** Queued (after T-091)
**Hours:** 0.5
**What to do:**

- Create Google Search Console property
- Submit https://yourdomain.com/sitemap.xml
- Submit https://yourdomain.com/robots.txt
- Request indexing for key pages

---

### T-093 ⏳ Submit to Bing Webmaster Tools

**Status:** Queued (after T-092)
**Hours:** 0.5
**What to do:**

- Create Bing account
- Submit sitemap
- Verify domain ownership

---

### T-094 ⏳ Rich Results Testing

**Status:** Queued (after T-027)
**Hours:** 0.5
**What to do:**

- Test /drinks/[slug] with Google Rich Results Test
- Verify Recipe schema recognized
- Verify Breadcrumb schema
- Zero errors, zero warnings

---

### T-095 ⏳ Setup Sentry Error Tracking

**Status:** Queued (after T-091)
**Hours:** 1
**What to do:**

- Create Sentry account
- Install @sentry/nextjs
- Configure in next.config.js
- Enable alerts for critical errors

---

### T-096 ⏳ Verify Core Web Vitals in Production

**Status:** Queued (after T-091)
**Hours:** 1
**What to do:**

- Monitor Vercel Analytics
- Check CrUX data (Chrome User Experience Report)
- Ensure LCP, INP, CLS meet targets in real traffic
- Adjust caching/optimization if needed

---

### T-097 ⏳ Create Deployment Guide

**Status:** Queued (after T-091)
**Hours:** 1
**What to do:**

- Create docs/DEPLOYMENT.md
- Step-by-step for deploying frontend to Vercel
- Step-by-step for deploying Edge Functions to Supabase
- Environment variables checklist
- Database backup strategy
- Monitoring dashboard links

---

## 🔗 Task Dependency Graph

```
T-001, T-002, T-003, T-005, T-006 (independent) → all complete
    ↓
T-004 (architecture pivot) ✅ complete
    ↓
T-007 (Supabase env) ✅ complete
    ↓
T-008 (create schema) ⏳ queued
    ↓
T-009 (Edge Functions boilerplate) ⏳ queued
    ├→ T-010 (CocktailDB ingest) ⏳
    ├→ T-011 (upload images R2) ⏳
    ├→ T-020 (SEO metadata lib) ⏳
    ├→ T-030–T-042 (API endpoints) ⏳
    └→ T-050–T-058 (Auth + Pricing) ⏳
        ↓
    T-012 (seed DB) ⏳
        ↓
    T-013 (AI enrichment) ⏳
        ↓
    T-014 (embeddings) ⏳
        ↓
    T-021–T-029 (SEO pages + sitemap + i18n) ⏳
        ↓
    T-022 (/drinks/[slug]) ⏳
        ├→ T-060 (streaming chatbot) ⏳
        ├→ T-070 (comments) ⏳
        └→ T-080 (AdSense) ⏳
```

---

## 📊 Metrics & Success Criteria

### Month 1 (Setup + Data)

- All Phase 0 tasks done
- 600+ cocktails in database
- Descriptions/history/fun facts enriched
- All Phase 2 pages live (SSG, SEO-ready)

### Month 2 (API + Auth)

- All Phase 3 endpoints live
- Auth pages + pricing live
- First 10 paid subscribers
- 100+ indexed pages in Google

### Month 3 (Chatbot + Engagement)

- Chatbot live with rate limiting
- Community submissions live
- 1k+ visits/month
- 20+ paid subscribers

### Month 6 (Target)

- 50k visits/month
- 100+ paid subscribers (R$2k MRR)
- 1k+ indexed pages
- Core Web Vitals ≥ 95 mobile
- 0 critical errors in Sentry

---

## 🚀 Getting Started

1. **Today (T-008):** Execute SQL DDL from CLAUDE.md in Supabase SQL Editor
2. **Tomorrow (T-009):** Setup Edge Functions boilerplate
3. **Week 1–2 (T-010–T-014):** Data ingestion pipeline
4. **Week 3–4 (T-020–T-029):** SEO pages + sitemap
5. **Week 5–6 (T-030–T-042):** API endpoints
6. **Week 7–8 (T-050–T-058):** Auth + Stripe integration
7. **Week 9–10 (T-060–T-066):** Chatbot SaaS
8. **Week 11–12 (T-090–T-097):** Polish + deploy

**Total estimate:** 12 weeks (3 months) to MVP launch.

---

**Last updated:** 2026-05-13 by Claude Code
**Next review:** After T-009 completion
