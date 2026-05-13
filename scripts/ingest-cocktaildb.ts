import * as fs from 'fs'
import * as path from 'path'
import { slugify } from '../src/lib/seo/slugify.ts'

const COCKTAILDB_URL = 'https://www.thecocktaildb.com/api/json/v1/1'
const OUTPUT_DIR = path.join(import.meta.dirname, 'data', 'raw')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'cocktails.json')

interface CocktailDBDrink {
  idDrink: string
  strDrink: string
  strDrinkAlternate: string | null
  strTags: string | null
  strVideo: string | null
  strCategory: string
  strIBA: string | null
  strAlcoholic: string
  strGlass: string
  strInstructions: string
  strInstructionsES: string | null
  strInstructionsFR: string | null
  strInstructionsDE: string | null
  strInstructionsIT: string | null
  strDrinkThumb: string
  strImageSource: string | null
  strImageAttribution: string | null
  strCreativeCommonsConfirmed: string | null
  dateModified: string | null
  [key: string]: string | null
}

interface ProcessedIngredient {
  name: string // EN original from CocktailDB
  measure: string
  amount_ml: number | null
}

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
  ingredients: ProcessedIngredient[]
  tags: string[]
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log(`✓ Created output directory: ${OUTPUT_DIR}`)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeAmount(measure: string | null): number | null {
  if (!measure) return null

  const normalized = measure.toLowerCase().trim()

  // Convert common measurements to ml
  const patterns: Array<[RegExp, number]> = [
    [/(\d+(?:\.\d+)?)\s*?oz$/i, 29.5735], // 1 oz = 29.5735 ml
    [/(\d+(?:\.\d+)?)\s*?ml$/i, 1],
    [/(\d+(?:\.\d+)?)\s*?l$/i, 1000],
    [/(\d+(?:\.\d+)?)\s*?dash$/i, 0.92], // 1 dash ≈ 0.92 ml
    [/(\d+(?:\.\d+)?)\s*?tsp$/i, 4.93], // 1 tsp ≈ 4.93 ml
    [/(\d+(?:\.\d+)?)\s*?tbsp$/i, 14.79], // 1 tbsp ≈ 14.79 ml
  ]

  for (const [pattern, multiplier] of patterns) {
    const match = normalized.match(pattern)
    if (match && match[1]) {
      return parseFloat(match[1]) * multiplier
    }
  }

  return null
}

async function fetchDrinksByLetter(letter: string): Promise<CocktailDBDrink[]> {
  const url = `${COCKTAILDB_URL}/search.php?f=${letter}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`⚠ Failed to fetch letter '${letter}': ${response.status}`)
      return []
    }
    const data = (await response.json()) as { drinks: CocktailDBDrink[] | null }
    return data.drinks || []
  } catch (error) {
    console.error(`✗ Error fetching letter '${letter}':`, error)
    return []
  }
}

function processDrink(drink: CocktailDBDrink): ProcessedDrink {
  const ingredients: ProcessedIngredient[] = []
  const tags = (drink.strTags || '').split(',').filter(t => t.trim().length > 0)

  // Extract ingredients (strIngredient1-15 + strMeasure1-15)
  for (let i = 1; i <= 15; i++) {
    const ingredientKey = `strIngredient${i}`
    const measureKey = `strMeasure${i}`
    const ingredientName = drink[ingredientKey] as string | null
    const measure = drink[measureKey] as string | null

    if (ingredientName && ingredientName.trim()) {
      ingredients.push({
        name: ingredientName.trim(),
        measure: measure ? measure.trim() : '',
        amount_ml: normalizeAmount(measure),
      })
    }
  }

  return {
    id: drink.idDrink,
    name: drink.strDrink,
    slug: slugify(drink.strDrink),
    category: drink.strCategory,
    category_slug: slugify(drink.strCategory),
    alcoholic: drink.strAlcoholic === 'Alcoholic',
    ibadrink: drink.strIBA ? true : false,
    instructions_en: drink.strInstructions,
    instructions_es: drink.strInstructionsES || null,
    thumb_url: drink.strDrinkThumb,
    ingredients,
    tags: tags.map(t => t.trim()),
  }
}

async function ingestCocktailDB() {
  console.log('🍹 Starting CocktailDB ingestion...\n')

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  const allDrinks: ProcessedDrink[] = []
  let totalFetched = 0

  for (const letter of letters) {
    const drinks = await fetchDrinksByLetter(letter)
    const processed = drinks.map(processDrink)
    allDrinks.push(...processed)
    totalFetched += drinks.length
    console.log(`✓ Letter '${letter}': ${drinks.length} drinks`)

    // Rate limiting: 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Remove duplicates by slug
  const uniqueDrinks = Array.from(new Map(allDrinks.map(d => [d.slug, d])).values())

  // Save to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueDrinks, null, 2))

  console.log(`\n✓ Ingestion complete!`)
  console.log(`  Total fetched: ${totalFetched}`)
  console.log(`  Unique drinks: ${uniqueDrinks.length}`)
  console.log(`  Output: ${OUTPUT_FILE}`)

  return uniqueDrinks
}

// Run if called directly
if (import.meta.main) {
  ingestCocktailDB().catch(console.error)
}

export { ingestCocktailDB, ProcessedDrink }
