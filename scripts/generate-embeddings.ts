import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { pipeline, env } from '@xenova/transformers'

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

interface EmbeddedDrink extends ProcessedDrink {
  embedding: number[]
}

// Disable remote model downloading (use local cache)
env.allowLocalModels = true

const cocktailsPath = path.join(__dirname, 'data', 'raw', 'cocktails.json')
const cocktails: ProcessedDrink[] = JSON.parse(fs.readFileSync(cocktailsPath, 'utf-8'))

async function generateEmbeddings() {
  console.log('🤖 Generating embeddings for cocktails...\n')
  console.log(`Total cocktails: ${cocktails.length}`)
  console.log(`Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)`)
  console.log(`This may take 2-5 minutes on first run (downloads model ~80MB)\n`)

  try {
    // Load the embedding model
    console.log('📥 Loading transformer model...')
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    console.log('✓ Model loaded\n')

    const embedded: EmbeddedDrink[] = []
    const batchSize = 50
    let processed = 0

    for (let i = 0; i < cocktails.length; i += batchSize) {
      const batch = cocktails.slice(i, Math.min(i + batchSize, cocktails.length))
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(cocktails.length / batchSize)

      console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} drinks)...`)

      for (const drink of batch) {
        // Create rich text representation for embedding
        const embeddingText = [
          drink.name,
          drink.category,
          drink.instructions_en,
          drink.ingredients.map(ing => ing.name).join(' '),
          drink.tags?.join(' ') || '',
        ]
          .filter(Boolean)
          .join(' ')

        try {
          // Generate embedding (returns 384-dimensional vector)
          const result = await extractor(embeddingText, {
            pooling: 'mean',
            normalize: true,
          })

          // Extract vector as array
          const embedding = Array.from(result.data)

          embedded.push({
            ...drink,
            embedding,
          })

          processed++
          if (processed % 50 === 0) {
            console.log(`   ✓ ${processed}/${cocktails.length} drinks processed`)
          }
        } catch (error) {
          console.error(`   ✗ Failed to embed drink ${drink.id} (${drink.name}):`, error)
          throw error
        }
      }
    }

    // Save embeddings to file
    const outputPath = path.join(__dirname, 'data', 'raw', 'cocktails-embedded.json')
    fs.writeFileSync(outputPath, JSON.stringify(embedded, null, 2))

    console.log(`\n✅ Embedding generation complete!`)
    console.log(`  Total drinks embedded: ${embedded.length}`)
    console.log(`  Vector dimensions: 384`)
    console.log(`  Output: ${outputPath}`)
    console.log(`\n📊 Sample embedding (first 10 dims of first drink):`)
    console.log(`  ${embedded[0].name}: [${embedded[0].embedding.slice(0, 10).join(', ')}...]`)
    console.log(`\nNext step: Update schema to store vectors in PostgreSQL via Edge Functions.`)
  } catch (error) {
    console.error('❌ Embedding generation failed:', error)
    process.exit(1)
  }
}

generateEmbeddings().catch(console.error)

export { generateEmbeddings, EmbeddedDrink }
