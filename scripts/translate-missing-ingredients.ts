/**
 * Translate missing ingredients (those without name_i18n) via Claude Haiku
 * Run with: npx ts-node scripts/translate-missing-ingredients.ts
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'

interface Ingredient {
  id: string
  name: string
  name_i18n: Record<string, string> | null
}

const client = new Anthropic()

async function fetchMissingIngredients(): Promise<Ingredient[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    process.exit(1)
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/ingredients?select=id,name,name_i18n&limit=500`,
      {
        headers: { apikey: supabaseKey },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch ingredients: ${response.statusText}`)
    }

    const ingredients: Ingredient[] = await response.json()
    const missing = ingredients.filter(ing => !ing.name_i18n)

    console.log(
      `Found ${missing.length} ingredients without translations out of ${ingredients.length}`
    )
    return missing
  } catch (error) {
    console.error('Error fetching ingredients:', error)
    process.exit(1)
  }
}

async function translateIngredients(
  ingredients: Ingredient[]
): Promise<Record<string, Record<string, string>>> {
  const translations: Record<string, Record<string, string>> = {}

  // Batch process ingredients (10 at a time)
  const batchSize = 10
  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize)
    console.log(
      `Translating batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(ingredients.length / batchSize)}...`
    )

    const ingredientNames = batch.map(ing => ing.name).join(', ')

    const prompt = `Translate the following ingredient names to Portuguese (PT), English (EN), and Spanish (ES).
Return as valid JSON object where keys are English ingredient names and values are objects with pt, en, es keys.

Ingredients: ${ingredientNames}

Important:
- Keep ingredient names concise and consistent
- For compound words (e.g., "Vanilla ice-cream"), use natural translations
- Maintain culinary/cocktail terminology where applicable
- EN should be the same as or very similar to the original if already in English

Return ONLY the JSON object, no other text.`

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type === 'text') {
        try {
          const parsed = JSON.parse(content.text)
          Object.assign(translations, parsed)
        } catch {
          console.error('Failed to parse response:', content.text)
        }
      }
    } catch (error) {
      console.error('Error calling Claude API:', error)
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return translations
}

async function updateIngredientsInDb(
  translations: Record<string, Record<string, string>>
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  console.log(`\nUpdating ${Object.keys(translations).length} ingredients in database...`)

  for (const [engName, i18n] of Object.entries(translations)) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/ingredients?name=ilike.${encodeURIComponent(engName)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name_i18n: i18n }),
        }
      )

      if (!response.ok) {
        console.warn(`Failed to update ingredient "${engName}": ${response.statusText}`)
      } else {
        console.log(`✓ Updated: ${engName}`)
      }
    } catch {
      console.error(`Error updating ingredient "${engName}"`)
    }
  }
}

async function main() {
  console.log('Fetching ingredients without translations...\n')
  const missing = await fetchMissingIngredients()

  if (missing.length === 0) {
    console.log('All ingredients are translated!')
    return
  }

  console.log('\nTranslating missing ingredients via Claude Haiku...')
  const translations = await translateIngredients(missing)

  console.log(`\nObtained translations for ${Object.keys(translations).length} ingredients`)

  // Save translations to file for review
  const outputFile = 'scripts/data/translations-missing.json'
  fs.writeFileSync(
    outputFile,
    JSON.stringify({ translations, count: Object.keys(translations).length }, null, 2)
  )
  console.log(`\nTranslations saved to ${outputFile}`)

  console.log('\nUpdating database...')
  await updateIngredientsInDb(translations)

  console.log('\n✅ Done!')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
