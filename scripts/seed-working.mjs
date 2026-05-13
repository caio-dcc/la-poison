#!/usr/bin/env node
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { randomUUID } from 'crypto'

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

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

// Load data files
const cocktails = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/cocktails.json'), 'utf8'))
const ingredientsDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/i18n/ingredients.json'), 'utf8'))
const imageMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/image-map.json'), 'utf8'))

console.log('📚 Data loaded')
console.log(`   ${cocktails.length} cocktails, ${ingredientsDict.ingredients.length} ingredients\n`)

async function seed() {
  try {
    const ingredientMap = {}
    let ingredientCount = 0

    // 1. Fetch or create ingredients
    console.log('🥃 Processing ingredients...')

    // Fetch existing
    const existingRes = await fetch(`${REST_URL}/ingredients?select=id,name`, { headers })
    if (existingRes.ok) {
      const existing = await existingRes.json()
      for (const ing of existing) {
        ingredientMap[ing.name.toLowerCase()] = ing.id
      }
      console.log(`   Found ${existing.length} existing ingredients`)
    }

    // Insert missing ones
    const toInsert = ingredientsDict.ingredients.filter(ing => !ingredientMap[ing.name.toLowerCase()])
    if (toInsert.length > 0) {
      const batch = toInsert.map(ing => ({
        name: ing.name,
        slug: slugify(ing.name),
        type: ing.type || 'other',
      }))

      const res = await fetch(`${REST_URL}/ingredients`, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      })

      if (res.ok || res.status === 409) {
        // Re-fetch all to get the new ones
        const allRes = await fetch(`${REST_URL}/ingredients?select=id,name`, { headers })
        if (allRes.ok) {
          const all = await allRes.json()
          for (const ing of all) {
            ingredientMap[ing.name.toLowerCase()] = ing.id
          }
          ingredientCount = all.length
        }
      }
    } else {
      ingredientCount = Object.keys(ingredientMap).length
    }
    console.log(`✓ ${ingredientCount} ingredients ready\n`)

    // 2. Check which cocktails already exist
    console.log('🍹 Checking cocktails...')
    const existingCocktailsRes = await fetch(`${REST_URL}/cocktails?select=slug&limit=1000`, { headers })
    const existingSlugs = new Set()
    if (existingCocktailsRes.ok) {
      const existing = await existingCocktailsRes.json()
      for (const c of existing) {
        existingSlugs.add(c.slug)
      }
      console.log(`   Found ${existing.length} existing cocktails`)
    }

    const toInsertCocktails = cocktails.filter(d => !existingSlugs.has(d.slug))
    console.log(`   Will seed ${toInsertCocktails.length} new cocktails\n`)

    console.log('🍹 Seeding cocktails...')
    const cocktailBatches = []
    for (let i = 0; i < toInsertCocktails.length; i += 50) {
      const batch = toInsertCocktails.slice(i, i + 50).map((drink) => ({
        id: randomUUID(), // Generate new UUID
        name: drink.name,
        slug: drink.slug,
        category: drink.category || 'Other',
        instructions: drink.instructions_en || drink.instructions || '',
        thumb_url: imageMap[drink.slug] || drink.thumb_url || '',
        iba_drink: drink.iba ? true : false,
      }))
      cocktailBatches.push(batch)
    }

    let cocktailCount = 0
    if (cocktailBatches.length === 0) {
      console.log('✓ All cocktails already seeded\n')
    } else {
      for (const batch of cocktailBatches) {
        const res = await fetch(`${REST_URL}/cocktails`, {
          method: 'POST',
          headers,
          body: JSON.stringify(batch),
        })
        if (res.ok) {
          cocktailCount += batch.length
          process.stdout.write(`\r  ✓ ${cocktailCount}/${toInsertCocktails.length}`)
        } else {
          const err = await res.text()
          console.error(`\n  Error: ${res.status} ${err}`)
          throw new Error(`Cocktail batch failed`)
        }
      }
      console.log(`\n✓ ${cocktailCount} new cocktails seeded\n`)
    }
    cocktailCount = existingSlugs.size + cocktailCount

    // 3. Fetch cocktails to build map for relationships
    console.log('🔗 Building cocktail map...')
    const allCocktailsRes = await fetch(`${REST_URL}/cocktails?select=id,slug&limit=1000`, { headers })
    const cocktailMap = {}
    if (allCocktailsRes.ok) {
      const allCocktails = await allCocktailsRes.json()
      for (const c of allCocktails) {
        cocktailMap[c.slug] = c.id
      }
    }
    console.log(`   Found ${Object.keys(cocktailMap).length} cocktails by slug\n`)

    // 4. Seed cocktail_ingredients
    console.log('🔗 Seeding cocktail_ingredients...')
    const relBatch = []
    for (const drink of cocktails) {
      const cocktailId = cocktailMap[drink.slug]
      if (!cocktailId) {
        console.warn(`   ⚠️ Cocktail not found for slug: ${drink.slug}`)
        continue
      }
      for (const ing of drink.ingredients) {
        const ingredientId = ingredientMap[ing.name.toLowerCase()]
        if (ingredientId) {
          relBatch.push({
            cocktail_id: cocktailId,
            ingredient_id: ingredientId,
            measure_text: ing.measure || '',
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
      } else {
        const err = await res.text()
        console.error(`\n  Error: ${res.status} ${err}`)
      }
    }
    console.log(`\n✓ ${relCount} relationships seeded\n`)

    console.log('✅ Database seeding complete!')
    console.log(`   Cocktails: ${cocktailCount}`)
    console.log(`   Ingredients: ${ingredientCount}`)
    console.log(`   Relationships: ${relCount}`)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

seed()
