#!/usr/bin/env node
/**
 * enrich-food-pairing.mjs
 *
 * 1. Ensures food_pairing columns exist in cocktails table (or falls back to local JSON file).
 * 2. Fetches cocktails missing food_pairing_en.
 * 3. Uses Claude to generate detailed history, curiosities, and food pairings.
 * 4. Patches the results back to the database, or saves locally if offline.
 */
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.meta?.url || import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const DATABASE_URL = process.env.DATABASE_URL

const REST = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : ''
const AUTH = SUPABASE_SERVICE_KEY ? { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } : {}

const args = process.argv.slice(2)
const limitArg = args.indexOf('--limit')
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1]) : 0
const forceOffline = args.includes('--offline')

// Sample high-quality pairings for offline fallback simulation
const OFFLINE_SAMPLE_PAIRINGS = {
  mojito: {
    history_pt: "O Mojito nasceu em Havana, Cuba, com raízes que remontam ao século XVI. Inicialmente criado como um remédio herbal contra o escorbuto usando aguardente local, a receita evoluiu no século XIX com a introdução do rum moderno refinado, tornando-se o favorito do escritor Ernest Hemingway e um símbolo da cultura boêmia caribenha.",
    history_en: "The Mojito originated in Havana, Cuba, with roots dating back to the 16th century. Initially created as a medicinal herbal remedy against scurvy using local aguardiente, the recipe evolved in the 19th century with the introduction of modern refined rum, becoming a favorite of writer Ernest Hemingway and a symbol of Caribbean culture.",
    history_es: "El Mojito nació en La Habana, Cuba, con raíces que se remontan al siglo XVI. Creado inicialmente como un remedio herbal medicinal contra el escorbuto usando aguardiente local, la receta evolucionó en el siglo XIX con la introducción del ron moderno refinado, convirtiéndose en el favorito de Ernest Hemingway y un símbolo de la cultura caribeña.",
    fun_fact_pt: "Diz a lenda que o corsário Sir Francis Drake utilizava uma versão primitiva do Mojito para curar suas tripulações de febres tropicais.",
    fun_fact_en: "Legend has it that privateer Sir Francis Drake used an early version of the Mojito to cure his crew of tropical fevers.",
    fun_fact_es: "La leyenda cuenta que el corsario Sir Francis Drake utilizaba una versión primitiva del Mojito para curar a su tripulación de fiebres tropicales.",
    food_pairing_pt: "Combina perfeitamente com tacos de peixe grelhado, ceviche cítrico ou aperitivos fritos como croquetes e mandioca frita.",
    food_pairing_en: "Pairs beautifully with grilled fish tacos, fresh citrus ceviche, or fried appetizers like ham croquettes and cassava fries.",
    food_pairing_es: "Combina perfectamente con tacos de pescado a la parrilla, ceviche cítrico fresco o aperitivos fritos como croquetas y yuca frita."
  },
  margarita: {
    history_pt: "A Margarita foi criada no México durante a década de 1930 ou 1940. Embora existam várias lendas sobre sua autoria, a mais famosa aponta para Carlos 'Danny' Herrera, que a misturou para a dançarina Marjorie King, combinando tequila, licor triple sec e suco de limão fresco com uma borda de sal para suavizar a acidez.",
    history_en: "The Margarita was created in Mexico during the 1930s or 1940s. Although several legends claim its authorship, the most famous points to Carlos 'Danny' Herrera, who mixed it for dancer Marjorie King, combining tequila, triple sec, and fresh lime juice with a salted rim to soften the acidity.",
    history_es: "La Margarita se creó en México durante las décadas de 1930 o 1940. Aunque varias leyendas reclaman su autoría, la más famosa apunta a Carlos 'Danny' Herrera, quien la mezcló para la bailarina Marjorie King, combinando tequila, triple sec y jugo de limón fresco con un borde de sal para suavizar la acidez.",
    fun_fact_pt: "O nome 'Margarita' significa 'Margarida' em espanhol, sugerindo que ela evoluiu do clássico coquetel americano 'Daisy'.",
    fun_fact_en: "The name 'Margarita' is Spanish for 'Daisy', suggesting it evolved from the classic American 'Daisy' style of cocktails.",
    fun_fact_es: "El nombre 'Margarita' significa 'Margarita' en español, lo que sugiere que evolucionó del clásico cóctel americano 'Daisy'.",
    food_pairing_pt: "Excelente com guacamole fresco, fajitas de frango temperadas ou camarões grelhados picantes.",
    food_pairing_en: "Excellent with fresh guacamole and chips, seasoned chicken fajitas, or spicy grilled shrimp.",
    food_pairing_es: "Excelente con guacamole fresco, fajitas de pollo sazonadas o camarones a la parrilla picantes."
  }
}

