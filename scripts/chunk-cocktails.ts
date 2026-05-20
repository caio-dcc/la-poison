/**
 * SCRIPT: chunk-cocktails.ts
 *
 * Semantic chunking strategy for cocktails:
 * Each drink is split into 4-5 semantic units (chunks):
 * 1. METADATA: name, category, difficulty, ABV, prep time
 * 2. INGREDIENTS: full ingredient list with measures
 * 3. INSTRUCTIONS: step-by-step preparation
 * 4. HISTORY: origin/background story
 * 5. FUN_FACT: trivia/interesting facts (if available)
 *
 * Each chunk has:
 * - drink_id: reference to parent cocktail
 * - chunk_type: semantic category
 * - content: actual text to embed
 * - language: 'pt' | 'en' | 'es' (for multilingual RAG)
 *
 * Output: cocktail_chunks.json (ready for embedding)
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface CocktailInput {
  id: string
  name: string
  slug: string
  category_slug?: string
  abv_estimate?: number
  difficulty?: number
  prep_time_minutes?: number
  ingredients: Array<{
    name: string
    amount_ml?: number
    measure_text?: string
  }>
  instructions_pt?: string | null
  instructions_en?: string | null
  instructions_es?: string | null
  description_pt?: string | null
  description_en?: string | null
  description_es?: string | null
  history_pt?: string | null
  history_en?: string | null
  history_es?: string | null
  fun_fact_pt?: string | null
  fun_fact_en?: string | null
  fun_fact_es?: string | null
}

interface CocktailChunk {
  id: string // unique chunk ID
  drink_id: string
  chunk_type: 'metadata' | 'ingredients' | 'instructions' | 'history' | 'fun_fact'
  language: 'pt' | 'en' | 'es'
  content: string
  tokens_estimate: number // rough estimate for cost tracking
}

/**
 * Chunking Strategy Explained:
 *
 * WHY SEMANTIC CHUNKING?
 * - Fixed-size chunks break sentences mid-word → garbage embeddings
 * - Semantic chunks align with user intents (user asks about ingredients, we give ingredients)
 * - Each chunk is independently meaningful → high quality RAG retrieval
 *
 * CHUNK TYPES:
 * 1. METADATA: "Caipirinha - Tropical - Difficulty 2/5 - ABV 8% - 5 min prep"
 *    → User searching for "easy drinks" or "quick cocktails" gets this
 *
 * 2. INGREDIENTS: "60ml white rum, 1 lime (cut wedges), 2 tsp sugar, crushed ice"
 *    → User asking "what's in a caipirinha?" or "do you have rum drinks?" retrieves this
 *
 * 3. INSTRUCTIONS: "Muddle lime and sugar. Add rum. Fill with crushed ice. Stir."
 *    → User asking "how to make?" or "technique?" gets step-by-step
 *
 * 4. HISTORY: "Traditional Brazilian drink from 16th century sugarcane plantations..."
 *    → User asking "where does caipirinha come from?" gets cultural context
 *
 * 5. FUN_FACT: "The caipirinha is Brazil's national spirit cocktail..."
 *    → User asking "interesting cocktail facts?" gets trivia
 *
 * CHUNKING ALGORITHM:
 * For each drink × each language (pt/en/es):
 *   IF content exists:
 *     Create chunk with sanitized, enriched content
 *     Estimate token count (rough: 1 token ≈ 4 chars)
 *     Assign unique chunk_id = "{slug}_{chunk_type}_{language}"
 */

function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters (OpenAI ratio)
  return Math.ceil(text.length / 4)
}

