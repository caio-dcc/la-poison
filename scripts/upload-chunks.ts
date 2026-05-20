/**
 * SCRIPT: upload-chunks.ts
 *
 * Upload embedded chunks to Supabase PostgreSQL
 * Bulk-inserts chunks into the cocktail_chunks table
 *
 * Prerequisites:
 * 1. cocktail_chunks_embedded.json exists (from embed-chunks.ts)
 * 2. cocktail_chunks table exists (from migration 005)
 * 3. SUPABASE_URL and SUPABASE_SERVICE_KEY env vars set
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface EmbeddedChunk {
  id: string
  drink_id: string
  chunk_type: string
  language: string
  content: string
  embedding: number[]
  tokens_estimate: number
}

async function uploadChunks() {
  console.log('📤 Uploading Embedded Chunks to Supabase\n')

  // Load environment
  const SUPABASE_URL = process.env.SUPABASE_URL || ''
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY required in env')
    process.exit(1)
  }

  try {
    // Load embedded chunks
    const chunksPath = path.join(__dirname, 'data', 'raw', 'cocktail_chunks_embedded.json')

    if (!fs.existsSync(chunksPath)) {
      console.error('❌ cocktail_chunks_embedded.json not found')
      console.error(`   Run 'npm run embed' first`)
      process.exit(1)
    }

    const chunks: EmbeddedChunk[] = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'))
    console.log(`✓ Loaded ${chunks.length} embedded chunks\n`)

    // Resolve drink_id (CocktailDB string from cocktails.json) → real Supabase UUID
    // The live cocktails table uses Postgres-generated UUIDs; chunks were built
    // from the raw JSON source which has CocktailDB integer strings. We map via slug.
    // Chunk IDs are formatted as `${slug}_${type}_${lang}`, so we can recover the slug.
    console.log('🔍 Resolving drink_ids via slug...')
    const cocktailsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/cocktails?select=id,slug&limit=1000`,
      {
        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
      }
    )
    if (!cocktailsRes.ok) {
      console.error('❌ Failed to fetch cocktails for ID mapping')
      process.exit(1)
    }
    const cocktailRows = (await cocktailsRes.json()) as Array<{ id: string; slug: string }>
    const uuidBySlug = new Map(cocktailRows.map(r => [r.slug, r.id]))
    console.log(`   ${uuidBySlug.size} cocktails available for mapping`)

    function slugFromChunkId(chunkId: string): string {
      // strip trailing `_<type>_<lang>` (one of 5 types, 3 langs)
      return chunkId.replace(
        /_(metadata|ingredients|instructions|history|fun_fact)_(pt|en|es)$/,
        ''
      )
    }

    let unresolved = 0
    const resolved = chunks
      .map(c => {
        const slug = slugFromChunkId(c.id)
        const realDrinkId = uuidBySlug.get(slug)
        if (!realDrinkId) {
          unresolved++
          return null
        }
        return { ...c, drink_id: realDrinkId }
      })
      .filter((c): c is EmbeddedChunk => c !== null)
    console.log(`   ${resolved.length} resolved, ${unresolved} unresolved (will be skipped)\n`)

    // Batch upload (PostgreSQL can handle large batches)
    console.log('🔄 Uploading to Supabase (this may take 1-2 minutes)...')

    const BATCH_SIZE = 100
    let uploaded = 0

    for (let i = 0; i < resolved.length; i += BATCH_SIZE) {
      const batch = resolved.slice(i, Math.min(i + BATCH_SIZE, resolved.length))

      // Transform to Supabase format
      const records = batch.map(chunk => ({
        id: chunk.id,
        drink_id: chunk.drink_id,
        chunk_type: chunk.chunk_type,
        language: chunk.language,
        content: chunk.content,
        embedding: chunk.embedding,
        tokens_estimate: chunk.tokens_estimate,
      }))

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/cocktail_chunks?on_conflict=id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify(records),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`HTTP ${response.status}: ${error}`)
        }

        uploaded += batch.length
        const progress = ((uploaded / resolved.length) * 100).toFixed(1)
        console.log(`  ${uploaded}/${resolved.length} (${progress}%)...`)
      } catch (error) {
        console.error(`❌ Batch upload failed:`, error)
        console.error(`   Already uploaded: ${uploaded}/${resolved.length}`)
        process.exit(1)
      }
    }

    console.log(`\n✅ Upload complete!`)
    console.log(`\n📊 Summary:`)
    console.log(`   Total chunks: ${resolved.length}`)
    console.log(`   Vector dimensions: 384`)
    console.log(`   Storage: ~${(resolved.length * 384 * 4) / 1024 / 1024} MB (vectors only)`)

    // Verify upload
    console.log(`\n🔍 Verifying upload...`)
    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/cocktail_chunks?select=count()`, {
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    })

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json()
      const dbCount = verifyData[0]?.count || 0
      console.log(`   Database count: ${dbCount} chunks`)

      if (dbCount >= resolved.length * 0.95) {
        console.log(`✓ Upload verified!\n`)
      } else {
        console.warn(
          `⚠ Warning: expected ${resolved.length}, got ${dbCount}. Some chunks may have failed to insert.\n`
        )
      }
    }

    console.log(`✨ Next steps:`)
    console.log(`   1. Test vector search: SELECT * FROM search_cocktail_chunks(...)`)
    console.log(`   2. Update app/api/chatbot/route.ts to use RAG (already done)`)
    console.log(`   3. Test chatbot: npm run dev`)
    console.log(`   4. Query: "How do I make a drink with lime?"`)
  } catch (error) {
    console.error('❌ Upload failed:', error)
    process.exit(1)
  }
}

uploadChunks()