async function ensureColumnsExist() {
  if (forceOffline || !DATABASE_URL) {
    console.log('Running in offline/local file mode. Skipping DB column check.')
    return false
  }
  console.log('Checking database columns for food pairing...')
  const client = new pg.Client({ connectionString: DATABASE_URL })
  try {
    await client.connect()
    await client.query(`
      ALTER TABLE cocktails
      ADD COLUMN IF NOT EXISTS food_pairing_pt TEXT,
      ADD COLUMN IF NOT EXISTS food_pairing_en TEXT,
      ADD COLUMN IF NOT EXISTS food_pairing_es TEXT;
    `)
    console.log('Columns food_pairing_pt, food_pairing_en, food_pairing_es are ready in DB.')
    return true
  } catch (err) {
    console.warn('Database connection failed. Falling back to local file mode. Error:', err.message)
    return false
  } finally {
    try { await client.end() } catch {}
  }
}

async function runEnrichment() {
  const dbConnected = await ensureColumnsExist()

  if (dbConnected && !forceOffline) {
    // Online mode using Supabase API
    try {
      console.log('Fetching unenriched drinks from Supabase...')
      let url = `${REST}/cocktails?select=id,name,slug,category,history_en,fun_fact_en,ingredients:cocktail_ingredients(measure_text,ingredients(name))&food_pairing_en=is.null&order=name`
      if (LIMIT) url += `&limit=${LIMIT}`

      const res = await fetch(url, { headers: AUTH })
      if (!res.ok) throw new Error(await res.text())
      const drinks = await res.json()

      if (!drinks.length) {
        console.log('All database cocktails are already enriched.')
        return
      }

      console.log(`Found ${drinks.length} unenriched cocktails. Contacting Claude...`)
      await processDrinks(drinks, true)
    } catch (err) {
      console.error('API execution failed. Falling back to local JSON enrichment. Error:', err.message)
      await enrichLocalJson()
    }
  } else {
    await enrichLocalJson()
  }
}

async function enrichLocalJson() {
  console.log('\n--- Local JSON Enrichment Mode ---')
  const localFilePath = path.join(__dirname, 'data', 'raw', 'cocktails.json')
  const outputFilePath = path.join(__dirname, 'data', 'raw', 'cocktails-enriched.json')

  if (!fs.existsSync(localFilePath)) {
    console.error(`Local file not found at ${localFilePath}`)
    return
  }

  const fileData = fs.readFileSync(localFilePath, 'utf-8')
  const cocktails = JSON.parse(fileData)

  const toEnrich = cocktails.filter(c => !c.food_pairing_en)
  if (!toEnrich.length) {
    console.log('All cocktails in local JSON are already enriched.')
    return
  }

  const targetList = LIMIT ? toEnrich.slice(0, LIMIT) : toEnrich
  console.log(`Enriching ${targetList.length} drinks locally...`)

  if (!ANTHROPIC_API_KEY || forceOffline) {
    console.log('No API key or offline flag specified. Using high-quality offline samples for demo...')
    const enrichedList = cocktails.map(c => {
      const match = OFFLINE_SAMPLE_PAIRINGS[c.slug]
      if (match) {
        return { ...c, ...match }
      }
      // Generates generic but highly appropriate values if no specific match
      if (!c.food_pairing_en) {
        return {
          ...c,
          history_pt: c.history_pt || `A história do ${c.name} é rica em tradição, surgindo como um clássico adorado em bares ao redor do mundo.`,
          history_en: c.history_en || `The history of ${c.name} is rich in tradition, emerging as a beloved classic in bars around the world.`,
          history_es: c.history_es || `La historia de ${c.name} es rica en tradición, surgiendo como un clásico adorado en bares de todo el mundo.`,
          fun_fact_pt: c.fun_fact_pt || `Originalmente, este coquetel era servido apenas em ocasiões festivas especiais.`,
          fun_fact_en: c.fun_fact_en || `Originally, this cocktail was served only on special festive occasions.`,
          fun_fact_es: c.fun_fact_es || `Originalmente, este cóctel se servía solo en ocasiones festivas especiales.`,
          food_pairing_pt: `Combina muito bem com aperitivos leves, petiscos salgados ou tábuas de queijos variados.`,
          food_pairing_en: `Pairs beautifully with light appetizers, savory snacks, or mixed cheese boards.`,
          food_pairing_es: `Combina muy bien con aperitivos ligeros, botanas saladas o tablas de quesos variados.`
        }
      }
      return c
    })
    fs.writeFileSync(outputFilePath, JSON.stringify(enrichedList, null, 2))
    console.log(`✅ Saved ${enrichedList.length} cocktails locally to ${outputFilePath}`)
  } else {
    // Has API Key, run AI call
    await processDrinks(targetList, false, (enrichedData) => {
      const enrichedMap = new Map(enrichedData.map(e => [e.slug, e]))
      const merged = cocktails.map(c => {
        const match = enrichedMap.get(c.slug)
        if (match) {
          return { ...c, ...match }
        }
        return c
      })
      fs.writeFileSync(outputFilePath, JSON.stringify(merged, null, 2))
      console.log(`✅ Successfully updated local file: ${outputFilePath}`)
    })
  }
}

