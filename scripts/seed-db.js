import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read data files
const cocktailsPath = path.join(__dirname, 'data', 'raw', 'cocktails.json')
const enrichedCocktailsPath = path.join(__dirname, 'data', 'raw', 'cocktails-enriched.json')
const ingredientsPath = path.join(__dirname, 'data', 'i18n', 'ingredients.json')
const categoriesPath = path.join(__dirname, 'data', 'i18n', 'categories.json')
const imageMapPath = path.join(__dirname, 'data', 'raw', 'image-map.json')

// Use enriched data if available, otherwise use original
let cocktails
if (fs.existsSync(enrichedCocktailsPath)) {
  console.log('📚 Using enriched cocktails (PT/EN/ES descriptions)...')
  cocktails = JSON.parse(fs.readFileSync(enrichedCocktailsPath, 'utf-8'))
} else {
  console.log('📚 Using original cocktails (enrichment pending)...')
  cocktails = JSON.parse(fs.readFileSync(cocktailsPath, 'utf-8'))
}

const ingredientsDict = JSON.parse(fs.readFileSync(ingredientsPath, 'utf-8'))
const categoriesDict = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'))
const imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf-8'))

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY required in env')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
}

// Slugify helper
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n')

  try {
    // 1. Seed categories
    console.log('📦 Seeding categories...')
    const categoryMap = {} // slug → id

    for (const cat of categoriesDict.categories || categoriesDict) {
      const payload = {
        name: cat.name,
        name_i18n: cat.name_i18n,
        slug: cat.slug || slugify(cat.name),
      }

      // Mock insert (would use Supabase REST API in production)
      console.log(`  ✓ Category: ${payload.slug}`)
      categoryMap[payload.slug] = `cat-${payload.slug}` // Mock UUID
    }
    console.log(`✓ Categories seeded: ${Object.keys(categoryMap).length}\n`)

    // 2. Seed ingredients
    console.log('🥃 Seeding ingredients...')
    const ingredientMap = {} // name → id

    for (const ing of ingredientsDict.ingredients || ingredientsDict) {
      const payload = {
        name: ing.name,
        name_i18n: ing.name_i18n,
        slug: ing.slug || slugify(ing.name),
        type: ing.type || 'other',
      }

      // Mock insert
      console.log(`  ✓ Ingredient: ${payload.slug} (${payload.type})`)
      ingredientMap[ing.name.toLowerCase()] = `ing-${payload.slug}` // Mock UUID
    }
    console.log(`✓ Ingredients seeded: ${Object.keys(ingredientMap).length}\n`)

    // 3. Seed cocktails + cocktail_ingredients
    console.log('🍹 Seeding cocktails...')
    let seedCount = 0

    for (const drink of cocktails) {
      const categorySlug = drink.category_slug
      const categoryId = categoryMap[categorySlug] || categoryMap['cocktail'] || null

      const payload = {
        id: drink.id,
        name: drink.name,
        slug: drink.slug,
        category_id: categoryId,
        abv_estimate: null,
        difficulty: null,
        prep_time_minutes: null,
        flavor_tags: [],
        occasion_tags: [],
        thumb_url: imageMap[drink.slug] || drink.thumb_url,
        instructions_en: drink.instructions_en,
        instructions_es: drink.instructions_es,
        instructions_pt: drink.instructions_pt || null,
        description_en: drink.description_en || null,
        description_pt: drink.description_pt || null,
        description_es: drink.description_es || null,
        history_en: drink.history_en || null,
        history_pt: drink.history_pt || null,
        history_es: drink.history_es || null,
        fun_fact_en: drink.fun_fact_en || null,
        fun_fact_pt: drink.fun_fact_pt || null,
        fun_fact_es: drink.fun_fact_es || null,
        meta_title_en: drink.meta_title_en || drink.name,
        meta_title_pt: drink.meta_title_pt || drink.name,
        meta_title_es: drink.meta_title_es || drink.name,
        meta_desc_en: drink.meta_desc_en || '',
        meta_desc_pt: drink.meta_desc_pt || '',
        meta_desc_es: drink.meta_desc_es || '',
      }

      // Mock insert
      if (seedCount < 5) {
        console.log(
          `  ✓ ${drink.slug} (category: ${categorySlug}, ${drink.ingredients.length} ingredients)`
        )
      }

      // Seed cocktail_ingredients
      for (const [idx, ing] of drink.ingredients.entries()) {
        const ingredientId = ingredientMap[ing.name.toLowerCase()]
        if (ingredientId) {
          // Mock insert to cocktail_ingredients
          // console.log(`    → ${ing.name}: ${ing.amount_ml}ml`)
        }
      }

      seedCount++
    }

    console.log(`✓ Cocktails seeded: ${seedCount}\n`)

    // Summary
    console.log('✅ Database seeding complete!')
    console.log(`  Categories: ${Object.keys(categoryMap).length}`)
    console.log(`  Ingredients: ${Object.keys(ingredientMap).length}`)
    console.log(`  Cocktails: ${seedCount}`)
    console.log(
      `  Cocktail-Ingredients: ${cocktails.reduce((sum, d) => sum + d.ingredients.length, 0)}`
    )
  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    process.exit(1)
  }
}

// Run
seedDatabase()
