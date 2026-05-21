#!/usr/bin/env node
/**
 * enrich-via-agent.mjs
 *
 * Facilitates cocktail enrichment using the AI agent itself (Gemini/Claude).
 * Flow:
 *   1. Run without arguments to fetch next 30 unenriched drinks and save to `unenriched_batch.json`.
 *   2. The agent reads `unenriched_batch.json`, generates the translations/metadata, and writes to `enriched_batch.json`.
 *   3. Run `node scripts/enrich-via-agent.mjs --upload` to patch database from `enriched_batch.json`.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BATCH_SIZE = 30

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const REST = `${SUPABASE_URL}/rest/v1`
const AUTH = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json'
}

const rawDir = path.join(__dirname, 'data', 'raw')
if (!fs.existsSync(rawDir)) {
  fs.mkdirSync(rawDir, { recursive: true })
}

const unenrichedPath = path.join(rawDir, 'unenriched_batch.json')
const enrichedPath = path.join(rawDir, 'enriched_batch.json')

async function fetchUnenriched() {
  const url = `${REST}/cocktails?select=id,name,slug,category,instructions,ingredients:cocktail_ingredients(measure_text,ingredients(name))&description_en=is.null&order=name&limit=${BATCH_SIZE}`
  const res = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function uploadEnriched() {
  if (!fs.existsSync(enrichedPath)) {
    console.error(`❌ enriched_batch.json not found at ${enrichedPath}`)
    process.exit(1)
  }

  const items = JSON.parse(fs.readFileSync(enrichedPath, 'utf-8'))
  console.log(`📤 Uploading ${items.length} enriched cocktails...`)

  let success = 0
  let failed = 0

  for (const item of items) {
    const { slug, ...fields } = item
    const res = await fetch(`${REST}/cocktails?slug=eq.${slug}`, {
      method: 'PATCH',
      headers: {
        ...AUTH,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(fields),
    })

    if (res.ok) {
      success++
    } else {
      failed++
      const txt = await res.text()
      console.error(`  ❌ FAIL ${slug}: ${txt.slice(0, 120)}`)
    }
  }

  console.log(`✓ Uploaded: ${success} successfully, ${failed} failed.`)

  // Cleanup files
  try {
    if (fs.existsSync(unenrichedPath)) fs.unlinkSync(unenrichedPath)
    if (fs.existsSync(enrichedPath)) fs.unlinkSync(enrichedPath)
    console.log('🧹 Cleaned up batch files.')
  } catch (err) {
    console.warn('⚠️ Cleanup warning:', err.message)
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--upload')) {
    await uploadEnriched()
    return
  }

  console.log('🔍 Fetching next batch of unenriched cocktails...')
  const drinks = await fetchUnenriched()

  if (drinks.length === 0) {
    console.log('🎉 All cocktails are fully enriched!')
    return
  }

  // Format ingredients to keep it simple for the LLM
  const simplified = drinks.map(d => {
    const ings = (d.ingredients || [])
      .map(r => {
        const ing = Array.isArray(r.ingredients) ? r.ingredients[0] : r.ingredients
        return `${ing?.name || '?'} ${r.measure_text || ''}`.trim()
      })
      .join(', ')
    return {
      name: d.name,
      slug: d.slug,
      category: d.category,
      ingredients: ings,
      instructions: d.instructions
    }
  })

  fs.writeFileSync(unenrichedPath, JSON.stringify(simplified, null, 2), 'utf-8')
  console.log(`📝 Wrote ${simplified.length} drinks to: ${unenrichedPath}`)
  console.log('\n👉 Instructions for the AI Agent:')
  console.log('1. Read scripts/data/raw/unenriched_batch.json')
  console.log('2. Generate the enriched translations in PT/EN/ES')
  console.log('3. Write them to scripts/data/raw/enriched_batch.json')
  console.log('4. Run: node scripts/enrich-via-agent.mjs --upload')
}

main().catch(err => {
  console.error('❌ Script failed:', err)
  process.exit(1)
})
