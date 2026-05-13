# docs/API_SPEC.md — Endpoints do MVP original (referência)

> Referência para preservar compatibilidade. Todos os endpoints abaixo devem ser implementados em `app/api/` com mesma forma de request/response.

Fonte: Documentação API do projeto original "The Drinking Man".

---

## 🔐 Autenticação

### `POST /api/auth/login`

Autentica um usuário.

**Request:**

```json
{ "username": "string", "password": "string" }
```

**Response 200:**

```json
{
  "id": "cuid",
  "username": "string",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

**Response 401:**

```json
{ "error": "Unauthorized" }
```

> **Nota de migração:** no MVP novo, autenticação principal é Supabase Auth. Este endpoint pode ser mantido como compatibilidade ou substituído por `POST /api/auth/signin` do Supabase.

---

## 🍹 Bares

### `GET /api/bar?userId={userId}`

Retorna bares do usuário (próprios + compartilhados).

### `POST /api/bar`

Cria bar. Body: `{ "name": "...", "creatorId": "..." }`

### `GET /api/bar/[id]`

Detalhes de um bar (com `inventory` e `sharedWith`).

### `PUT /api/bar/[id]`

Atualiza bar. Body: `{ "name": "..." }`

### `DELETE /api/bar/[id]`

Deleta bar. Response: `{ "success": true }`

---

## 📦 Inventário

### `GET /api/bar/[id]/inventory`

Lista itens do inventário.

### `POST /api/bar/[id]/inventory`

Adiciona item. Body:

```json
{
  "ingredientId": "string | null",
  "customName": "string (required se ingredientId null)",
  "category": "ingredient | food | drink",
  "quantity": "float",
  "unit": "ml | oz | pieces | ..."
}
```

### `PUT /api/bar/[id]/inventory/[itemId]`

Atualiza quantidade/unidade.

### `DELETE /api/bar/[id]/inventory/[itemId]`

Remove item.

---

## 👥 Compartilhamento

### `POST /api/bar/[id]/share`

Body: `{ "userId": "...", "sharedWithUserId": "..." }`

### `DELETE /api/bar/[id]/share/[userId]`

Remove compartilhamento.

---

## 🥃 Ingredientes

### `GET /api/ingredients?type={type}&search={query}`

Lista ingredientes com filtros opcionais.

### `POST /api/ingredients`

Cria ingrediente. Body:

```json
{
  "name": "string (unique)",
  "type": "Spirit | Mixer | Garnish | ...",
  "description": "string",
  "image": "URL"
}
```

### `GET /api/ingredients/[id]`

Detalhes do ingrediente, incluindo `cocktails: [{ cocktailId, measure, measureML }]`.

---

## 🍸 Coquetéis

### `GET /api/cocktails`

Query params: `search`, `category`, `alcoholic`, `limit` (default 20), `offset` (default 0).

Retorna lista com campos completos incluindo `ingredients[]`, `description*`, `history*`, `funFact*` em múltiplos idiomas.

### `GET /api/cocktails/[id]`

Detalhes completos de um coquetel.

---

## 🤖 IA — Drinking Man

### `POST /api/drinking-man/suggest`

Body:

```json
{
  "baseSpirit": "Vodka | Rum | ...",
  "flavorProfile": ["Sweet", "Sour", ...],
  "occasion": "Party | Dinner | ...",
  "mood": "Adventurous | Calm | ...",
  "locale": "en | pt | es",
  "unavailableIngredients": ["string"],
  "desiredIngredients": ["string"]
}
```

Response: nome, descrição, ingredientes formatados, instruções, whyItFits, history, funFact, visualMatch.

### `GET /api/drinking-man/random?locale={locale}`

Coquetel aleatório enriquecido.

### `POST /api/drinking-man/enrich`

Body: `{ "cocktailId": "...", "locale": "pt" }`
Response: `{ history, funFact, foodPairings[], servingTips, similarDrinks[] }`

### `POST /api/drinking-man/description`

Body: `{ "name": "...", "ingredients": [...] }`
Response: string (descrição poética).

---

## Novos endpoints (não estavam no MVP)

### `POST /api/chatbot` (streaming)

Body: `{ "messages": [...], "selectedIngredients": [...] }`
Response: SSE stream (Vercel AI SDK format).
Requer auth ou rate limit por IP.

### `POST /api/stripe/checkout`

Body: `{ "priceId": "..." }`
Response: `{ "url": "https://checkout.stripe.com/..." }`

### `POST /api/stripe/webhook`

Handler dos eventos Stripe.

### `GET /api/stripe/portal`

Redirect 302 para customer portal.

### `POST /api/cocktails/[id]/comments`

Body: `{ "body": "string" }`. Requer auth.

### `POST /api/user-drinks`

Multipart form. Requer auth.
Fields: `name`, `description`, `cocktailId?`, `comment`, `image` (file).

### `GET /api/og/[slug]`

Retorna PNG 1200×630 da página do drink (OG image).