function createMetadataChunk(
  drink: CocktailInput,
  language: 'pt' | 'en' | 'es'
): CocktailChunk | null {
  const labels = {
    pt: { difficulty: 'Dificuldade', abv: 'ABV', prep: 'Tempo de preparo' },
    en: { difficulty: 'Difficulty', abv: 'ABV', prep: 'Prep time' },
    es: { difficulty: 'Dificultad', abv: 'ABV', prep: 'Tiempo de preparación' },
  }

  const parts: string[] = [drink.name]

  if (drink.category_slug) {
    parts.push(drink.category_slug.replace(/-/g, ' '))
  }

  if (drink.difficulty) {
    parts.push(`${labels[language].difficulty}: ${drink.difficulty}/5`)
  }

  if (drink.abv_estimate) {
    parts.push(`${labels[language].abv}: ${drink.abv_estimate}%`)
  }

  if (drink.prep_time_minutes) {
    parts.push(`${labels[language].prep}: ${drink.prep_time_minutes} min`)
  }

  const content = parts.join(' • ')

  return {
    id: `${drink.slug}_metadata_${language}`,
    drink_id: drink.id,
    chunk_type: 'metadata',
    language,
    content,
    tokens_estimate: estimateTokens(content),
  }
}

function createIngredientsChunk(
  drink: CocktailInput,
  language: 'pt' | 'en' | 'es'
): CocktailChunk | null {
  if (!drink.ingredients || drink.ingredients.length === 0) {
    return null
  }

  // Format each ingredient: "amount measure ingredient"
  const ingredientLines = drink.ingredients
    .map(ing => {
      const measure = ing.measure_text || (ing.amount_ml ? `${ing.amount_ml}ml` : '')
      return `${measure} ${ing.name}`.trim()
    })
    .join(', ')

  const labelMap = {
    pt: 'Ingredientes',
    en: 'Ingredients',
    es: 'Ingredientes',
  }

  const content = `${labelMap[language]}: ${ingredientLines}`

  return {
    id: `${drink.slug}_ingredients_${language}`,
    drink_id: drink.id,
    chunk_type: 'ingredients',
    language,
    content,
    tokens_estimate: estimateTokens(content),
  }
}

function createInstructionsChunk(
  drink: CocktailInput,
  language: 'pt' | 'en' | 'es'
): CocktailChunk | null {
  const key = `instructions_${language}` as const
  const text = drink[key]

  if (!text) {
    return null
  }

  const labelMap = {
    pt: 'Modo de preparo',
    en: 'Instructions',
    es: 'Preparación',
  }

  const content = `${labelMap[language]}: ${text}`

  return {
    id: `${drink.slug}_instructions_${language}`,
    drink_id: drink.id,
    chunk_type: 'instructions',
    language,
    content,
    tokens_estimate: estimateTokens(content),
  }
}

function createHistoryChunk(
  drink: CocktailInput,
  language: 'pt' | 'en' | 'es'
): CocktailChunk | null {
  const key = `history_${language}` as const
  const text = drink[key]

  if (!text) {
    return null
  }

  const labelMap = {
    pt: 'História',
    en: 'History',
    es: 'Historia',
  }

  const content = `${labelMap[language]}: ${text}`

  return {
    id: `${drink.slug}_history_${language}`,
    drink_id: drink.id,
    chunk_type: 'history',
    language,
    content,
    tokens_estimate: estimateTokens(content),
  }
}

function createFunFactChunk(
  drink: CocktailInput,
  language: 'pt' | 'en' | 'es'
): CocktailChunk | null {
  const key = `fun_fact_${language}` as const
  const text = drink[key]

  if (!text) {
    return null
  }

  const labelMap = {
    pt: 'Curiosidade',
    en: 'Fun Fact',
    es: 'Curiosidad',
  }

  const content = `${labelMap[language]}: ${text}`

  return {
    id: `${drink.slug}_fun_fact_${language}`,
    drink_id: drink.id,
    chunk_type: 'fun_fact',
    language,
    content,
    tokens_estimate: estimateTokens(content),
  }
}

/**
 * Main chunking function:
 * For each drink, create all possible chunks (metadata always; others if content exists)
 */
