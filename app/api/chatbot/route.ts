import { createHmac } from 'crypto'
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

interface SiteStats {
  totalCocktails: number
  totalIngredients: number
  totalCategories: number
  categories: string[]
  fetchedAt: number
}

let cachedStats: SiteStats | null = null
const STATS_TTL_MS = 60 * 60 * 1000 // 1 hour

async function fetchSiteStats(): Promise<SiteStats | null> {
  if (cachedStats && Date.now() - cachedStats.fetchedAt < STATS_TTL_MS) {
    return cachedStats
  }
  try {
    const supabase = await createServerClient()
    const [cocktailsRes, ingredientsRes, categoriesRes, categoryListRes] = await Promise.all([
      supabase.from('cocktails').select('id', { count: 'exact', head: true }),
      supabase.from('ingredients').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('cocktails').select('category').limit(1000),
    ])
    const uniqueCategories = Array.from(
      new Set(
        (categoryListRes.data ?? [])
          .map(r => (r as { category: string | null }).category)
          .filter((c): c is string => !!c)
      )
    ).sort()
    cachedStats = {
      totalCocktails: cocktailsRes.count ?? 0,
      totalIngredients: ingredientsRes.count ?? 0,
      totalCategories: categoriesRes.count ?? 0,
      categories: uniqueCategories,
      fetchedAt: Date.now(),
    }
    return cachedStats
  } catch (err) {
    console.error('fetchSiteStats error:', err)
    return null
  }
}

interface CocktailMatch {
  name: string
  category: string | null
  alcoholic: boolean | null
  abv_estimate: number | null
  description: string | null
  instructions: string | null
  ingredients: string[]
  slug: string
}

/**
 * Direct cocktail search using ilike on name/category/ingredients.
 * No embeddings required — works without the cocktail_chunks table.
 */
async function fetchRelevantCocktails(message: string, locale: string): Promise<CocktailMatch[]> {
  try {
    const supabase = await createServerClient()
    const descCol = `description_${locale}`
    const instrCol = `instructions_${locale}`

    const stopwords = new Set([
      'que',
      'qual',
      'quais',
      'como',
      'onde',
      'quando',
      'tem',
      'uma',
      'uns',
      'umas',
      'the',
      'what',
      'which',
      'how',
      'where',
      'when',
      'are',
      'has',
      'have',
      'and',
      'for',
      'cual',
      'cuales',
      'donde',
      'cuando',
      'tiene',
      'tienen',
      'son',
      'unas',
      'with',
      'sem',
      'com',
      'para',
      'por',
      'del',
      'das',
      'dos',
      'los',
      'las',
    ])
    const keywords = message
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stopwords.has(w))
      .slice(0, 5)

    if (keywords.length === 0) return []

    const orClauses = keywords.map(kw => `name.ilike.%${kw}%,category.ilike.%${kw}%`).join(',')

    const { data: cocktails, error } = await supabase
      .from('cocktails')
      .select(
        'id, name, slug, category, alcoholic, abv_estimate, description_pt, description_en, description_es, instructions_pt, instructions_en, instructions_es, cocktail_ingredients(ingredient:ingredients(name))'
      )
      .or(orClauses)
      .limit(5)

    if (error || !cocktails) {
      if (error) console.error('Cocktail search error:', error.message)
      return []
    }

    type CocktailRow = {
      name: string
      slug: string
      category: string | null
      alcoholic: boolean | null
      abv_estimate: number | null
      description_pt: string | null
      description_en: string | null
      description_es: string | null
      instructions_pt: string | null
      instructions_en: string | null
      instructions_es: string | null
      cocktail_ingredients: Array<{ ingredient: { name: string } | null }> | null
    }

    return (cocktails as unknown as CocktailRow[]).map(c => {
      const desc = (c as unknown as Record<string, string | null>)[descCol] ?? c.description_en
      const instr = (c as unknown as Record<string, string | null>)[instrCol] ?? c.instructions_en
      return {
        name: c.name,
        slug: c.slug,
        category: c.category,
        alcoholic: c.alcoholic,
        abv_estimate: c.abv_estimate,
        description: desc,
        instructions: instr,
        ingredients:
          c.cocktail_ingredients?.map(ci => ci.ingredient?.name).filter((n): n is string => !!n) ??
          [],
      }
    })
  } catch (err) {
    console.error('fetchRelevantCocktails error:', err)
    return []
  }
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

