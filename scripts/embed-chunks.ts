/**
 * SCRIPT: embed-chunks.ts
 *
 * Embedding pipeline for semantic RAG:
 * 1. Load chunks from cocktail_chunks.json
 * 2. For each chunk, generate 384-dim embedding via Xenova (local, free)
 * 3. Save embeddings to cocktail_chunks_embedded.json
 * 4. Prepare data for pgvector upload to Supabase
 *
 * EMBEDDING MODEL: all-MiniLM-L6-v2 (Xenova)
 * - 384 dimensions (efficient, good quality)
 * - Runs locally (no API cost, privacy)
 * - Speed: ~50ms per chunk on CPU
 * - Quality: Good for semantic search (not perfect for fine-grained retrieval)
 *
 * NOTES:
 * - First run will download model (~80MB)
 * - Subsequent runs use cached model
 * - Process takes ~5-10 mins for 1300+ chunks on CPU
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { pipeline, env } from '@xenova/transformers'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configure Xenova to use local cache
env.allowLocalModels = true
env.allowRemoteModels = true

interface CocktailChunk {
  id: string
  drink_id: string
  chunk_type: string
  language: string
  content: string
  tokens_estimate: number
}

interface EmbeddedChunk extends CocktailChunk {
  embedding: number[] // 384-dim vector
}

/**
 * Embedding Strategy Explained:
 *
 * WHAT IS AN EMBEDDING?
 * Convert text to a numerical vector:
 *   "Caipirinha with lime" → [0.21, -0.45, 0.89, ..., 0.12]  (384 numbers)
 *
 * HOW DOES IT HELP RAG?
 * Semantically similar texts have vectors CLOSE TOGETHER in space:
 *   "Caipirinha"      → [0.21, -0.45, 0.89, ...]
 *   "Lime drink"      → [0.20, -0.44, 0.88, ...] ← CLOSE (cosine similarity ~0.95)
 *   "Sushi recipe"    → [-0.89, 0.12, -0.45, ...] ← FAR (cosine similarity ~0.1)
 *
 * VECTOR SEARCH (at runtime):
 * 1. User asks: "How do I make a drink with lime?"
 * 2. We embed this question: [0.19, -0.43, 0.87, ...]
 * 3. We search PostgreSQL: find all chunks with embedding distance < 0.5
 * 4. Return top-5 closest chunks (e.g., Caipirinha, Margarita, Mojito)
 * 5. Pass to Claude with context → accurate, informed response
 *
 * WHY ALL-MINILM-L6-V2?
 * Trade-off matrix:
 * ┌─────────────────────┬───────────┬──────────┬───────────┐
 * │ Model               │ Dims      │ Speed    │ Quality   │
 * ├─────────────────────┼───────────┼──────────┼───────────┤
 * │ all-MiniLM-L6-v2    │ 384       │ 50ms    │ ⭐⭐⭐⭐   │
 * │ text-embedding-3-sm │ 1536      │ API     │ ⭐⭐⭐⭐⭐ │
 * │ text-embedding-3-lg │ 3072      │ API     │ ⭐⭐⭐⭐⭐⭐│
 * └─────────────────────┴───────────┴──────────┴───────────┘
 *
 * For cocktail domain (well-structured, small vocab):
 * all-MiniLM-L6-v2 is excellent. Only migrate if accuracy degrades.
 *
 * POOLING STRATEGY:
 * - mean pooling: average all token embeddings
 *   → Good for variable-length texts (our chunks are ~20-100 words)
 * - cls pooling: use [CLS] token (sentence representation)
 *   → Better for sentence classification, not our use case
 *
 * We use MEAN POOLING + normalize (L2) for cosine distance.
 *
 * NORMALIZATION:
 * Why? Normalized vectors make cosine similarity = dot product.
 * PostgreSQL HNSW index works better with normalized vectors.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null

async function getEmbedder() {
  if (!embeddingPipeline) {
    console.log('🔄 Loading embedding model (all-MiniLM-L6-v2)...')
    console.log('   (First run: downloads ~80MB model, cached for future runs)')

    try {
      embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      console.log('✓ Embedding model loaded\n')
    } catch (error) {
      console.error('❌ Failed to load embedding model:', error)
      process.exit(1)
    }
  }
  return embeddingPipeline
}

async function embedText(text: string): Promise<number[]> {
  const embedder = await getEmbedder()

  try {
    const output = await embedder(text, {
      pooling: 'mean',
      normalize: true,
    })

    // Convert to regular array and round to save space
    return Array.from(output.data).map(x => Math.round(x * 10000) / 10000)
  } catch (error) {
    console.error(`❌ Embedding failed for text: "${text.slice(0, 50)}..."`)
    throw error
  }
}

async function main() {
  console.log('🧠 Embedding Pipeline for Cocktail RAG\n')
  console.log('Model: Xenova/all-MiniLM-L6-v2')
  console.log('Output: 384-dimensional vectors, normalized (L2)\n')

  try {
    // Load chunks
    const chunksPath = path.join(__dirname, 'data', 'raw', 'cocktail_chunks.json')

    if (!fs.existsSync(chunksPath)) {
      console.error('❌ cocktail_chunks.json not found')
      console.error(`   Run 'npm run chunk' first to generate chunks`)
      process.exit(1)
    }

    const chunks: CocktailChunk[] = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'))
    console.log(`📦 Loaded ${chunks.length} chunks from cocktail_chunks.json\n`)

    // Embed all chunks
    console.log('🔄 Embedding chunks...')
    const embeddedChunks: EmbeddedChunk[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      // Show progress every 100 chunks
      if (i % 100 === 0 && i > 0) {
        const elapsed = (i / chunks.length) * 100
        console.log(`  ${i}/${chunks.length} (${elapsed.toFixed(1)}%)...`)
      }

      try {
        const embedding = await embedText(chunk.content)
        embeddedChunks.push({
          ...chunk,
          embedding,
        })
      } catch (error) {
        console.error(`❌ Failed to embed chunk: ${chunk.id}`)
        throw error
      }
    }

    console.log(`✓ Embedded ${embeddedChunks.length} chunks\n`)

    // Verify embedding dimensions
    if (embeddedChunks.length > 0) {
      const firstEmbedding = embeddedChunks[0].embedding
      console.log(`📊 Embedding dimensions: ${firstEmbedding.length}`)
      console.log(
        `   Sample vector (first 10 values): [${firstEmbedding.slice(0, 10).join(', ')}]\n`
      )
    }

    // Save embedded chunks
    const outputPath = path.join(__dirname, 'data', 'raw', 'cocktail_chunks_embedded.json')
    fs.writeFileSync(outputPath, JSON.stringify(embeddedChunks, null, 2))
    console.log(`✓ Saved embedded chunks to: ${outputPath}\n`)

    // Statistics
    console.log('📈 Statistics:')
    console.log(`   Total chunks: ${embeddedChunks.length}`)
    console.log(`   Vector dimensions: ${embeddedChunks[0]?.embedding.length}`)

    const chunkTypeCount = embeddedChunks.reduce(
      (acc, c) => {
        acc[c.chunk_type] = (acc[c.chunk_type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    console.log(`   By type:`)
    for (const [type, count] of Object.entries(chunkTypeCount)) {
      console.log(`     ${type}: ${count}`)
    }

    const languageCount = embeddedChunks.reduce(
      (acc, c) => {
        acc[c.language] = (acc[c.language] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    console.log(`   By language:`)
    for (const [lang, count] of Object.entries(languageCount)) {
      const langName = { pt: 'Portuguese', en: 'English', es: 'Spanish' }[lang] || lang
      console.log(`     ${langName}: ${count}`)
    }

    // Database preparation info
    console.log(`\n💾 Ready for Supabase upload (see docs/RAG_IMPLEMENTATION.md for SQL schema)\n`)

    console.log(`✅ Embedding complete!`)
    console.log(`\n📋 Next steps:`)
    console.log(`   1. Create cocktail_chunks table in Supabase with pgvector column`)
    console.log(`   2. Run: npm run upload-chunks (to insert into database)`)
    console.log(`   3. Create search_cocktail_chunks() SQL function`)
    console.log(`   4. Update app/api/chatbot/route.ts to use vector search`)
  } catch (error) {
    console.error('❌ Embedding pipeline failed:', error)
    process.exit(1)
  }
}

main()
