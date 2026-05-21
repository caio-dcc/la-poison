#!/usr/bin/env node
/**
 * enrich-direct.mjs
 *
 * Enrich cocktails with AI-generated descriptions, history, and fun facts.
 * Fetches cocktails missing description_en from Supabase, sends batches to
 * Claude claude-haiku-4-5-20251001, and upserts results back to the DB.
 *
 * Cost estimate: ~$0.003 per cocktail × 425 = ~$1.30 total
 * Time estimate: ~15-20 min for all 425
 *
 * Usage:
 *   node scripts/enrich-direct.mjs              # all unenriched
 *   node scripts/enrich-direct.mjs --limit 20   # test with 20 first
 *   node scripts/enrich-direct.mjs --slug mojito # single drink
 */
import { fileURLToPath } from 'url'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY')
  process.exit(1)
}

const REST = `${SUPABASE_URL}/rest/v1`
const AUTH = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }

const args = process.argv.slice(2)
const limitArg = args.indexOf('--limit')
const slugArg = args.indexOf('--slug')
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1]) : 0
const SINGLE_SLUG = slugArg !== -1 ? args[slugArg + 1] : null

async function fetchUnenriched() {
  let url = `${REST}/cocktails?select=id,name,slug,category,instructions,ingredients:cocktail_ingredients(measure_text,ingredients(name))&description_en=is.null&order=name`
  if (SINGLE_SLUG) url = `${REST}/cocktails?select=id,name,slug,category,instructions,ingredients:cocktail_ingredients(measure_text,ingredients(name))&slug=eq.${SINGLE_SLUG}`
  if (LIMIT) url += `&limit=${LIMIT}`

  const res = await fetch(url, { headers: AUTH })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function buildPrompt(drinks) {
  const list = drinks.map((d, i) => {
    const ings = (d.ingredients || [])
      .map(r => {
        const ing = Array.isArray(r.ingredients) ? r.ingredients[0] : r.ingredients
        return `${ing?.name || '?'} ${r.measure_text || ''}`.trim()
      })
      .join(', ')
    return `${i + 1}. ${d.name} (${d.category || 'Cocktail'}) — Ingredients: ${ings || 'n/a'} — Instructions: ${(d.instructions || '').slice(0, 200)}`
  }).join('\n')

  return `You are a cocktail expert. For each cocktail below generate concise content in PT, EN, and ES.

Return ONLY a JSON array, no markdown, no extra text. Each element:
{
  "slug": "...",
  "description_pt": "1-2 sentences PT",
  "description_en": "1-2 sentences EN",
  "description_es": "1-2 sentences ES",
  "history_pt": "1-2 sentences PT",
  "history_en": "1-2 sentences EN",
  "history_es": "1-2 sentences ES",
  "fun_fact_pt": "1 sentence PT",
  "fun_fact_en": "1 sentence EN",
  "fun_fact_es": "1 sentence ES",
  "instructions_pt": "full translation of instructions to PT",
  "instructions_en": "English instructions (copy or rephrase original)"
}

Cocktails:
${list}`
}

async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

async function upsertEnrichment(items) {
  for (const item of items) {
    const { slug, ...fields } = item
    const res = await fetch(`${REST}/cocktails?slug=eq.${slug}`, {
      method: 'PATCH',
      headers: { ...AUTH, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(fields),
    })
    if (!res.ok) {
      const txt = await res.text()
      console.error(`  FAIL ${slug}: ${txt.slice(0, 120)}`)
    }
  }
}

async function main() {
  console.log('LaPoison — AI Enrichment\n')

  const drinks = await fetchUnenriched()
  if (!drinks.length) {
    console.log('All cocktails are already enriched.')
    return
  }
  console.log(`Found ${drinks.length} unenriched cocktails`)

  const BATCH = 15
  let done = 0
  let failed = 0

  for (let i = 0; i < drinks.length; i += BATCH) {
    const batch = drinks.slice(i, i + BATCH)
    const prompt = buildPrompt(batch)

    try {
      const raw = await callClaude(prompt)
      // Extract JSON array from response
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error(`  Batch ${i}: no JSON array in response`)
        console.error('  Raw:', raw.slice(0, 300))
        failed += batch.length
        continue
      }
      const enriched = JSON.parse(jsonMatch[0])

      // Merge slugs from batch if Claude dropped them
      const slugMap = new Map(batch.map(d => [d.name.toLowerCase(), d.slug]))
      const withSlugs = enriched.map((e, idx) => ({
        slug: e.slug || batch[idx]?.slug || slugMap.get(e.name?.toLowerCase()),
        ...e,
      })).filter(e => e.slug)

      await upsertEnrichment(withSlugs)
      done += withSlugs.length
      process.stdout.write(`  ${done}/${drinks.length} enriched\r`)
    } catch (err) {
      console.error(`\n  Batch ${i} failed: ${err.message.slice(0, 200)}`)
      failed += batch.length
    }

    // Small delay to avoid rate limits
    if (i + BATCH < drinks.length) await new Promise(r => setTimeout(r, 500))
  }

  console.log(`\nDone. ${done} enriched, ${failed} failed.`)
}

main().catch(e => { console.error(e); process.exit(1) })
