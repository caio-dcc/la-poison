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
  console.error('❌ Missing env vars')
  process.exit(1)
}

const REST_URL = `${SUPABASE_URL}/rest/v1`
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  apikey: SUPABASE_SERVICE_KEY,
}

const cocktails = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/cocktails.json'), 'utf8'))
const ingredientsDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/i18n/ingredients.json'), 'utf8'))
const categoriesDict = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/i18n/categories.json'), 'utf8'))
const imageMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/image-map.json'), 'utf8'))
const embeddingsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/raw/cocktails-embedded.json'), 'utf8'))

console.log('📚 Data loaded\n')

async function deleteAllData() {
  console.log('🗑️  Deleting all existing data...')

  // Delete in order of dependencies
  try {
    let res = await fetch(`${REST_URL}/cocktail_ingredients`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) console.log('  ✓ Cleared cocktail_ingredients')
  } catch (e) {}

  try {
    let res = await fetch(`${REST_URL}/cocktails`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) console.log('  ✓ Cleared cocktails')
  } catch (e) {}

  try {
    let res = await fetch(`${REST_URL}/ingredients`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) console.log('  ✓ Cleared ingredients')
  } catch (e) {}

  try {
    let res = await fetch(`${REST_URL}/categories`, {
      method: 'DELETE',
      headers,
    })
    if (res.ok) console.log('  ✓ Cleared categories')
  } catch (e) {}

  console.log('')
}

async function seedCategories() {
  console.log('📦 Seeding categories...')
  const categoryMap = {}

  const catBatch = categoriesDict.categories.map((cat) => ({
    name: cat.name,
    name_i18n: cat.name_i18n,
    slug: cat.slug,
  }))

  const res = await fetch(`${REST_URL}/categories`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(catBatch),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Categories: ${res.status} ${err}`)
  }

  const inserted = await res.json()
  inserted.forEach((cat) => {
    categoryMap[cat.slug] = cat.id
  })

  console.log(`✓ ${inserted.length} categories\n`)
  return categoryMap
}

async function seedIngredients() {
  console.log('🥃 Seeding ingredients...')
  const ingredientMap = {}

  const ingBatch = ingredientsDict.ingredients.map((ing) => ({
    name: ing.name,
    name_i18n: ing.name_i18n,
    slug: ing.slug,
    type: ing.type || 'other',
  }))

  const res = await fetch(`${REST_URL}/ingredients`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(ingBatch),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ingredients: ${res.status} ${err}`)
  }

  const inserted = await res.json()
  inserted.forEach((ing) => {
    ingredientMap[ing.name.toLowerCase()] = ing.id
  })

  console.log(`✓ ${inserted.length} ingredients\n`)
  return ingredientMap
}

async function seedCocktails(categoryMap) {
  console.log('🍹 Seeding cocktails...')

  const batches = []
  for (let i = 0; i < cocktails.length; i += 50) {
    const batch = cocktails.slice(i, i + 50).map((drink) => ({
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
    batches.push(batch)
  }

  let count = 0
  for (const batch of batches) {
    const res = await fetch(`${REST_URL}/cocktails`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(batch),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Cocktails batch: ${res.status} ${err}`)
    }

    count += batch.length
    process.stdout.write(`\r  ✓ ${count}/${cocktails.length}`)
  }

  console.log(`\n✓ ${count} cocktails\n`)
}

async function seedRelationships(ingredientMap) {
  console.log('🔗 Seeding cocktail_ingredients...')

  const rels = []
  for (const drink of cocktails) {
    for (const ing of drink.ingredients) {
      const ingredientId = ingredientMap[ing.name.toLowerCase()]
      if (ingredientId) {
        rels.push({
          cocktail_id: drink.id,
          ingredient_id: ingredientId,
          measure_text: ing.measure || '',
          amount_ml: ing.amount_ml || null,
        })
      }
    }
  }

  let count = 0
  for (let i = 0; i < rels.length; i += 100) {
    const batch = rels.slice(i, i + 100)
    const res = await fetch(`${REST_URL}/cocktail_ingredients`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify(batch),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Relationships batch: ${res.status} ${err}`)
    }

    count += batch.length
    process.stdout.write(`\r  ✓ ${count}/${rels.length}`)
  }

  console.log(`\n✓ ${count} relationships\n`)
}

async function main() {
  try {
    await deleteAllData()
    const categoryMap = await seedCategories()
    const ingredientMap = await seedIngredients()
    await seedCocktails(categoryMap)
    await seedRelationships(ingredientMap)

    console.log('✅ Database seeding complete!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
