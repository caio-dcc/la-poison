import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const cocktailsPath = path.join(__dirname, 'data', 'raw', 'cocktails.json')
const cocktails = JSON.parse(fs.readFileSync(cocktailsPath, 'utf-8'))

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

const isValidApiKey =
  ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.startsWith('sk-ant-') && ANTHROPIC_API_KEY.length > 20
const isDemoMode = !isValidApiKey

if (isDemoMode) {
  // Demo mode: show workflow without actual API calls
}

async function enrichBatch(batch) {
  const drinksList = batch
    .map(
      (d, idx) => `
${idx + 1}. **${d.name}** (${d.category})
   Ingredients: ${d.ingredients.map(i => i.name).join(', ')}
   Instructions (EN): ${d.instructions_en}
`
    )
    .join('\n')

  const prompt = `You are a cocktail expert and writer. For each cocktail below, generate SHORT enriched content in exactly 3 languages (PT, EN, ES).

For EACH cocktail, respond with ONLY valid JSON (no markdown, no "json" prefix, no extra text). The JSON must be an array of objects like this:

[
  {
    "id": "17222",
    "description_pt": "Short description in Portuguese (1-2 sentences)",
    "description_en": "Short description in English (1-2 sentences)",
    "description_es": "Short description in Spanish (1-2 sentences)",
    "history_pt": "Brief history in Portuguese (1-2 sentences)",
    "history_en": "Brief history in English (1-2 sentences)",
    "history_es": "Brief history in Spanish (1-2 sentences)",
    "fun_fact_pt": "Interesting fact in Portuguese (1 sentence)",
    "fun_fact_en": "Interesting fact in English (1 sentence)",
    "fun_fact_es": "Interesting fact in Spanish (1 sentence)",
    "meta_title_pt": "SEO title in Portuguese (max 60 chars)",
    "meta_title_en": "SEO title in English (max 60 chars)",
    "meta_title_es": "SEO title in Spanish (max 60 chars)",
    "meta_desc_pt": "SEO description in Portuguese (140-160 chars)",
    "meta_desc_en": "SEO description in English (140-160 chars)",
    "meta_desc_es": "SEO description in Spanish (140-160 chars)"
  },
  ...
]

Cocktails to enrich:
${drinksList}

Output ONLY the JSON array above, nothing else.`

  if (isDemoMode) {
    return `batch_demo_${Date.now()}_${batch[0].id}`
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages/batches', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        requests: batch.map(drink => ({
          custom_id: drink.id,
          params: {
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          },
        })),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} — ${error}`)
    }

    const batch_data = await response.json()
    console.log(`✓ Batch submitted: ${batch_data.id}`)
    return batch_data.id
  } catch (error) {
    console.error('❌ Batch submission failed:', error)
    throw error
  }
}

async function enrichDatabase() {
  console.log('🤖 Starting AI enrichment via Claude Haiku (Batches API)...\n')
  console.log(`Total cocktails to enrich: ${cocktails.length}`)
  console.log(`Batch size: 50 cocktails`)
  console.log(`Estimated cost: ~$3 (425 drinks × ~50 tokens each @ Haiku pricing)`)
  console.log(`Estimated batches: ${Math.ceil(cocktails.length / 50)}\n`)

  if (isDemoMode) {
    console.log(
      `⚠️  DEMO MODE: ANTHROPIC_API_KEY not valid (must start with sk-ant- and be 20+ chars)\n`
    )
  }

  const BATCH_SIZE = 50
  const batchIds = []
  let batchCount = 0

  try {
    for (let i = 0; i < cocktails.length; i += BATCH_SIZE) {
      batchCount++
      const batch = cocktails.slice(i, Math.min(i + BATCH_SIZE, cocktails.length))
      console.log(`\n📦 Batch ${batchCount} (${batch.length} drinks)...`)

      try {
        const batchId = await enrichBatch(batch)
        batchIds.push(batchId)
        console.log(`   ✓ Batch ${batchCount} submitted (ID: ${batchId})`)
      } catch (error) {
        console.error(`   ✗ Batch ${batchCount} failed:`, error)
        throw error
      }

      // Rate limiting: 2s between batch submissions
      if (i + BATCH_SIZE < cocktails.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Save batch IDs for later collection
    const batchIdsPath = path.join(__dirname, 'data', 'raw', 'batch-ids.json')
    fs.writeFileSync(
      batchIdsPath,
      JSON.stringify({ batches: batchIds, created_at: new Date().toISOString() }, null, 2)
    )

    console.log(`\n✅ All ${batchCount} batches submitted!`)
    console.log(`\n📋 Batch IDs saved to: ${batchIdsPath}`)
    console.log(`\n⏳ Batch processing started. Check status at:`)
    console.log(`   https://console.anthropic.com/account/usage/batches`)
    console.log(
      `\nNext step: Run 'node scripts/collect-enrichment.js <batch-id>' to collect results.`
    )
    console.log(`\nBatch IDs:`)
    batchIds.forEach((id, idx) => console.log(`   ${idx + 1}. ${id}`))
  } catch (error) {
    console.error('❌ Enrichment failed:', error)
    process.exit(1)
  }
}

enrichDatabase().catch(console.error)