type ModelChoice = 'groq'
type Personality = 'bartender' | 'sommelier' | 'concise' | 'playful'

const personalityPrompts: Record<Personality, string> = {
  bartender: `You are a seasoned, friendly bartender chatting with a customer at the bar. Use casual, warm language with occasional bar slang (shake, build, neat, on the rocks). Tell short anecdotes about drink origins when relevant. Treat the user like a regular: warm but not overly formal. Avoid emojis unless the user uses them first.`,
  sommelier: `You are a refined sommelier and master mixologist. Use elegant, sophisticated vocabulary. Focus on sensory nuances (aromatic notes, palate balance, finish), pairings, and history. Speak in third person about the drinks ("the Mojito presents...", "this cocktail expresses..."). Never use slang or emojis. Treat the user with respect and assume some interest in fine details.`,
  concise: `You are a direct, no-nonsense cocktail expert. Respond with structured lists, exact measurements, and minimal prose. Use bullet points and numbered steps. Skip history and storytelling unless explicitly asked. Format recipes as: ingredients list → instructions → optional notes. No emojis, no fluff.`,
  playful: `You are an enthusiastic, witty cocktail aficionado. Use light humor, occasional puns (about drinks/bar life), and well-placed emojis (🍹🍸🌿🥃) — but never overdo it. Show genuine excitement about cocktails. Keep the energy high but never sacrifice accuracy. Make the user smile while learning.`,
}

const scopePrompt = `SCOPE: You can answer questions about cocktails, mixology, spirits, ingredients, bar techniques, bar tools, food pairings, drink history, party planning, hangover tips, and bar etiquette. For questions clearly outside this scope (politics, medicine, programming, etc.), politely redirect: "I'm specialized in cocktails and bar culture — but I'd love to help you with a recipe, pairing, or technique!"`

const lengthPrompt = `LENGTH: Default to detailed responses of 3 or more paragraphs. Include the direct answer, then context (history/origin/variants), then a practical tip or pairing suggestion. Only shorten if the user explicitly asks for a quick answer.`

function buildSystemPrompt(
  locale: string,
  ragContext: string,
  stats: SiteStats | null,
  personality: Personality
): string {
  const langInstructions: Record<string, string> = {
    pt: 'Responda SEMPRE em Portugu\u00eas Brasileiro, independentemente do idioma da pergunta — a menos que o usu\u00e1rio escreva em outro idioma, nesse caso adapte-se ao idioma dele.',
    en: 'Always respond in English by default — but if the user writes in another language, adapt and reply in their language.',
    es: 'Responde SIEMPRE en Espa\u00f1ol por defecto — pero si el usuario escribe en otro idioma, ad\u00e1ptate y responde en su idioma.',
  }

  const langNote = langInstructions[locale] ?? langInstructions.pt

  const statsBlock = stats
    ? `

[LAPOISON SITE DATA — GROUND TRUTH, USE WHEN ASKED ABOUT THE SITE]
- Total cocktail recipes on the site: ${stats.totalCocktails}
- Total ingredients catalogued: ${stats.totalIngredients}
- Total categories: ${stats.totalCategories}
- Available categories: ${stats.categories.join(', ')}

When the user asks about totals/counts/statistics of the site (e.g. "how many cocktails", "quantos coquetéis", "cuántos cócteles"), USE the numbers above verbatim. Never say you don't know — these are the real, current numbers from the database.`
    : ''

  return `You are Buky, the official AI assistant for the LaPoison website (a curated cocktail recipe database). Your name is always Buky, regardless of the selected personality. LaPoison is the website/product name, not your personal name. Do not proactively mention the origin or homage behind your name unless the user explicitly asks about it.

PERSONALITY: ${personalityPrompts[personality]}

${scopePrompt}

${lengthPrompt}

${langNote}${statsBlock}

When cocktail context is provided below, use it to give specific, accurate answers. Reference drink names when relevant.${ragContext}`
}

