import { createHmac } from 'crypto'
import { Anthropic } from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { pipeline } from '@xenova/transformers'

interface SemanticChunkResult {
  id: string
  drink_id: string
  chunk_type: 'metadata' | 'ingredients' | 'instructions' | 'history' | 'fun_fact'
  language: string
  content: string
  similarity: number
}

type EmbedFn = (
  input: string,
  opts: { pooling: string; normalize: boolean }
) => Promise<{ data: Float32Array }>
let embeddingPipeline: EmbedFn | null = null
let ragAvailability: boolean | null = null

async function getEmbedder(): Promise<EmbedFn> {
  if (!embeddingPipeline) {
    embeddingPipeline = (await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    )) as unknown as EmbedFn
  }
  return embeddingPipeline
}

/**
 * Probe whether the RAG infrastructure (cocktail_chunks + search_cocktail_chunks RPC) is live.
 * Cached per process to avoid hammering Supabase on every request.
 */
async function isRagAvailable(): Promise<boolean> {
  if (ragAvailability !== null) return ragAvailability
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      ragAvailability = false
      return false
    }
    const r = await fetch(`${url}/rest/v1/cocktail_chunks?select=id&limit=1`, {
      headers: { apikey: key },
    })
    ragAvailability = r.ok
    return ragAvailability
  } catch {
    ragAvailability = false
    return false
  }
}

/**
 * Semantic RAG: Embed user message and search for related cocktail chunks
 *
 * Algorithm:
 * 1. Embed user message (384-dim vector via Xenova)
 * 2. Search cocktail_chunks with cosine similarity > threshold
 * 3. Group by drink_id to get diverse chunk types (ingredients, instructions, history)
 * 4. Return top-5 chunks as context for Claude
 */
async function fetchRelevantChunksViaSemanticSearch(
  message: string
): Promise<SemanticChunkResult[]> {
  try {
    // Skip the (expensive) embedding step entirely when the RAG table isn't deployed
    if (!(await isRagAvailable())) return []

    // Step 1: Embed the user message
    const embedder = await getEmbedder()
    const messageEmbedding = await embedder(message, {
      pooling: 'mean',
      normalize: true,
    })

    // Convert to array format for PostgreSQL
    const embeddingArray = Array.from(messageEmbedding.data)

    // Step 2: Query Supabase for semantic matches
    const supabase = await createServerClient()

    // Threshold 0.1: MiniLM-L6 mean-pooled scores on short chunks vs question-form
    // queries land in 0.1–0.25 even when the top result is correct. Noise floor ~0.05.
    // Rank ordering is reliable; absolute score is not.
    const { data: chunks, error } = await supabase.rpc('search_cocktail_chunks', {
      query_embedding: embeddingArray,
      match_threshold: 0.1,
      match_count: 10,
    })

    if (error) {
      console.error('Semantic search error:', error)
      return []
    }

    if (!chunks || chunks.length === 0) {
      return []
    }

    // Step 3: Diversify results by chunk type (prefer instructions > ingredients > metadata)
    // This ensures Claude gets actionable information, not just category metadata
    const diversified: SemanticChunkResult[] = []
    const seenDrinks = new Set<string>()

    const chunkTypePriority: Record<string, number> = {
      instructions: 0,
      ingredients: 1,
      history: 2,
      metadata: 3,
      fun_fact: 4,
    }

    // Sort by (similarity desc, chunk type priority asc)
    const sorted = (chunks as SemanticChunkResult[]).sort((a, b) => {
      const simDiff = (b.similarity ?? 0) - (a.similarity ?? 0)
      if (Math.abs(simDiff) > 0.01) return simDiff

      const typePriorityDiff =
        (chunkTypePriority[a.chunk_type] ?? 99) - (chunkTypePriority[b.chunk_type] ?? 99)
      return typePriorityDiff
    })

    // Pick chunks, preferring new drinks + high-value chunk types
    for (const chunk of sorted) {
      if (diversified.length >= 5) break

      // Prefer chunks from different drinks
      if (!seenDrinks.has(chunk.drink_id)) {
        diversified.push(chunk)
        seenDrinks.add(chunk.drink_id)
      } else if (chunk.chunk_type === 'instructions') {
        // If we already have this drink, only add if it's an instructions chunk (very valuable)
        diversified.push(chunk)
      }
    }

    return diversified
  } catch (error) {
    console.error('Semantic RAG error:', error)
    return []
  }
}

function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET || 'default-secret'
  return createHmac('sha256', secret).update(ip).digest('hex')
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  return forwarded?.split(',')[0] || realIp || 'unknown'
}

function getResetTime(): number {
  const now = new Date()
  const tomorrow = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  return Math.floor(tomorrow.getTime() / 1000)
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: number
}

