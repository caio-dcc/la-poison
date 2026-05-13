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

// Load data files
const cocktails = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/cocktails.json'), 'utf8'))
const ingredientsDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/i18n/ingredients.json'), 'utf8'))
const categoriesDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/i18n/categories.json'), 'utf8'))
const imageMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/image-map.json'), 'utf8'))
const embeddingsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/cocktails-embedded.json'), 'utf8'))

console.log('📚 Data loaded')
console.log(`   ${cocktails.length} cocktails, ${ingredientsDict.ingredients.length} ingredients, ${categoriesDict.categories.length} categories\n`)

const categoryMap = {}
const ingredientMap = {}

async function seed() {
  try {
    // 1. Fetch existing categories and build map
    console.log('📦 Checking categories...')
    const catRes = await fetch(`${REST_URL}/categories`, { headers })
    if (catRes.ok) {
      const existing = await catRes.json()
      for (const cat of existing) {
        categoryMap[cat.slug] = cat.id
      }
      console.log(`   Found ${existing.length} existing categories\n`)
    }

    // Insert missing categories
    for (const cat of categoriesDict.categories) {
      if (!categoryMap[cat.slug]) {
        const payload = {
          name: cat.name,
          name_i18n: cat.name_i18n,
          slug: cat.slug,
        }
        const res = await fetch(`${REST_URL}/categories`, {
          method: 'POST',
          headers,
          body: JSON.stringify([payload]),
        })
        if (res.ok) {
          // Supabase returns empty body on 201, so fetch the inserted record
          const getRes = await fetch(`${REST_URL}/categories?slug=eq.${cat.slug}`, { headers })
          if (getRes.ok) {
            const [inserted] = await getRes.json()
            categoryMap[cat.slug] = inserted.id
          }
        } else {
          const err = await res.text()
          console.warn(`   ⚠️ Category ${cat.slug} insert failed: ${err}`)
        }
      }
    }
    console.log(`✓ ${Object.keys(categoryMap).length} categories ready\n`)

    // 2. Fetch existing ingredients and build map
    console.log('🥃 Checking ingredients...')
    const ingRes = await fetch(`${REST_URL}/ingredients`, { headers })
    if (ingRes.ok) {
      const existing = await ingRes.json()
      for (const ing of existing) {
        ingredientMap[ing.name.toLowerCase()] = ing.id
      }
      console.log(`   Found ${existing.length} existing ingredients\n`)
    }

    // Insert missing ingredients
    for (const ing of ingredientsDict.ingredients) {
      if (!ingredientMap[ing.name.toLowerCase()]) {
        const payload = {
          name: ing.name,
          name_i18n: ing.name_i18n,
          slug: ing.slug,
          type: ing.type || 'other',
        }
        const res = await fetch(`${REST_URL}/ingredients`, {
          method: 'POST',
          headers,
          body: JSON.stringify([payload]),
        })
        if (res.ok) {
          // Supabase returns empty body on 201, so fetch the inserted record
          const getRes = await fetch(`${REST_URL}/ingredients?name=eq.${encodeURIComponent(ing.name)}`, { headers })
          if (getRes.ok) {
            const [inserted] = await getRes.json()
            ingredientMap[ing.name.toLowerCase()] = inserted.id
          }
        } else {
          const err = await res.text()
          console.warn(`   ⚠️ Ingredient ${ing.name} insert failed: ${err}`)
        }
      }
    }
    console.log(`✓ ${Object.keys(ingredientMap).length} ingredients ready\n`)

    // 3. Seed cocktails (batched, skip if slug exists)
    console.log('🍹 Checking cocktails...')
    const existingRes = await fetch(`${REST_URL}/cocktails?select=id,slug`, { headers })
    const existingSlugs = new Set()
    if (existingRes.ok) {
      const existing = await existingRes.json()
      for (const c of existing) {
        existingSlugs.add(c.slug)
      }
      console.log(`   Found ${existing.length} existing cocktails\n`)
    }

    const toInsert = cocktails.filter(d => !existingSlugs.has(d.slug))
    if (toInsert.length === 0) {
      console.log('✓ All cocktails already seeded\n')
    } else {
      console.log(`🍹 Seeding ${toInsert.length} missing cocktails...\n`)
      const cocktailBatches = []
      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50).map((drink) => ({
          id: drink.id,
          name: drink.name,
          slug: drink.slug,
          category_id: categoryMap[drink.category_slug] || Object.values(categoryMap)[0],
          thumb_url: imageMap[drink.slug] || drink.thumb_url,
          instructions_en: drink.instructions_en || '',
          instructions_es: drink.instructions_es || '',
          instructions_pt: drink.instructions_pt || '',
          description_en: drink.description_en,
          description_pt: drink.description_pt,
          description_es: drink.description_es,
          history_en: drink.history_en,
          history_pt: drink.history_pt,
          history_es: drink.history_es,
          fun_fact_en: drink.fun_fact_en,
          fun_fact_pt: drink.fun_fact_pt,
          fun_fact_es: drink.fun_fact_es,
          meta_title_en: drink.meta_title_en || drink.name,
          meta_title_pt: drink.meta_title_pt || drink.name,
          meta_title_es: drink.meta_title_es || drink.name,
          meta_desc_en: drink.meta_desc_en || '',
          meta_desc_pt: drink.meta_desc_pt || '',
          meta_desc_es: drink.meta_desc_es || '',
          embedding: embeddingsData[drink.slug]?.embedding || null,
        }))

        cocktailBatches.push(batch)
      }

      let cocktailCount = 0
      for (const batch of cocktailBatches) {
        const res = await fetch(`${REST_URL}/cocktails`, {
          method: 'POST',
          headers,
          body: JSON.stringify(batch),
        })
        if (res.ok) {
          cocktailCount += batch.length
          process.stdout.write(`\r  ✓ ${cocktailCount}/${toInsert.length}`)
        } else {
          const err = await res.text()
          console.error(`\n  Error: ${res.status} ${err}`)
          throw new Error(`Cocktail batch failed: ${err}`)
        }
      }
      console.log(`\n✓ ${cocktailCount} cocktails seeded\n`)
    }

    // 4. Seed cocktail_ingredients (batched, skip if already linked)
    console.log('🔗 Checking cocktail_ingredients...')
    const relRes = await fetch(`${REST_URL}/cocktail_ingredients?select=cocktail_id,ingredient_id`, { headers })
    const existingRels = new Set()
    if (relRes.ok) {
      const existing = await relRes.json()
      for (const r of existing) {
        existingRels.add(`${r.cocktail_id}:${r.ingredient_id}`)
      }
      console.log(`   Found ${existing.length} existing relationships\n`)
    }

    const relBatch = []
    for (const drink of cocktails) {
      for (const ing of drink.ingredients) {
        const ingredientId = ingredientMap[ing.name.toLowerCase()]
        if (ingredientId && !existingRels.has(`${drink.id}:${ingredientId}`)) {
          relBatch.push({
            cocktail_id: drink.id,
            ingredient_id: ingredientId,
            measure_text: ing.measure || '',
            amount_ml: ing.amount_ml || null,
          })
        }
      }
    }

    if (relBatch.length === 0) {
      console.log('✓ All relationships already linked\n')
    } else {
      console.log(`🔗 Seeding ${relBatch.length} missing relationships...\n`)
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
          throw new Error(`Relationship batch failed: ${err}`)
        }
      }
      console.log(`\n✓ ${relCount} relationships seeded\n`)
    }

    console.log('✅ Database seeding complete!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

seed()
