import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface ProcessedDrink {
  id: string
  name: string
  slug: string
  category: string
  category_slug: string
  alcoholic: boolean
  ibadrink: boolean
  instructions_en: string
  instructions_es: string | null
  thumb_url: string
  ingredients: Array<{
    name: string
    measure: string
    amount_ml: number | null
  }>
  tags: string[]
}

interface EnrichedDrink extends ProcessedDrink {
  description_pt: string
  description_en: string
  description_es: string
  history_pt: string
  history_en: string
  history_es: string
  fun_fact_pt: string
  fun_fact_en: string
  fun_fact_es: string
  meta_title_pt: string
  meta_title_en: string
  meta_title_es: string
  meta_desc_pt: string
  meta_desc_en: string
  meta_desc_es: string
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY required in env')
  process.exit(1)
}

const batchId = process.argv[2]
if (!batchId) {
  console.error('❌ Usage: npx tsx scripts/collect-enrichment.ts <batch-id>')
  process.exit(1)
}

async function collectBatchResults() {
  console.log(`📥 Collecting results for batch: ${batchId}\n`)

  try {
    const response = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, {
      method: 'GET',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} — ${error}`)
    }

    const batch = await response.json()
    console.log(`Batch status: ${batch.processing_status}`)
    console.log(
      `Request count: ${batch.request_counts?.succeeded || 0} succeeded, ${batch.request_counts?.errored || 0} errored`
    )

    if (batch.processing_status !== 'succeeded') {
      console.log(`⏳ Batch still processing. Check again in a few minutes.`)
      return
    }

    // Load original cocktails
    const cocktailsPath = path.join(__dirname, 'data', 'raw', 'cocktails.json')
    const cocktails: ProcessedDrink[] = JSON.parse(fs.readFileSync(cocktailsPath, 'utf-8'))
    const enrichedMap = new Map<string, Partial<EnrichedDrink>>()

    // Process results via result stream URL
    if (batch.result_url) {
      console.log(`\n📂 Fetching results from ${batch.result_url}...`)
      const resultsResponse = await fetch(batch.result_url, {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      })

      if (!resultsResponse.ok) {
        throw new Error(`Failed to fetch results: ${resultsResponse.status}`)
      }

      const text = await resultsResponse.text()
      const lines = text.trim().split('\n')

      for (const line of lines) {
        if (!line.trim()) continue

        const result = JSON.parse(line)
        const customId = result.custom_id
        const responseContent = result.result.message.content[0].text

        try {
          const enrichments = JSON.parse(responseContent)
          if (Array.isArray(enrichments)) {
            for (const enrichment of enrichments) {
              enrichedMap.set(enrichment.id, enrichment)
            }
          }
        } catch (parseError) {
          console.error(`⚠ Failed to parse response for drink ${customId}:`, parseError)
        }
      }
    }

    // Merge enrichments into original cocktails
    const enrichedCocktails: EnrichedDrink[] = cocktails.map(cocktail => {
      const enrichment = enrichedMap.get(cocktail.id) || {}
      return {
        ...cocktail,
        description_pt: enrichment.description_pt || 'N/A',
        description_en: enrichment.description_en || 'N/A',
        description_es: enrichment.description_es || 'N/A',
        history_pt: enrichment.history_pt || 'N/A',
        history_en: enrichment.history_en || 'N/A',
        history_es: enrichment.history_es || 'N/A',
        fun_fact_pt: enrichment.fun_fact_pt || 'N/A',
        fun_fact_en: enrichment.fun_fact_en || 'N/A',
        fun_fact_es: enrichment.fun_fact_es || 'N/A',
        meta_title_pt: enrichment.meta_title_pt || cocktail.name,
        meta_title_en: enrichment.meta_title_en || cocktail.name,
        meta_title_es: enrichment.meta_title_es || cocktail.name,
        meta_desc_pt: enrichment.meta_desc_pt || '',
        meta_desc_en: enrichment.meta_desc_en || '',
        meta_desc_es: enrichment.meta_desc_es || '',
      }
    })

    // Save enriched cocktails
    const outputPath = path.join(__dirname, 'data', 'raw', 'cocktails-enriched.json')
    fs.writeFileSync(outputPath, JSON.stringify(enrichedCocktails, null, 2))

    console.log(`\n✅ Enrichment complete!`)
    console.log(`  Enriched drinks: ${enrichedCocktails.length}`)
    console.log(`  Successful enrichments: ${enrichedMap.size}`)
    console.log(`  Output: ${outputPath}`)
    console.log(`\nNext step: Run 'node scripts/seed-db.js' with the enriched data.`)
  } catch (error) {
    console.error('❌ Collection failed:', error)
    process.exit(1)
  }
}

collectBatchResults().catch(console.error)
