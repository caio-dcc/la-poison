/**
 * enrich-cocktails.js
 *
 * Generates PT/EN/ES content for every cocktail using an AI API
 * and upserts the results directly into Supabase.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... \
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   node scripts/enrich-cocktails.js
 *
 * Optional env:
 *   BATCH_SIZE=5          (cocktails processed in parallel, default 5)
 *   RESUME_FROM_SLUG=abc  (skip slugs alphabetically before this value)
 *   DRY_RUN=true          (print output, do not write to DB)
 *
 * Output fields written per cocktail row:
 *   description_pt, description_en, description_es
 *   history_pt,     history_en,     history_es
 *   fun_fact_pt,    fun_fact_en,    fun_fact_es
 *   food_pairing_pt, food_pairing_en, food_pairing_es
 *   instructions_pt (translated from instructions_en)
 */

import Anthropic from '@anthropic-ai/sdk'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '5', 10)
const RESUME_FROM_SLUG = process.env.RESUME_FROM_SLUG || null
const DRY_RUN = process.env.DRY_RUN === 'true'

if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

const DB_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
  Prefer: 'return=minimal',
}

// ── Fetch all cocktails from Supabase ─────────────────────────────────────────
async function fetchAllCocktails() {
  const cols = [
    'id',
    'name',
    'slug',
    'category',
    'instructions',
    'instructions_en',
    'instructions_pt',
    'instructions_es',
    'description_pt',
    'description_en',
    'description_es',
  ].join(',')

  let all = []
  let offset = 0
  const limit = 500

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cocktails?select=${cols}&order=slug.asc&limit=${limit}&offset=${offset}`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    )
    if (!res.ok) {
      console.error('Fetch error', await res.text())
      process.exit(1)
    }
    const batch = await res.json()
    all = all.concat(batch)
    if (batch.length < limit) break
    offset += limit
  }
  return all
}

// ── Fetch ingredients for a cocktail ─────────────────────────────────────────
async function fetchIngredients(cocktailId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cocktail_ingredients?cocktail_id=eq.${cocktailId}&select=measure_text,ingredients(name)`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  )
  if (!res.ok) return []
  const rows = await res.json()
  return rows
    .map(r => {
      const ing = Array.isArray(r.ingredients) ? r.ingredients[0] : r.ingredients
      return `${r.measure_text || ''} ${ing?.name || ''}`.trim()
    })
    .filter(Boolean)
}

// ── Build prompt ──────────────────────────────────────────────────────────────
function buildPrompt(cocktail, ingredients, instructionsEn) {
  return `You are a professional mixologist and food writer. Generate multilingual content for the cocktail below.

Cocktail: ${cocktail.name}
Category: ${cocktail.category || 'cocktail'}
Ingredients: ${ingredients.join(', ')}
Instructions (EN): ${instructionsEn || 'Not available'}

Return a JSON object with EXACTLY these keys (no extras, no markdown fences):
{
  "description_en": "2–3 sentence engaging description in English. Mention flavor profile, occasion, and why it is special.",
  "description_pt": "Same description translated to Brazilian Portuguese (pt-BR). Natural, not robotic.",
  "description_es": "Same description translated to Latin American Spanish. Natural, not robotic.",
  "history_en": "1–2 sentences about the origin or history of this cocktail. If unknown, write a plausible origin based on its ingredients and style.",
  "history_pt": "Same history in Brazilian Portuguese.",
  "history_es": "Same history in Latin American Spanish.",
  "fun_fact_en": "One interesting fun fact or trivia about this cocktail or its main ingredient.",
  "fun_fact_pt": "Same fun fact in Brazilian Portuguese.",
  "fun_fact_es": "Same fun fact in Latin American Spanish.",
  "food_pairing_en": "1–2 sentences suggesting food pairings or occasions for this cocktail.",
  "food_pairing_pt": "Same food pairing in Brazilian Portuguese.",
  "food_pairing_es": "Same food pairing in Latin American Spanish.",
  "instructions_pt": "Translation of the English instructions to Brazilian Portuguese. Preserve the same steps and measures.",
  "instructions_es": "Translation of the English instructions to Latin American Spanish. Preserve the same steps and measures."
}

Rules:
- All text values must be plain strings, no HTML, no markdown
- description_* should be 40–80 words
- history_*, fun_fact_*, food_pairing_* should be 20–50 words each
- instructions_* should mirror the English original in length
- Return ONLY the JSON object, nothing else`
}