function generateLocalResponse(message: string, locale: string): string {
  const lowerMsg = message.toLowerCase()
  const normalizedMsg = lowerMsg.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (locale === 'pt') {
    if (normalizedMsg.includes('quem e voce') || normalizedMsg.includes('quem voce e')) {
      return 'Eu sou o Buky, assistente de coquetéis do LaPoison. Posso te ajudar com receitas, substituições, técnicas de bar, harmonizações, drinks sem álcool e planejamento de rodada para grupos.'
    }

    if (
      normalizedMsg.includes('rum') &&
      normalizedMsg.includes('hortel') &&
      normalizedMsg.includes('lima')
    ) {
      return 'Com rum, hortelã e limão, o caminho mais direto é um **Mojito**.\n\nUse 50 ml de rum branco, 25 ml de suco de limão, 15-20 ml de xarope simples ou 2 colheres de chá de açúcar, 8-10 folhas de hortelã e água com gás. Amasse a hortelã de leve com açúcar e limão, sem triturar, complete com gelo, rum e água com gás.\n\nSe não tiver água com gás, faça uma versão mais seca: rum, limão e açúcar bem batidos com gelo, servidos como um Daiquiri aromatizado com hortelã.'
    }

    if (
      normalizedMsg.includes('martini') &&
      (normalizedMsg.includes('copo') || normalizedMsg.includes('taca'))
    ) {
      return 'Para um **Martini seco**, use uma taça cocktail em V ou, melhor ainda, uma **Nick & Nora** bem gelada. A Nick & Nora costuma ser mais elegante na prática: mantém melhor a temperatura, concentra aroma e derrama menos.\n\nGele a taça antes, mexa gin e vermute seco com bastante gelo até ficar bem frio, coe fino e finalize com azeitona ou twist de limão.'
    }

    if (
      normalizedMsg.includes('10 pessoas') ||
      normalizedMsg.includes('rodada') ||
      normalizedMsg.includes('sem demorar')
    ) {
      return 'Para servir 10 pessoas rápido, escolha 1 ou 2 drinks bateláveis: **Margarita**, **Daiquiri**, **Negroni**, **Cuba Libre** ou **Gin Tônica**.\n\nPrepare antes tudo que não perde gás: sucos coados, xaropes, destilados medidos e guarnições cortadas. Para 10 Margaritas, por exemplo: 500 ml tequila, 250 ml limão, 200 ml licor de laranja ou xarope de agave ajustado, gelo só na hora. Bata em 2-3 rodadas ou sirva em jarra sobre gelo.\n\nRegra de bar: gaseificados, gelo e hortelã entram no final. Isso economiza tempo sem matar textura e frescor.'
    }

    if (normalizedMsg.includes('campari')) {
      return 'Além do Negroni, Campari funciona muito bem em **Americano**, **Garibaldi**, **Boulevardier** e **Jungle Bird**.\n\nPara algo rápido: faça um **Garibaldi** com 50 ml de Campari e 120-150 ml de suco de laranja bem aerado, servido em copo alto com gelo. Para algo mais robusto: **Boulevardier** com partes iguais de bourbon, Campari e vermute doce.'
    }

    if (normalizedMsg.includes('citrico') || normalizedMsg.includes('citrica')) {
      return 'Para deixar um drink mais cítrico sem desequilibrar, aumente acidez aos poucos: 5 ml por vez de limão ou lima. Depois compense com 5 ml de xarope simples se ficar agressivo.\n\nUma boa base é: 50 ml destilado, 25 ml cítrico, 15-20 ml doce. Se ainda parecer “chapado”, uma pitada mínima de sal ajuda a levantar sabor sem adoçar.'
    }

    if (
      normalizedMsg.includes('caipirinha') &&
      (normalizedMsg.includes('petisco') || normalizedMsg.includes('combina'))
    ) {
      return 'Caipirinha combina muito bem com petiscos salgados e gordurosos, porque o limão corta gordura e a cachaça segura sabores intensos.\n\nBoas opções: pastel, torresmo, mandioca frita, queijo coalho, bolinho de bacalhau, ceviche, camarão alho e óleo ou espetinho de frango. Se a caipirinha for de fruta doce, prefira petiscos mais salgados para equilibrar.'
    }

    if (normalizedMsg.includes('gelo')) {
      return 'Para bar em casa, calcule **500 g a 1 kg de gelo por pessoa** se os drinks forem montados no copo, ou mais se forem batidos/coados. Para 10 pessoas, eu separaria de 6 a 8 kg: metade para preparo e metade para manter bebidas geladas.\n\nUse gelo grande para mexidos e copos altos; gelo menor só para bater na coqueteleira. Nunca conte com o gelo do cooler como gelo de serviço.'
    }

    if (normalizedMsg.includes('nao gosta de gin') || normalizedMsg.includes('não gosta de gin')) {
      return 'Para quem não gosta de gin, eu iria para bases mais amigáveis: **Margarita** com tequila, **Daiquiri** com rum, **Moscow Mule** com vodka ou **Whiskey Sour** com bourbon.\n\nSe a pessoa não gosta do lado herbal do gin, evite tônica e zimbro. Drinks cítricos com rum ou tequila costumam funcionar melhor porque são mais diretos, frescos e fáceis de gostar.'
    }

    if (normalizedMsg.includes('xarope simples') || normalizedMsg.includes('substituir xarope')) {
      return 'Se acabou o xarope simples, faça um rápido: misture partes iguais de açúcar e água quente, mexa até dissolver e esfrie com gelo por fora do recipiente.\n\nNa emergência, use açúcar refinado direto apenas em drinks macerados, como Caipirinha ou Mojito. Para drinks batidos, mel ou agave funcionam, mas use menos: eles adoçam mais e mudam o sabor.'
    }

    if (normalizedMsg.includes('margarita') && normalizedMsg.includes('tommy')) {
      return 'A **Margarita clássica** usa tequila, limão e licor de laranja, como Cointreau ou triple sec. Ela fica mais cítrica, seca e com aroma de laranja.\n\nA **Tommy’s Margarita** troca o licor de laranja por xarope de agave: tequila, limão e agave. O resultado é mais direto, mais focado na tequila e geralmente um pouco mais macio.\n\nBase segura: clássica em 50 ml tequila, 25 ml limão, 20 ml licor de laranja. Tommy’s em 50 ml tequila, 25 ml limão, 15 ml agave.'
    }

    if (
      (normalizedMsg.includes('doce') && normalizedMsg.includes('alcool')) ||
      normalizedMsg.includes('nao muito alcoolico')
    ) {
      return 'Para alguém que gosta de doce mas não quer algo muito alcoólico, eu iria de **Amaretto Sour leve**, **Piña Colada mais curta**, **Aperol Spritz** ou um **Moscow Mule** com bastante ginger beer.\n\nUma opção fácil: 40 ml Amaretto, 25 ml limão, 15 ml xarope simples e bastante gelo. Bata e sirva. Fica doce, cítrico e com teor alcoólico mais amigável do que drinks secos com gin ou whisky.'
    }

    if (normalizedMsg.includes('old fashioned') || normalizedMsg.includes('diluicao')) {
      return 'Para não errar a diluição do **Old Fashioned**, monte no copo com gelo grande e mexa pouco a pouco. Use 60 ml bourbon ou rye, 1 colher bailarina de xarope simples 2:1 ou 1 cubo de açúcar, 2-3 dashes de Angostura e casca de laranja.\n\nMexa por 15-20 segundos, prove, e só continue se ainda estiver alcoólico demais. O ponto certo é quando o whisky abre aroma, mas não fica aguado.'
    }

    if (normalizedMsg.includes('mexicana') || normalizedMsg.includes('mexicano')) {
      return 'Com comida mexicana, a escolha mais segura é **Margarita**: tequila, limão e sal conversam muito bem com pimenta, milho, coentro, queijo e gordura.\n\nSe quiser algo mais leve, faça uma **Paloma** com tequila, limão e grapefruit soda. Para tacos apimentados, a Paloma costuma ser excelente porque é cítrica, refrescante e menos pesada que uma Margarita.'
    }

    if (normalizedMsg.includes('cuba libre')) {
      return 'Para um **Cuba Libre** melhor que “rum com Coca”, use bastante gelo, limão de verdade e um rum decente. Esprema 1/4 de limão no copo, esfregue a casca na borda, adicione 50 ml de rum e complete com Coca-Cola bem gelada.\n\nO segredo é acidez e temperatura: sem limão fresco e sem gelo suficiente, vira só highball doce. Finalize com uma fatia de limão e mexa pouco para preservar o gás.'
    }
  }

  if (lowerMsg.includes('mojito')) {
    if (locale === 'pt') {
      return 'Aqui está tudo sobre o **Mojito**:\n\n*   **História**: O Mojito nasceu em Havana, Cuba, no século XVI. Ele evoluiu a partir de uma bebida medicinal para se tornar o coquetel refrescante e icônico preferido de Ernest Hemingway.\n*   **Ingredientes**: Rum branco, suco de limão, açúcar, folhas de hortelã e água com gás.\n*   **Curiosidade**: A hortelã é levemente amassada (e não triturada) para liberar seus óleos aromáticos sem amargar a bebida.\n*   **Harmonização**: Combina incrivelmente com tacos de peixe grelhado, ceviche cítrico ou aperitivos fritos.'
    } else if (locale === 'es') {
      return 'Aquí tienes todo sobre el **Mojito**:\n\n*   **Historia**: El Mojito nació en La Habana, Cuba, en el siglo XVI. Evolucionó a partir de una bebida medicinal hasta convertirse en el refrescante cóctel preferido de Ernest Hemingway.\n*   **Ingredientes**: Ron blanco, jugo de limón, azúcar, hojas de menta y agua con gas.\n*   **Curiosidad**: La menta se machaca suavemente (y no se tritura) para liberar sus aceites aromáticos sin amargar la bebida.\n*   **Maridaje**: Combina de manera increíble con tacos de pescado a la parrilla, ceviche cítrico o aperitivos fritos.'
    } else {
      return 'Here is everything about the **Mojito**:\n\n*   **History**: The Mojito was born in Havana, Cuba, in the 16th century. It evolved from a medicinal drink into the refreshing and iconic cocktail favored by Ernest Hemingway.\n*   **Ingredients**: White rum, lime juice, sugar, mint leaves, and club soda.\n*   **Fun Fact**: The mint is gently muddled (not shredded) to release its aromatic oils without making the drink bitter.\n*   **Food Pairings**: Pairs incredibly well with grilled fish tacos, citrus ceviche, or crispy fried appetizers.'
    }
  }

  if (locale === 'pt') {
    return `Eu sou o Buky. Posso te ajudar com essa pergunta de bar, mas preciso de um pouco mais de contexto para cravar a melhor resposta.\n\nSe a ideia é escolher um drink agora, me diga quais destilados, cítricos, xaropes e frutas você tem. Uma regra segura é começar por uma base simples: 50 ml de destilado, 20-25 ml de cítrico, 15-20 ml de doce, bastante gelo e ajuste provando. Se for harmonização, me diga o prato e se você quer algo seco, doce, cítrico, leve ou mais forte.`
  } else if (locale === 'es') {
    return `Soy Buky. Puedo ayudarte con esa pregunta de bar, pero necesito un poco más de contexto para darte la mejor respuesta.\n\nSi quieres elegir un trago ahora, dime qué destilados, cítricos, siropes y frutas tienes. Una base segura es: 50 ml de destilado, 20-25 ml de cítrico, 15-20 ml de dulce, mucho hielo y ajustar probando.`
  } else {
    return `I'm Buky. I can help with that bar question, but I need a little more context to give the best answer.\n\nIf you want a drink recommendation right now, tell me which spirits, citrus, syrups, and fruits you have. A safe starting formula is 50 ml spirit, 20-25 ml citrus, 15-20 ml sweetener, plenty of ice, then adjust by tasting.`
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message: string
      model?: ModelChoice
      locale?: string
      personality?: Personality
    }
    const { message, model = 'groq', locale = 'pt', personality = 'bartender' } = body
    const validPersonality: Personality = (
      ['bartender', 'sommelier', 'concise', 'playful'] as const
    ).includes(personality)
      ? personality
      : 'bartender'

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not configured')
      const localText = generateLocalResponse(message, locale)
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(localText))
          controller.close()
        },
      })
      const headers = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      }
      return new Response(readableStream, { headers })
    }

    // Re-enable rate limiting with subscription-aware limits
    const rateLimit = await checkRateLimit(req)

    if (!rateLimit.allowed) {
      return Response.json(
        { error: 'Rate limit exceeded. Upgrade to Pro for unlimited access.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        }
      )
    }

    // Run stats + direct cocktail search + semantic RAG in parallel
    const [siteStats, directMatches, relevantChunks] = await Promise.all([
      fetchSiteStats(),
      fetchRelevantCocktails(message, locale).catch(err => {
        console.warn('Direct cocktail search failed:', err)
        return [] as CocktailMatch[]
      }),
      fetchRelevantChunksViaSemanticSearch(message).catch(err => {
        console.warn('Semantic RAG failed:', err)
        return [] as SemanticChunkResult[]
      }),
    ])

    // Build context block
    let ragContext = ''

    if (directMatches.length > 0) {
      const lines = directMatches.map(d => {
        const parts = [`- ${d.name}${d.category ? ` (${d.category})` : ''}`]
        if (d.abv_estimate) parts.push(`ABV ${d.abv_estimate}%`)
        if (d.ingredients.length > 0)
          parts.push(`Ingredients: ${d.ingredients.slice(0, 8).join(', ')}`)
        if (d.instructions) parts.push(`Instructions: ${d.instructions.slice(0, 200)}`)
        return parts.join(' | ')
      })
      ragContext += `\n\n[MATCHING COCKTAILS FROM LAPOISON DATABASE]\n${lines.join('\n')}`
    }

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
      ragContext += `\n\n[SEMANTIC SEARCH RESULTS]\n${contextLines}`
    }

    if (ragContext) ragContext += '\n[END CONTEXT]'

    const systemPrompt = buildSystemPrompt(locale, ragContext, siteStats, validPersonality)
    const encoder = new TextEncoder()
    const rateLimitHeaders = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-RateLimit-Limit': String(rateLimit.limit),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(rateLimit.resetAt),
    }

    // Function to stream local response if external call fails
    const streamLocalFallback = () => {
      const localText = generateLocalResponse(message, locale)
      const readableStream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(localText))
          controller.close()
        },
      })
      return new Response(readableStream, { headers: rateLimitHeaders })
    }

    // ── Groq (Llama 3.3 70B) ─────────────────────────────────────────────────
    if (model === 'groq') {
      if (!process.env.GROQ_API_KEY) {
        console.warn('GROQ_API_KEY not found, using local fallback')
        return streamLocalFallback()
      }
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            stream: true,
            max_tokens: 1500,
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
          }),
        })

        if (!groqRes.ok || !groqRes.body) {
          const errText = await groqRes.text().catch(() => '')
          console.error('Groq API error:', groqRes.status, errText)
          return streamLocalFallback()
        }

        const upstream = groqRes.body
        const readableStream = new ReadableStream({
          async start(controller) {
            const reader = upstream.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''
                for (const line of lines) {
                  const trimmed = line.trim()
                  if (!trimmed.startsWith('data:')) continue
                  const data = trimmed.slice(5).trim()
                  if (data === '[DONE]') continue
                  try {
                    const parsed = JSON.parse(data) as {
                      choices?: Array<{ delta?: { content?: string } }>
                    }
                    const delta = parsed.choices?.[0]?.delta?.content
                    if (delta) controller.enqueue(encoder.encode(delta))
                  } catch {
                    // skip malformed lines
                  }
                }
              }
            } catch (err) {
              console.error('Groq stream error:', err)
              controller.error(err)
            } finally {
              controller.close()
            }
          },
        })

        return new Response(readableStream, { headers: rateLimitHeaders })
      } catch (err) {
        console.error('Groq fetch error:', err)
        return streamLocalFallback()
      }
    }

    return streamLocalFallback()
  } catch (error) {
    console.error('Chatbot error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