function chunkDrink(drink: CocktailInput): CocktailChunk[] {
  const chunks: CocktailChunk[] = []

  // Always create metadata chunk (required for every drink)
  for (const lang of ['pt', 'en', 'es'] as const) {
    const meta = createMetadataChunk(drink, lang)
    if (meta) chunks.push(meta)
  }

  // Create ingredient chunk (should exist for all drinks)
  for (const lang of ['pt', 'en', 'es'] as const) {
    const ing = createIngredientsChunk(drink, lang)
    if (ing) chunks.push(ing)
  }

  // Create instruction chunks (from enrichment data)
  for (const lang of ['pt', 'en', 'es'] as const) {
    const instr = createInstructionsChunk(drink, lang)
    if (instr) chunks.push(instr)
  }

  // Create history chunks (from enrichment data, optional)
  for (const lang of ['pt', 'en', 'es'] as const) {
    const hist = createHistoryChunk(drink, lang)
    if (hist) chunks.push(hist)
  }

  // Create fun fact chunks (from enrichment data, optional)
  for (const lang of ['pt', 'en', 'es'] as const) {
    const fact = createFunFactChunk(drink, lang)
    if (fact) chunks.push(fact)
  }

  return chunks
}

async function main() {
  console.log('📚 Semantic Chunking for Cocktails\n')
  console.log(
    'Strategy: Each drink → 5 semantic units (metadata, ingredients, instructions, history, fun_fact)'
  )
  console.log('Languages: PT, EN, ES (multilingual RAG)\n')

  try {
    // Load enriched cocktails
    const enrichedPath = path.join(__dirname, 'data', 'raw', 'cocktails-enriched.json')
    const basePath = path.join(__dirname, 'data', 'raw', 'cocktails.json')

    let cocktails: CocktailInput[]
    if (fs.existsSync(enrichedPath)) {
      console.log('✓ Using enriched cocktails (with PT/EN/ES descriptions)...')
      cocktails = JSON.parse(fs.readFileSync(enrichedPath, 'utf-8'))
    } else {
      console.log(
        '⚠ Using base cocktails (enrichment data pending—history/descriptions will be empty)...'
      )
      cocktails = JSON.parse(fs.readFileSync(basePath, 'utf-8'))
    }

    console.log(`  Total cocktails: ${cocktails.length}\n`)

    // Chunk all drinks
    console.log('🔪 Chunking cocktails...')
    const allChunks: CocktailChunk[] = []

    for (const drink of cocktails) {
      const chunks = chunkDrink(drink)
      allChunks.push(...chunks)
    }

    console.log(`✓ Total chunks created: ${allChunks.length}`)
    console.log(`  Metadata chunks: ${allChunks.filter(c => c.chunk_type === 'metadata').length}`)
    console.log(
      `  Ingredient chunks: ${allChunks.filter(c => c.chunk_type === 'ingredients').length}`
    )
    console.log(
      `  Instruction chunks: ${allChunks.filter(c => c.chunk_type === 'instructions').length}`
    )
    console.log(`  History chunks: ${allChunks.filter(c => c.chunk_type === 'history').length}`)
    console.log(`  Fun fact chunks: ${allChunks.filter(c => c.chunk_type === 'fun_fact').length}`)

    // Calculate token estimates
    const totalTokens = allChunks.reduce((sum, c) => sum + c.tokens_estimate, 0)
    console.log(
      `\n📊 Token estimate: ${totalTokens} tokens (~$${(totalTokens / 1000000) * 0.02} for OpenAI embedding)\n`
    )

    // Save chunks
    const outputPath = path.join(__dirname, 'data', 'raw', 'cocktail_chunks.json')
    fs.writeFileSync(outputPath, JSON.stringify(allChunks, null, 2))

    console.log(`✅ Chunks saved to: ${outputPath}`)
    console.log(`\n📈 Stats:`)
    console.log(`  Chunks per drink (avg): ${(allChunks.length / cocktails.length).toFixed(1)}`)
    console.log(`  Chunk type distribution:`)

    const typeDistrib = allChunks.reduce(
      (acc, c) => {
        acc[c.chunk_type] = (acc[c.chunk_type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    for (const [type, count] of Object.entries(typeDistrib)) {
      const pct = ((count / allChunks.length) * 100).toFixed(1)
      console.log(`    ${type}: ${count} (${pct}%)`)
    }

    console.log(`\n✨ Next step: Run 'npm run embeddings' to generate vectors for these chunks`)
  } catch (error) {
    console.error('❌ Chunking failed:', error)
    process.exit(1)
  }
}

main()
