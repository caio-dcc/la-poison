import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY required in env')
  process.exit(1)
}

const REST_URL = `${SUPABASE_URL}/rest/v1`
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'apikey': SUPABASE_SERVICE_KEY,
}

// Read data files
const cocktailsPath = path.join(__dirname, 'data', 'raw', 'cocktails.json')
const ingredientsPath = path.join(__dirname, 'data', 'i18n', 'ingredients.json')
const categoriesPath = path.join(__dirname, 'data', 'i18n', 'categories.json')
const imageMapPath = path.join(__dirname, 'data', 'raw', 'image-map.json')
const embeddingsPath = path.join(__dirname, 'data', 'raw', 'cocktails-embedded.json')

console.log('📚 Loading data files...')
const cocktails = JSON.parse(fs.readFileSync(cocktailsPath, 'utf-8'))
const ingredientsDict = JSON.parse(fs.readFileSync(ingredientsPath, 'utf-8'))
const categoriesDict = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'))
const imageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf-8'))
const embeddingsMap = JSON.parse(fs.readFileSync(embeddingsPath, 'utf-8'))

console.log(`✓ Loaded ${cocktails.length} cocktails`)
console.log(`✓ Loaded ${ingredientsDict.ingredients.length} ingredients`)
console.log(`✓ Loaded ${categoriesDict.categories.length} categories`)
console.log(`✓ Loaded ${Object.keys(embeddingsMap).length} embeddings\n`)

async function fetchSupabase(table, method = 'POST', data = null, query = '') {
  const url = `${REST_URL}/${table}${query}`
  const options = {
    method,
    headers,
  }
  if (data) {
    options.body = JSON.stringify(data)
  }
  const response = await fetch(url, options)
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${error}`)
  }
  return response.json()
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n')

    // 2. Seed categories
    console.log('📦 Seeding categories...')
    const categoryMap = {} // slug → id

    const categoryBatch = categoriesDict.categories.map((cat) => ({
      name: cat.name,
      name_i18n: cat.name_i18n,
      slug: cat.slug,
    }))

    // Use upsert to handle existing categories
    const response = await fetch(`${REST_URL}/categories?on_conflict=slug`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(categoryBatch),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Categories seeding failed: ${response.status} ${error}`)
    }

    const insertedCategories = await response.json()
    insertedCategories.forEach((cat) => {
      categoryMap[cat.slug] = cat.id
    })
    console.log(`✓ Categories seeded: ${insertedCategories.length}\n`)

    // 3. Seed ingredients
    console.log('🥃 Seeding ingredients...')
    const ingredientMap = {} // name (lowercase) → id

    const ingredientBatch = ingredientsDict.ingredients.map((ing) => ({
      name: ing.name,
      name_i18n: ing.name_i18n,
      slug: ing.slug,
      type: ing.type || 'other',
    }))

    const insertedIngredients = await fetchSupabase('ingredients', 'POST', ingredientBatch)
    insertedIngredients.forEach((ing) => {
      ingredientMap[ing.name.toLowerCase()] = ing.id
    })
    console.log(`✓ Ingredients seeded: ${insertedIngredients.length}\n`)

    // 4. Seed cocktails with embeddings
    console.log('🍹 Seeding cocktails...')
    const cocktailBatch = cocktails.map((drink) => ({
      id: drink.id,
      name: drink.name,
      slug: drink.slug,
      category_id: categoryMap[drink.category_slug] || categoryMap['cocktail'],
      abv_estimate: drink.abv_estimate || null,
      difficulty: drink.difficulty || null,
      prep_time_minutes: drink.prep_time_minutes || null,
      flavor_tags: drink.flavor_tags || [],
      occasion_tags: drink.occasion_tags || [],
      thumb_url: imageMap[drink.slug] || drink.thumb_url,
      instructions_en: drink.instructions_en || '',
      instructions_es: drink.instructions_es || '',
      instructions_pt: drink.instructions_pt || '',
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
      embedding: embeddingsMap[drink.slug] ? embeddingsMap[drink.slug].embedding : null,
    }))

    // Insert in batches of 50
    for (let i = 0; i < cocktailBatch.length; i += 50) {
      const batch = cocktailBatch.slice(i, Math.min(i + 50, cocktailBatch.length))
      await fetchSupabase('cocktails', 'POST', batch)
      process.stdout.write(
        `\r  ✓ Inserted ${Math.min(i + 50, cocktailBatch.length)}/${cocktailBatch.length} cocktails`
      )
    }
    console.log(`\n✓ Cocktails seeded: ${cocktailBatch.length}\n`)

    // 5. Seed cocktail_ingredients (relationships)
    console.log('🔗 Seeding cocktail_ingredients...')
    const cocktailIngredientsBatch = []
    for (const drink of cocktails) {
      for (const ing of drink.ingredients) {
        const ingredientId = ingredientMap[ing.name.toLowerCase()]
        if (ingredientId) {
          cocktailIngredientsBatch.push({
            cocktail_id: drink.id,
            ingredient_id: ingredientId,
            measure_text: ing.measure || '',
            amount_ml: ing.amount_ml || null,
          })
        }
      }
    }

    // Insert in batches of 100
    for (let i = 0; i < cocktailIngredientsBatch.length; i += 100) {
      const batch = cocktailIngredientsBatch.slice(i, Math.min(i + 100, cocktailIngredientsBatch.length))
      await fetchSupabase('cocktail_ingredients', 'POST', batch)
      process.stdout.write(
        `\r  ✓ Inserted ${Math.min(i + 100, cocktailIngredientsBatch.length)}/${cocktailIngredientsBatch.length} relationships`
      )
    }
    console.log(`\n✓ Cocktail_ingredients seeded: ${cocktailIngredientsBatch.length}\n`)

    console.log('✅ Database seeding complete!')
    console.log(
      `\n📊 Summary:
  • Categories: ${insertedCategories.length}
  • Ingredients: ${insertedIngredients.length}
  • Cocktails: ${cocktailBatch.length}
  • Cocktail-Ingredient relationships: ${cocktailIngredientsBatch.length}`
    )
  } catch (error) {
    console.error('❌ Error seeding database:', error.message)
    process.exit(1)
  }
}

seedDatabase()
