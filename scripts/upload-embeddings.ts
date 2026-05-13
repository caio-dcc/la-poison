import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in env')
  process.exit(1)
}

interface EmbeddedDrink {
  id: string
  name: string
  embedding: number[]
}

async function uploadEmbeddings() {
  const embeddedPath = path.join(__dirname, 'data', 'raw', 'cocktails-embedded.json')

  if (!fs.existsSync(embeddedPath)) {
    console.error(`❌ File not found: ${embeddedPath}`)
    console.error('Run "npx tsx scripts/generate-embeddings.ts" first')
    process.exit(1)
  }

  console.log('📥 Loading embeddings...')
  const drinks: EmbeddedDrink[] = JSON.parse(fs.readFileSync(embeddedPath, 'utf-8'))
  console.log(`✓ Loaded ${drinks.length} drinks with embeddings\n`)

  const batchSize = 100
  let uploaded = 0

  try {
    for (let i = 0; i < drinks.length; i += batchSize) {
      const batch = drinks.slice(i, Math.min(i + batchSize, drinks.length))
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(drinks.length / batchSize)

      console.log(`📤 Batch ${batchNum}/${totalBatches} (${batch.length} drinks)...`)

      // Transform batch for database (only id and embedding)
      const batchPayload = batch.map(drink => ({
        id: drink.id,
        embedding: drink.embedding,
      }))

      const response = await fetch(`${SUPABASE_URL}/functions/v1/embeddings-upsert`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drinks: batchPayload }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Batch upload failed (${response.status}): ${error}`)
      }

      const result = (await response.json()) as { upserted: number }
      uploaded += result.upserted || 0
      console.log(`   ✓ Batch uploaded (${result.upserted} rows)`)
    }

    console.log(`\n✅ Upload complete!`)
    console.log(`  Total embeddings uploaded: ${uploaded}`)
    console.log(`\nNext step: Test semantic search with queries like:`)
    console.log(`  SELECT * FROM similarity_search(embedding_vector, 5);`)
    console.log(`  SELECT * FROM find_similar_drinks('17222', 5);`)
  } catch (error) {
    console.error('❌ Upload failed:', error)
    process.exit(1)
  }
}

uploadEmbeddings().catch(console.error)

export { uploadEmbeddings }
