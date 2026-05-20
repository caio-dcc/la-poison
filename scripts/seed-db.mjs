#!/usr/bin/env node
/**
 * Real Supabase REST seeder.
 * Idempotent: uses upsert (on_conflict) on slug.
 *
 * Order:
 *   1. categories  (slug PK)
 *   2. ingredients (name UNIQUE; we resolve by name lookup)
 *   3. backfill cocktails: instructions_en/_es, category, abv etc.
 *   4. cocktail_ingredients (cocktail_id, ingredient_id)
 *
 * Env: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const REST = `${SUPABASE_URL}/rest/v1`
const HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function rest(method, pathRel, body, extraHeaders = {}) {
  const res = await fetch(REST + pathRel, {
    method,
    headers: { ...HEADERS, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${method} ${pathRel} -> ${res.status}: ${text.substring(0, 400)}`)
  }
  return text ? JSON.parse(text) : null
}

function inferType(name) {
  const lower = name.toLowerCase()
  if (/(vodka|rum|gin|tequila|whisk|whiskey|whisky|brandy|cognac|cachaça|cachaca|pisco|absinthe|mezcal)/.test(lower)) return 'spirit'
  if (/(liqueur|liquor|cointreau|kahlua|baileys|amaretto|chartreuse|sambuca|marnier|curacao|triple sec|galliano|frangelico|midori|drambuie|aperol|campari)/.test(lower)) return 'liqueur'
  if (/(juice)/.test(lower)) return 'juice'
  if (/(syrup|grenadine|honey|sugar)/.test(lower)) return 'syrup'
  if (/(bitters)/.test(lower)) return 'bitters'
  if (/(vermouth)/.test(lower)) return 'vermouth'
  if (/(wine|champagne|prosecco|cava|port|sherry)/.test(lower)) return 'wine'
  if (/(beer|ale|lager|stout)/.test(lower)) return 'other'
  if (/(mint|basil|rosemary|thyme|sage|cilantro|parsley)/.test(lower)) return 'herb'
  if (/(cinnamon|nutmeg|clove|allspice|peppercorn|cardamom|pepper)/.test(lower)) return 'spice'
  if (/(soda|tonic|cola|water|milk|cream|coffee|tea|cocoa|chocolate)/.test(lower)) return 'mixer'
  if (/(lemon|lime|orange|cherry|berry|apple|pineapple|banana|peach|strawberry|fruit)/.test(lower)) return 'other'
  return 'other'
}

async function main() {
  console.log('--- LaPoison real seeder ---')

  // 1. Load source data
  const cocktailsPath = path.join(__dirname, 'data', 'raw', 'cocktails.json')
  const ingredientsI18nPath = path.join(__dirname, 'data', 'i18n', 'ingredients.json')
  const categoriesI18nPath = path.join(__dirname, 'data', 'i18n', 'categories.json')
  const imageMapPath = path.join(__dirname, 'data', 'raw', 'image-map.json')

  const cocktails = JSON.parse(fs.readFileSync(cocktailsPath, 'utf-8'))
  const ingredientsI18n = JSON.parse(fs.readFileSync(ingredientsI18nPath, 'utf-8')).ingredients
  const categoriesI18n = JSON.parse(fs.readFileSync(categoriesI18nPath, 'utf-8')).categories
  const imageMap = fs.existsSync(imageMapPath) ? JSON.parse(fs.readFileSync(imageMapPath, 'utf-8')) : {}

  // 2. Compute all distinct ingredient names actually referenced
  const allIngredientNames = new Set()
  for (const d of cocktails) for (const i of d.ingredients) allIngredientNames.add(i.name)

  // 3. Compute all distinct category names actually referenced
  const allCategoryNames = new Set()
  for (const d of cocktails) if (d.category) allCategoryNames.add(d.category)

  // -- CATEGORIES --
  console.log(`\n[1/4] Seeding categories (${allCategoryNames.size} from data + curated)...`)
  const curatedCats = new Map(categoriesI18n.map(c => [c.slug || slugify(c.name), c]))
  const categoryRows = []
  for (const name of allCategoryNames) {
    const slug = slugify(name)
    const curated = curatedCats.get(slug)
    categoryRows.push({
      name,
      slug,
      name_i18n: curated?.name_i18n || { pt: name, en: name, es: name },
    })
  }
  // upsert by slug (slug is UNIQUE NOT NULL per migration 004)
  try {
    await rest('POST', '/categories?on_conflict=slug', categoryRows, { Prefer: 'resolution=merge-duplicates,return=minimal' })
    console.log(`   ${categoryRows.length} categories upserted`)
  } catch (e) {
    // Fallback: skip-existing
    const existing = await rest('GET', '/categories?select=slug')
    const existingSlugs = new Set(existing.map(r => r.slug))
    const toInsert = categoryRows.filter(r => !existingSlugs.has(r.slug))
    if (toInsert.length) await rest('POST', '/categories', toInsert, { Prefer: 'return=minimal' })
    console.log(`   ${existing.length} existing + ${toInsert.length} new categories`)
  }

  const categoriesRes = await rest('GET', '/categories?select=id,slug,name')
  const categoryBySlug = new Map(categoriesRes.map(c => [c.slug, c]))
  const categoryByName = new Map(categoriesRes.map(c => [c.name.toLowerCase(), c]))

  // -- INGREDIENTS --
  console.log(`\n[2/4] Seeding ingredients (${allIngredientNames.size} unique)...`)
  const curatedIng = new Map(ingredientsI18n.map(i => [i.name.toLowerCase(), i]))
  const ingredientRows = []
  const seenSlugs = new Set()
  for (const name of allIngredientNames) {
    const curated = curatedIng.get(name.toLowerCase())
    let slug = curated?.slug || slugify(name)
    if (seenSlugs.has(slug)) slug = slug + '-' + Math.random().toString(36).slice(2, 6)
    seenSlugs.add(slug)
    ingredientRows.push({
      name,
      slug,
      type: curated?.type || inferType(name),
      name_i18n: curated?.name_i18n || { pt: name, en: name, es: name },
      aliases_i18n: curated?.aliases_i18n || { pt: [], en: [], es: [] },
    })
  }

  // Detect existing rows so we only INSERT what's missing (no unique-name constraint guaranteed)
  const existingIngs = await rest('GET', '/ingredients?select=name,slug,name_i18n&limit=2000')
  const existingByName = new Map(existingIngs.map(r => [r.name.toLowerCase(), r]))
  const existingBySlug = new Map(existingIngs.map(r => [r.slug, r]))
  const toInsert = ingredientRows.filter(
    r => !existingByName.has(r.name.toLowerCase()) && !existingBySlug.has(r.slug)
  )
  console.log(`   ${existingIngs.length} existing, ${toInsert.length} to insert`)

  // Update existing rows whose name_i18n is empty/blank
  const toUpdate = ingredientRows.filter(r => {
    const existing = existingByName.get(r.name.toLowerCase())
    if (!existing) return false
    const n = existing.name_i18n
    if (!n) return true
    return !n.en && !n.pt && !n.es
  })
  console.log(`   ${toUpdate.length} existing rows have empty name_i18n — patching...`)
  for (const row of toUpdate) {
    try {
      await rest(
        'PATCH',
        `/ingredients?name=eq.${encodeURIComponent(row.name)}`,
        { name_i18n: row.name_i18n, aliases_i18n: row.aliases_i18n, type: row.type, slug: row.slug },
        { Prefer: 'return=minimal' }
      )
    } catch (e) {
      console.log(`     ! ${row.name}: ${e.message.substring(0, 120)}`)
    }
  }

  const BATCH = 50
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)
    try {
      await rest('POST', '/ingredients', batch, { Prefer: 'return=minimal' })
    } catch (e) {
      console.log(`\n   batch ${i} failed: ${e.message.substring(0, 200)}`)
      for (const row of batch) {
        try { await rest('POST', '/ingredients', [row], { Prefer: 'return=minimal' }) }
        catch (err) { console.log(`     ${row.name}: ${err.message.substring(0, 100)}`) }
      }
    }
    process.stdout.write(`   ${Math.min(i + BATCH, toInsert.length)}/${toInsert.length}\r`)
  }
  console.log(`\n   ingredients now total ~${existingIngs.length + toInsert.length}`)

  const ingredientsRes = await rest('GET', '/ingredients?select=id,name&limit=2000')
  const ingredientByName = new Map(ingredientsRes.map(r => [r.name.toLowerCase(), r]))

  // -- COCKTAILS BACKFILL --
  console.log(`\n[3/4] Backfilling cocktails (translations + category_id)...`)
  // We assume instructions_pt/_es columns exist. If migration 006 not applied, this fails and we skip.
  let canWriteInstructionsTranslations = true
  try {
    await rest('PATCH', '/cocktails?slug=eq.__test_probe__', { instructions_es: null })
  } catch (e) {
    if (/instructions_es/.test(e.message)) {
      canWriteInstructionsTranslations = false
      console.log('   ! instructions_es column missing — apply migration 006 to enable per-locale instructions. Skipping translation backfill.')
    } else {
      console.log(`   ! probe failed unexpectedly: ${e.message.substring(0, 200)}`)
    }
  }

  let updated = 0
  let skippedNoCategory = 0
  for (const d of cocktails) {
    const cat = categoryByName.get((d.category || '').toLowerCase()) || categoryBySlug.get(d.category_slug)
    const patch = {
      thumb_url: imageMap[d.slug] || d.thumb_url,
    }
    if (cat) patch.category_id = cat.id
    else skippedNoCategory++
    if (canWriteInstructionsTranslations) {
      patch.instructions_en = d.instructions_en || d.instructions || null
      patch.instructions_es = d.instructions_es || null
      patch.instructions_pt = d.instructions_pt || null
    }
    try {
      await rest('PATCH', `/cocktails?slug=eq.${encodeURIComponent(d.slug)}`, patch, { Prefer: 'return=minimal' })
      updated++
      if (updated % 50 === 0) process.stdout.write(`   ${updated}/${cocktails.length}\r`)
    } catch (e) {
      console.log(`\n   ! ${d.slug}: ${e.message.substring(0, 120)}`)
    }
  }
  console.log(`\n   ${updated} cocktails updated (${skippedNoCategory} had no matching category)`)

  // -- COCKTAIL_INGREDIENTS --
  console.log(`\n[4/4] Seeding cocktail_ingredients...`)
  // Get cocktail ids
  const cocktailsRes = await rest('GET', '/cocktails?select=id,slug&limit=1000')
  const cocktailBySlug = new Map(cocktailsRes.map(c => [c.slug, c]))

  // Clear existing relations first (idempotency)
  // We delete only relations for cocktails we are about to re-seed
  const cocktailIds = cocktails.map(d => cocktailBySlug.get(d.slug)?.id).filter(Boolean)
  // bulk delete in chunks via in.()
  for (let i = 0; i < cocktailIds.length; i += 50) {
    const chunk = cocktailIds.slice(i, i + 50)
    await rest('DELETE', `/cocktail_ingredients?cocktail_id=in.(${chunk.join(',')})`, undefined, { Prefer: 'return=minimal' })
  }

  // Build inserts. Probe whether amount_ml column exists.
  let useAmountMl = true
  try {
    await rest('GET', '/cocktail_ingredients?select=amount_ml&limit=1')
  } catch (e) {
    if (/amount_ml/.test(e.message)) useAmountMl = false
  }
  let useMeasureText = true
  try {
    await rest('GET', '/cocktail_ingredients?select=measure_text&limit=1')
  } catch (e) {
    if (/measure_text/.test(e.message)) useMeasureText = false
  }

  const relationRows = []
  const seenPair = new Set()
  let unmatched = 0
  for (const d of cocktails) {
    const cocktail = cocktailBySlug.get(d.slug)
    if (!cocktail) continue
    for (const [idx, ing] of d.ingredients.entries()) {
      const ingRow = ingredientByName.get(ing.name.toLowerCase())
      if (!ingRow) { unmatched++; continue }
      const key = cocktail.id + ':' + ingRow.id
      if (seenPair.has(key)) continue
      seenPair.add(key)
      const row = {
        cocktail_id: cocktail.id,
        ingredient_id: ingRow.id,
      }
      if (useMeasureText) row.measure_text = ing.measure || null
      else row.measure = ing.measure || null
      if (useAmountMl) row.amount_ml = ing.amount_ml ?? null
      relationRows.push(row)
    }
  }

  console.log(`   ${relationRows.length} relations to insert (${unmatched} unmatched)`)

  for (let i = 0; i < relationRows.length; i += 100) {
    const batch = relationRows.slice(i, i + 100)
    try {
      await rest('POST', '/cocktail_ingredients', batch, { Prefer: 'return=minimal' })
    } catch (e) {
      // try one-by-one on batch failure for diagnostics
      console.log(`\n   batch failed, falling back to per-row. err: ${e.message.substring(0,120)}`)
      for (const row of batch) {
        try { await rest('POST', '/cocktail_ingredients', [row], { Prefer: 'return=minimal' }) }
        catch (err) { console.log(`     row fail: ${err.message.substring(0,120)}`) }
      }
    }
    process.stdout.write(`   ${Math.min(i + 100, relationRows.length)}/${relationRows.length}\r`)
  }
  console.log('')

  // Final counts
  const finals = await Promise.all([
    fetch(`${REST}/categories?select=count`, { headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' } }).then(r => r.headers.get('content-range')),
    fetch(`${REST}/ingredients?select=count`, { headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' } }).then(r => r.headers.get('content-range')),
    fetch(`${REST}/cocktail_ingredients?select=count`, { headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' } }).then(r => r.headers.get('content-range')),
    fetch(`${REST}/cocktails?select=count`, { headers: { ...HEADERS, Prefer: 'count=exact', Range: '0-0' } }).then(r => r.headers.get('content-range')),
  ])
  console.log('\n--- FINAL COUNTS ---')
  console.log(`categories:            ${finals[0]}`)
  console.log(`ingredients:           ${finals[1]}`)
  console.log(`cocktail_ingredients:  ${finals[2]}`)
  console.log(`cocktails:             ${finals[3]}`)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
