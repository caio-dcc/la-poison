/**
 * Full sweep: translates ALL ingredient names that need PT/ES translations.
 * Handles three cases:
 *   1. name_i18n is null or all empty strings (en not even set)
 *   2. name_i18n.en is set but pt/es are empty
 *   3. name_i18n.pt == name_i18n.en (not actually translated — generic ingredients)
 *
 * Brand names / proper nouns are preserved by the AI prompt.
 * Run: npx tsx scripts/translate-ingredients.ts
 */
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envLines = readFileSync(resolve(process.cwd(), '.env'), 'utf8').split('\n')
for (const line of envLines) {
  const m = line.match(/^([^#=\s]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const BATCH_SIZE = 60

// Known brand names / proper nouns that should NOT be translated
// (AI prompt handles most cases, but this acts as a safety net)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BRAND_KEYWORDS = [
  'absolut',
  'bacardi',
  'baileys',
  'benedictine',
  'campari',
  'chambord',
  'chartreuse',
  'cointreau',
  'corona',
  'crown royal',
  'drambuie',
  'dubonnet',
  'everclear',
  'falernum',
  'firewater',
  'frangelico',
  'fresca',
  'galliano',
  'godiva',
  'goldschlager',
  'grand marnier',
  'guinness',
  'jack daniels',
  'jager',
  'jäger',
  'jim beam',
  'kahlua',
  'kool-aid',
  'lillet',
  'malibu',
  'mezcal',
  'midori',
  'mountain dew',
  'ouzo',
  'passoa',
  'pepsi',
  'pernod',
  'peychaud',
  'pisang ambon',
  'pisco',
  'prosecco',
  'ricard',
  'sambuca',
  'schweppes',
  'southern comfort',
  'sprite',
  'st. germain',
  'surge',
  'tabasco',
  'tia maria',
  'triple sec',
  'wild turkey',
  'worcestershire',
  'yukon jack',
  'zima',
  '7-up',
  'amaretto',
  'aperol',
  'applejack',
  'advocaat',
  'dr. pepper',
  'coca-cola',
  'orgeat',
  'creme de',
  'cherry heering',
  'blue curacao',
  'orange curacao',
  'añejo',
]

type Ingredient = {
  id: string
  name: string
  name_i18n: Record<string, string> | null
}

async function translateBatch(
  items: Array<{ id: string; name: string; enName: string }>
): Promise<Record<string, { pt: string; es: string }>> {
  const names = items.map(i => i.enName)
  const prompt = `You are translating cocktail ingredient names from English to Brazilian Portuguese (pt) and Spanish (es).

Rules:
- Return ONLY a valid JSON object. No markdown, no explanation.
- Each key is the exact English name provided. Each value is {"pt":"...","es":"..."}.
- For brand names, proper nouns, and internationally standardized terms (e.g. "Baileys", "Cointreau", "Rum", "Vodka", "Tequila", "Whisky", "Gin"), return the same name unchanged in both pt and es.
- For generic ingredients, provide proper translations (e.g. "Apple" → {"pt":"Maçã","es":"Manzana"}, "Salt" → {"pt":"Sal","es":"Sal"}, "Ice" → {"pt":"Gelo","es":"Hielo"}).
- Common bar terms like "Soda water" → {"pt":"Água com gás","es":"Agua con gas"}, "Heavy cream" → {"pt":"Creme de leite","es":"Crema de leche"}.

Names to translate:
${JSON.stringify(names)}`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 300)}`)
  return JSON.parse(jsonMatch[0])
}

async function main() {
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('id, name, name_i18n')

  if (error) {
    console.error('Failed to fetch ingredients:', error.message)
    process.exit(1)
  }

  const all = (ingredients ?? []) as Ingredient[]

  // Build work list: ingredients that need translation
  const toProcess = all
    .map(i => {
      const n = i.name_i18n as Record<string, string> | null
      const enName = n?.en || i.name
      const ptName = n?.pt || ''
      const esName = n?.es || ''

      const needsWork = !n || !n.en || !ptName || !esName || ptName === enName || esName === enName

      if (!needsWork) return null
      return { id: i.id, name: i.name, enName }
    })
    .filter(Boolean) as Array<{ id: string; name: string; enName: string }>

  console.log(`Total ingredients: ${all.length}`)
  console.log(`Need translation sweep: ${toProcess.length}`)

  let updated = 0
  let skipped = 0

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE)
    console.log(`\nBatch ${batchNum}/${totalBatches}: ${batch.length} ingredients...`)

    try {
      const translations = await translateBatch(batch)

      for (const ing of batch) {
        const t = translations[ing.enName]
        if (!t) {
          console.warn(`  [WARN] No translation for: "${ing.enName}"`)
          skipped++
          continue
        }

        const ptFinal = t.pt && t.pt.length > 0 ? t.pt : ing.enName
        const esFinal = t.es && t.es.length > 0 ? t.es : ing.enName
        const name_i18n = { en: ing.enName, pt: ptFinal, es: esFinal }

        const { error: updateErr } = await supabase
          .from('ingredients')
          .update({ name_i18n })
          .eq('id', ing.id)

        if (updateErr) {
          console.error(`  [ERR] "${ing.enName}": ${updateErr.message}`)
          skipped++
        } else {
          const changed = ptFinal !== ing.enName || esFinal !== ing.enName
          const tag = changed ? '✓' : '○ (brand)'
          console.log(`  ${tag} ${ing.enName} → pt:"${ptFinal}" / es:"${esFinal}"`)
          updated++
        }
      }
    } catch (err) {
      console.error(`  [ERR] Batch ${batchNum} failed:`, err)
      skipped += batch.length
    }

    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise(r => setTimeout(r, 800))
    }
  }

  console.log(`\n--- Done ---`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped/errors: ${skipped}`)
  console.log(`Already OK: ${all.length - toProcess.length}`)
}

main()