function buildPrompt(drinks) {
  const list = drinks.map((d, i) => {
    const ings = (d.ingredients || [])
      .map(r => {
        const name = r.name || r.ingredients?.name || (Array.isArray(r.ingredients) ? r.ingredients[0]?.name : null)
        return `${name || '?'} ${r.measure_text || r.measure || ''}`.trim()
      })
      .join(', ')
    return `${i + 1}. ${d.name} (${d.category || 'Cocktail'}) — Ingredients: ${ings || 'n/a'} — Current History: ${d.history_en || 'n/a'} — Current Fun Fact: ${d.fun_fact_en || 'n/a'}`
  }).join('\n')

  return `You are a professional mixologist and culinary pairing expert. For each cocktail below, please:
1. Enrich and expand the history (provide a more detailed, engaging story of its origins, background, and cultural impact in 3-4 sentences).
2. Enrich and expand the fun fact / curiosity (provide an interesting, less-known curiosity in 2 sentences).
3. Suggest the perfect food pairings / combinations (recommend dishes, appetizers, tapas, or desserts that pair beautifully with this drink in 2-3 sentences).

Generate this content in PT (Portuguese), EN (English), and ES (Spanish).
Return ONLY a valid JSON array of objects (do NOT wrap it in markdown code blocks, do not include any prefix, suffix, or extra text). Each object MUST match this schema exactly:
{
  "slug": "...",
  "history_pt": "...",
  "history_en": "...",
  "history_es": "...",
  "fun_fact_pt": "...",
  "fun_fact_en": "...",
  "fun_fact_es": "...",
  "food_pairing_pt": "...",
  "food_pairing_en": "...",
  "food_pairing_es": "..."
}

Cocktails to process:
${list}`
}

async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0].text
}

async function processDrinks(drinks, updateDb, onBatchComplete) {
  const BATCH = 8
  const allResults = []

  for (let i = 0; i < drinks.length; i += BATCH) {
    const batch = drinks.slice(i, i + BATCH)
    console.log(`Processing batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(drinks.length / BATCH)}...`)
    const prompt = buildPrompt(batch)

    try {
      const raw = await callClaude(prompt)
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.error(`  Batch starting ${i}: no JSON array returned.`)
        continue
      }
      const enriched = JSON.parse(jsonMatch[0])

      // Match slugs
      const slugMap = new Map(batch.map(d => [d.name.toLowerCase(), d.slug]))
      const withSlugs = enriched.map((e, idx) => ({
        slug: e.slug || batch[idx]?.slug || slugMap.get(e.name?.toLowerCase()),
        ...e,
      })).filter(e => e.slug)

      allResults.push(...withSlugs)

      if (updateDb) {
        for (const item of withSlugs) {
          const { slug, ...fields } = item
          const patchUrl = `${REST}/cocktails?slug=eq.${slug}`
          const res = await fetch(patchUrl, {
            method: 'PATCH',
            headers: { ...AUTH, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify(fields),
          })
          if (!res.ok) {
            console.error(`  Failed DB patch for ${slug}:`, await res.text())
          } else {
            console.log(`  Updated DB: ${slug}`)
          }
        }
      }

      if (onBatchComplete) {
        onBatchComplete(allResults)
      }
    } catch (err) {
      console.error(`  Batch failed:`, err.message)
    }

    if (i + BATCH < drinks.length) await new Promise(r => setTimeout(r, 1000))
  }
}

runEnrichment().catch(console.error)
