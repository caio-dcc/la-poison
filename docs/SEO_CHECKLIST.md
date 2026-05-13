# docs/SEO_CHECKLIST.md

> Checklist técnico obrigatório antes de fazer merge de qualquer rota pública.

---

## Metadata (toda página)

- [ ] `generateMetadata` tipada com `Metadata` do `next`
- [ ] `title` único, ≤ 60 caracteres, padrão `[Nome do drink] — Como fazer | LaPoison`
- [ ] `description` única, 140–160 caracteres, com keyword principal nas primeiras 80 chars
- [ ] `openGraph.title`, `og.description`, `og.images` (1200×630), `og.type`
- [ ] `twitter.card: "summary_large_image"`, `twitter.title`, `twitter.description`, `twitter.images`
- [ ] `alternates.canonical` apontando para URL absoluta
- [ ] `alternates.languages` com `pt-BR`, `en-US`, `es-ES` (hreflang)
- [ ] `robots: { index: true, follow: true }` (exceto rotas privadas)

---

## Estrutura semântica

- [ ] Um único `<h1>` por página
- [ ] Hierarquia limpa: `h1 → h2 → h3` (sem pular níveis)
- [ ] Tags semânticas: `<article>`, `<section>`, `<nav>`, `<aside>`, `<main>`, `<header>`, `<footer>`
- [ ] `<time datetime="ISO">` para datas
- [ ] Imagens com `alt` descritivo (nunca vazio em conteúdo, vazio só em decorativas)

---

## JSON-LD obrigatório

### Páginas de drink (`/drinks/[slug]`)

- [ ] `@type: Recipe` com:
  - `name`, `image[]`, `author`, `datePublished`, `description`
  - `recipeCategory`, `recipeCuisine`
  - `recipeIngredient[]` (array de strings)
  - `recipeInstructions[]` como array de `HowToStep`
  - `recipeYield`
  - `nutrition` (se disponível)
  - `aggregateRating` (quando houver comentários/notas)
- [ ] `@type: BreadcrumbList`

### Páginas de categoria/ingrediente

- [ ] `@type: CollectionPage` + `BreadcrumbList`

### FAQs (rodapé de drink)

- [ ] `@type: FAQPage` se houver perguntas frequentes

---

## Performance (Core Web Vitals em mobile)

- [ ] **LCP < 2.5s:** hero image com `priority`, `<link rel="preload">` para fonts
- [ ] **INP < 200ms:** evitar JS pesado no cliente; usar Server Components
- [ ] **CLS < 0.1:** reservar espaço com `width`/`height` em todas as imagens
- [ ] Fonts via `next/font` (auto-display swap, sem FOUT)
- [ ] CSS crítico inline pelo Next.js (default)
- [ ] Bundle JS por rota < 100KB (verificar com `pnpm build && pnpm analyze`)
- [ ] Imagens via `next/image` com `sizes="(max-width: 640px) 100vw, 50vw"`
- [ ] Lazy loading default em todas exceto LCP

---

## URLs e roteamento

- [ ] Slug em kebab-case, sem acentos (`mojito-cubano`, não `mojito_cubano` ou `Mojito Cubano`)
- [ ] Slugs imutáveis após publicação (redirect 301 se mudar)
- [ ] URLs limpas: `/drinks/mojito` (não `/drinks?id=123`)
- [ ] Sem trailing slash (`/drinks/mojito`, não `/drinks/mojito/`)
- [ ] 404 customizado (`not-found.tsx`) com links de fuga para descoberta

---

## Internal linking

- [ ] Cada página de drink linka 4–6 drinks relacionados (mesma categoria + ingrediente em comum)
- [ ] Breadcrumbs visíveis no topo da página
- [ ] Links em `<a>` semânticos (não `<button onClick={router.push}>`)
- [ ] Anchor text descritivo (não "clique aqui")
- [ ] Cluster topic interno: páginas pilares (`/drinks/categoria/aperitivos`) linkam pra spokes (drinks individuais) e vice-versa

---

## Sitemap e robots

- [ ] `app/sitemap.ts` gera dinamicamente todas as URLs públicas
- [ ] `<lastmod>` real (do banco) em cada entry
- [ ] `<changefreq>` apropriado (`weekly` para drinks, `daily` para `/comunidade`)
- [ ] `app/robots.ts` com:
  - `User-agent: *`
  - `Allow: /`
  - `Disallow: /api/`, `/(app)/`, `/conta`, `/chatbot`
  - `Sitemap: https://thedrinkingman.com/sitemap.xml`

---

## i18n

- [ ] Conteúdo em PT (default), EN, ES
- [ ] Estrutura de URL: `/` (PT) + `/en/` + `/es/`
- [ ] `hreflang` em `<head>` de cada página i18n
- [ ] `x-default` apontando para versão PT
- [ ] Conteúdo traduzido (não machine-translated cru — usar Claude Haiku para qualidade)
- [ ] Slugs traduzidos por idioma quando faz sentido (`/en/drinks/mojito` vs `/drinks/caipirinha`)

---

## OG images dinâmicas

- [ ] `/api/og/[slug]/route.tsx` usa `@vercel/og`
- [ ] Inclui: nome do drink, thumb, logo discreta, gradiente da categoria
- [ ] Cache headers: `s-maxage=86400, stale-while-revalidate`
- [ ] Fallback estático em `/public/og-fallback.png`

---

## Acessibilidade (afeta SEO)

- [ ] `lang="pt-BR"` (ou conforme idioma) no `<html>`
- [ ] Contraste WCAG AA mínimo (4.5:1 texto normal)
- [ ] Foco visível em todos os elementos interativos
- [ ] Labels em todos os inputs
- [ ] Botões com `aria-label` quando só ícone
- [ ] Skip-to-content link no topo
- [ ] Verificar com `@axe-core/playwright` no e2e

---

## Validação pré-deploy

- [ ] Rich Results Test (Google) — sem erros nem warnings
- [ ] PageSpeed Insights mobile ≥ 95
- [ ] Schema.org validator
- [ ] Mobile-Friendly Test
- [ ] Validar sitemap em https://www.xml-sitemaps.com/validate-xml-sitemap.html

---

## Pós-deploy

- [ ] Submeter sitemap ao Google Search Console
- [ ] Submeter ao Bing Webmaster Tools
- [ ] Configurar GA4 ou Plausible
- [ ] Monitorar Core Web Vitals reais em Vercel Analytics
- [ ] Verificar indexação semana após semana