async function checkRateLimit(req: Request): Promise<RateLimitResult> {
  const supabase = await createServerClient()
  const resetAt = getResetTime()

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if Pro subscriber (unlimited)
  if (session?.user?.id) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single()

    if (subscription) {
      return { allowed: true, remaining: -1, limit: -1, resetAt }
    }
  }

  // Determine identifier and limit
  const userId = session?.user?.id ?? null
  const ipHash = userId ? null : hashIp(getClientIp(req))
  const limit = userId ? 10 : 3

  // Count today's queries (per-row table; one row per query)
  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayStartIso = dayStart.toISOString()

  let countQuery = supabase
    .from('chatbot_usage')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', dayStartIso)

  countQuery = userId
    ? countQuery.eq('user_id', userId)
    : countQuery.eq('ip_hash', ipHash as string)

  const { count } = await countQuery
  const currentCount = count ?? 0

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, limit, resetAt }
  }

  // Record this query (one row per request). Fire-and-forget on failure.
  await supabase
    .from('chatbot_usage')
    .insert({
      user_id: userId,
      ip_hash: ipHash,
      query: '',
    })
    .then(({ error }) => {
      if (error) console.error('chatbot_usage insert failed:', error.message)
    })

  return { allowed: true, remaining: limit - currentCount - 1, limit, resetAt }
}

type ModelChoice = 'claude' | 'gemini'

function buildSystemPrompt(locale: string, ragContext: string): string {
  const langInstructions: Record<string, string> = {
    pt: 'Responda SEMPRE em Portugu\u00eas Brasileiro, independentemente do idioma da pergunta — a menos que o usu\u00e1rio escreva em outro idioma, nesse caso adapte-se ao idioma dele.',
    en: 'Always respond in English by default — but if the user writes in another language, adapt and reply in their language.',
    es: 'Responde SIEMPRE en Espa\u00f1ol por defecto — pero si el usuario escribe en otro idioma, ad\u00e1ptate y responde en su idioma.',
  }

  const langNote = langInstructions[locale] ?? langInstructions.pt

  return `You are LaPoison, an expert cocktail assistant with deep knowledge of mixology, spirits, and bar techniques. You help users find recipes, suggest drinks based on ingredients, explain techniques, and share bartending tips. Be friendly, concise, and knowledgeable. Keep responses to 1-2 paragraphs unless asked for more detailed information.

${langNote}

When cocktail context is provided below, use it to give specific, accurate answers. Reference drink names when relevant.${ragContext}`
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message: string; model?: ModelChoice; locale?: string }
    const { message, model = 'claude', locale = 'pt' } = body

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(req)

    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: 'limit_reached',
          message: 'You reached your daily limit. Upgrade to Pro for unlimited access.',
          upgradeUrl: '/pricing',
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      )
    }

    // RAG: Semantic search for relevant cocktail chunks
    const relevantChunks = await fetchRelevantChunksViaSemanticSearch(message)

    // Build context block
    let ragContext = ''
    if (relevantChunks.length > 0) {
      const chunksByDrink = new Map<string, SemanticChunkResult[]>()
      for (const chunk of relevantChunks) {
        if (!chunksByDrink.has(chunk.drink_id)) chunksByDrink.set(chunk.drink_id, [])
        chunksByDrink.get(chunk.drink_id)!.push(chunk)
      }
      const contextLines = Array.from(chunksByDrink.entries())
        .map(([, chunks]) => {
          const lines = ['[Cocktail]']
          const byType = new Map<string, string[]>()
          for (const chunk of chunks) {
            if (!byType.has(chunk.chunk_type)) byType.set(chunk.chunk_type, [])
            byType.get(chunk.chunk_type)!.push(chunk.content)
          }
          for (const [type, contents] of byType.entries()) {
            lines.push(`  [${type.toUpperCase()}] ${contents.join('; ')}`)
          }
          return lines.join('\n')
        })
        .join('\n\n')
      ragContext = `\n\n[CONTEXT FROM DATABASE]\nDrink Information (retrieved via semantic search):\n${contextLines}\n[END CONTEXT]`
    }

    const systemPrompt = buildSystemPrompt(locale, ragContext)
    const encoder = new TextEncoder()
    const rateLimitHeaders = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(rateLimit.resetAt),
    }

    // ── Claude Haiku ──────────────────────────────────────────────────────────
    if (model === 'claude') {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const stream = anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      })

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                controller.enqueue(encoder.encode(event.delta.text))
              }
            }
          } catch (err) {
            controller.error(err)
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readableStream, { headers: rateLimitHeaders })
    }

    // ── Gemini Pro ────────────────────────────────────────────────────────────
    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      return Response.json(
        { error: 'Gemini API key not configured. Add GEMINI_API_KEY to your .env file.' },
        { status: 503 }
      )
    }

    const genAI = new GoogleGenerativeAI(geminiKey)
    const geminiModel = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
    })

    const geminiStream = await geminiModel.generateContentStream(message)

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of geminiStream.stream) {
            const text = chunk.text()
            if (text) controller.enqueue(encoder.encode(text))
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readableStream, { headers: rateLimitHeaders })
  } catch (error) {
    console.error('Chatbot error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