// ── Call Claude ────────────────────────────────────────────────────────────────
async function enrichCocktail(cocktail) {
  const ingredients = await fetchIngredients(cocktail.id)
  const instructionsEn = cocktail.instructions_en || cocktail.instructions || ''

  const prompt = buildPrompt(cocktail, ingredients, instructionsEn)

  let attempt = 0
  while (attempt < 3) {
    try {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = message.content[0]?.text?.trim() || ''
      // Strip markdown fences if the model adds them despite instructions
      const clean = raw
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim()
      const parsed = JSON.parse(clean)

      // Validate required keys
      const required = [
        'description_en',
        'description_pt',
        'description_es',
        'history_en',
        'history_pt',
        'history_es',
        'fun_fact_en',
        'fun_fact_pt',
        'fun_fact_es',
        'food_pairing_en',
        'food_pairing_pt',
        'food_pairing_es',
        'instructions_pt',
        'instructions_es',
      ]
      for (const key of required) {
        if (!parsed[key]) throw new Error(`Missing key: ${key}`)
      }

      return parsed
    } catch (err) {
      attempt++
      console.warn(`  [${cocktail.slug}] attempt ${attempt} failed: ${err.message}`)
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  return null
}

// ── Upsert to Supabase ────────────────────────────────────────────────────────
async function upsertCocktail(id, data) {
  if (DRY_RUN) {
    console.log(`  [DRY_RUN] would write:`, JSON.stringify(data).slice(0, 120), '...')
    return true
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cocktails?id=eq.${id}`, {
    method: 'PATCH',
    headers: DB_HEADERS,
    body: JSON.stringify(data),
  })
  return res.ok
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nLaPoison Cocktail Enrichment`)
  console.log(`Model: claude-haiku-4-5-20251001 | Batch: ${BATCH_SIZE} | DryRun: ${DRY_RUN}`)
  if (RESUME_FROM_SLUG) console.log(`Resuming from slug: ${RESUME_FROM_SLUG}`)

  const cocktails = await fetchAllCocktails()
  console.log(`Fetched ${cocktails.length} cocktails from DB\n`)

  // Filter: skip already-enriched (has description_en) unless forced
  let queue = cocktails.filter(c => !c.description_en)

  if (RESUME_FROM_SLUG) {
    queue = queue.filter(c => c.slug >= RESUME_FROM_SLUG)
  }

  console.log(`To enrich: ${queue.length} cocktails\n`)

  let done = 0
  let failed = 0

  // Process in batches
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async cocktail => {
        process.stdout.write(
          `  [${String(done + 1).padStart(4)}/${queue.length}] ${cocktail.slug} ... `
        )

        const data = await enrichCocktail(cocktail)
        if (!data) {
          console.log('FAILED')
          failed++
          done++
          return
        }

        const ok = await upsertCocktail(cocktail.id, data)
        console.log(ok ? 'OK' : 'DB_ERROR')
        if (!ok) failed++
        done++
      })
    )

    // Rate limit pause between batches (Haiku tier is generous, but be polite)
    if (i + BATCH_SIZE < queue.length) {
      await new Promise(r => setTimeout(r, 400))
    }
  }

  console.log(`\nDone. ${done - failed} succeeded, ${failed} failed.`)
  if (failed > 0) {
    console.log(`Re-run with RESUME_FROM_SLUG=<last_successful_slug> to retry failures.`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
