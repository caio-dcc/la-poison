#!/usr/bin/env node
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const REST_URL = `${SUPABASE_URL}/rest/v1`
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// Load data files
const cocktails = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/cocktails.json'), 'utf8'))
const ingredientsDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/i18n/ingredients.json'), 'utf8'))
const categoriesDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/i18n/categories.json'), 'utf8'))
const imageMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/image-map.json'), 'utf8'))

console.log('📚 Data loaded')
console.log(`   ${cocktails.length} cocktails, ${ingredientsDict.ingredients.length} ingredients, ${categoriesDict.categories.length} categories\n`)

async function seed() {
  try {
    const ingredientMap = {}
    const categoryMap = {}

    // 1. Seed ingredients (simple)
    console.log('🥃 Seeding ingredients...')
    const ingredientsToSeed = ingredientsDict.ingredients.map(ing => ({
      name: ing.name,
      type: ing.type || 'other',
    }))

    const ingBatches = []
    for (let i = 0; i < ingredientsToSeed.length; i += 50) {
      ingBatches.push(ingredientsToSeed.slice(i, i + 50))
    }

    let ingCount = 0
    for (const batch of ingBatches) {
      const res = await fetch(`${REST_URL}/ingredients`, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      })
      if (res.ok) {
        ingCount += batch.length
        process.stdout.write(`\r  ✓ ${ingCount}/${ingredientsToSeed.length}`)
      } else if (res.status === 409) {
        // Conflict - some already exist
        ingCount += batch.length
        process.stdout.write(`\r  ✓ ${ingCount}/${ingredientsToSeed.length} (some duplicates, skipped)`)
      } else {
        const err = await res.text()
        console.error(`\n  Error ${res.status}: ${err}`)
        // Continue anyway
      }
    }
    console.log(`\n✓ Ingredients seeded\n`)

    // Fetch all ingredients to build map
    const allIngsRes = await fetch(`${REST_URL}/ingredients?select=id,name`, { headers })
    if (allIngsRes.ok) {
      const allIngs = await allIngsRes.json()
      for (const ing of allIngs) {
        ingredientMap[ing.name.toLowerCase()] = ing.id
      }
    }

    // 2. Seed categories (simple)
    console.log('📦 Seeding categories...')
    const categoriesToSeed = categoriesDict.categories.map(cat => ({
      category: cat.name,
    }))

    for (const cat of categoriesToSeed) {
      const res = await fetch(`${REST_URL}/cocktails?select=*&category=eq.${encodeURIComponent(cat.category)}&limit=1`, { headers })
      const existing = res.ok ? await res.json() : []
      if (existing.length === 0) {
        // Category doesn't exist in any cocktails yet - that's fine, we'll add it during cocktail insert
      }
    }
    console.log(`✓ Categories handled\n`)

    // 3. Seed cocktails
    console.log('🍹 Seeding cocktails...')
    const cocktailsToSeed = cocktails.map(drink => ({
      id: drink.id,
      name: drink.name,
      slug: drink.slug,
      category: drink.category || 'Other',
      instructions: drink.instructions_en || drink.instructions || '',
      thumb_url: imageMap[drink.slug] || drink.thumb_url || '',
      iba_drink: drink.iba ? true : false,
    }))

    const drinkBatches = []
    for (let i = 0; i < cocktailsToSeed.length; i += 50) {
      drinkBatches.push(cocktailsToSeed.slice(i, i + 50))
    }

    let drinkCount = 0
    for (const batch of drinkBatches) {
      const res = await fetch(`${REST_URL}/cocktails`, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      })
      if (res.ok) {
        drinkCount += batch.length
        process.stdout.write(`\r  ✓ ${drinkCount}/${cocktailsToSeed.length}`)
      } else if (res.status === 409) {
        drinkCount += batch.length
        process.stdout.write(`\r  ✓ ${drinkCount}/${cocktailsToSeed.length} (some duplicates, skipped)`)
      } else {
        const err = await res.text()
        console.error(`\n  Error ${res.status}: ${err}`)
      }
    }
    console.log(`\n✓ Cocktails seeded\n`)

    // 4. Seed cocktail_ingredients
    console.log('🔗 Seeding cocktail_ingredients...')
    const relBatch = []
    for (const drink of cocktails) {
      for (const ing of drink.ingredients) {
        const ingredientId = ingredientMap[ing.name.toLowerCase()]
        if (ingredientId) {
          relBatch.push({
            cocktail_id: drink.id,
            ingredient_id: ingredientId,
            measure: ing.measure || '',
          })
        }
      }
    }

    let relCount = 0
    for (let i = 0; i < relBatch.length; i += 100) {
      const batch = relBatch.slice(i, i + 100)
      const res = await fetch(`${REST_URL}/cocktail_ingredients`, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      })
      if (res.ok) {
        relCount += batch.length
        process.stdout.write(`\r  ✓ ${relCount}/${relBatch.length}`)
      } else if (res.status === 409) {
        relCount += batch.length
        process.stdout.write(`\r  ✓ ${relCount}/${relBatch.length} (some duplicates, skipped)`)
      }
    }
    console.log(`\n✓ ${relCount} relationships seeded\n`)

    console.log('✅ Database seeding complete!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

seed()
