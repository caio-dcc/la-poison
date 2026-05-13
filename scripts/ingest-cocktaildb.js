import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const COCKTAILDB_URL = 'https://www.thecocktaildb.com/api/json/v1/1'
const OUTPUT_DIR = path.join(__dirname, 'data', 'raw')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'cocktails.json')

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  console.log(`✓ Created output directory: ${OUTPUT_DIR}`)
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeAmount(measure) {
  if (!measure) return null

  const normalized = measure.toLowerCase().trim()

  // Convert common measurements to ml
  const patterns = [
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

async function fetchDrinksByLetter(letter) {
  const url = `${COCKTAILDB_URL}/search.php?f=${letter}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`⚠ Failed to fetch letter '${letter}': ${response.status}`)
      return []
    }
    const data = await response.json()
    return data.drinks || []
  } catch (error) {
    console.error(`✗ Error fetching letter '${letter}':`, error.message)
    return []
  }
}

function processDrink(drink) {
  const ingredients = []
  const tags = (drink.strTags || '').split(',').filter(t => t.trim().length > 0)

  // Extract ingredients (strIngredient1-15 + strMeasure1-15)
  for (let i = 1; i <= 15; i++) {
    const ingredientKey = `strIngredient${i}`
    const measureKey = `strMeasure${i}`
    const ingredientName = drink[ingredientKey]
    const measure = drink[measureKey]

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
  const allDrinks = []
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

// Run
ingestCocktailDB().catch(console.error)
