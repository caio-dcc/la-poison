#!/usr/bin/env node
/**
 * fix-image-urls.mjs
 *
 * Two-mode script:
 *   --cocktaildb  (default) Use original CocktailDB URLs — works immediately, no R2 setup needed
 *   --r2          Use R2 URLs — requires R2 public access enabled on bucket
 *
 * Run: node scripts/fix-image-urls.mjs
 *  or: node scripts/fix-image-urls.mjs --r2
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'LaPoison'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const useR2 = process.argv.includes('--r2')

const REST = `${SUPABASE_URL}/rest/v1`
const HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
}

async function main() {
  const cocktailsPath = path.join(__dirname, 'data', 'raw', 'cocktails.json')
  const imageMapPath = path.join(__dirname, 'data', 'raw', 'image-map.json')

  const cocktails = JSON.parse(fs.readFileSync(cocktailsPath, 'utf-8'))
  console.log(`Loaded ${cocktails.length} cocktails from source`)

  // Build URL map
  const urlMap = {}
  if (useR2) {
    if (!R2_ACCOUNT_ID) {
      console.error('R2_ACCOUNT_ID required for --r2 mode')
      process.exit(1)
    }
    // R2 public URL requires bucket public access enabled in Cloudflare Dashboard
    // Go to R2 → LaPoison bucket → Settings → Public Access → Allow Access
    // The public URL will be: https://pub-<accountId>.r2.dev/<path>
    // OR use a custom domain configured in R2 → Custom Domains
    const base = `https://pub-${R2_ACCOUNT_ID}.r2.dev`
    for (const c of cocktails) {
      urlMap[c.slug] = `${base}/lapoison/drinks/thumbs/${c.slug}.webp`
    }
    console.log(`Mode: R2 public  (base: ${base})`)
    console.log('WARNING: This requires R2 bucket public access to be enabled.')
    console.log('If not enabled, images will 401. Go to Cloudflare Dashboard → R2 → LaPoison → Settings → Public Access → Allow Access\n')
  } else {
    for (const c of cocktails) {
      urlMap[c.slug] = c.thumb_url
    }
    console.log('Mode: CocktailDB originals (immediate, no R2 setup needed)\n')
  }

  // Save corrected image-map.json
  fs.writeFileSync(imageMapPath, JSON.stringify(urlMap, null, 2), 'utf-8')
  console.log('Updated scripts/data/raw/image-map.json')

  // Batch-update Supabase
  const slugs = Object.keys(urlMap)
  const BATCH = 100
  let updated = 0

  console.log(`Updating ${slugs.length} cocktails in Supabase...`)

  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH)
    await Promise.all(
      batch.map(slug =>
        fetch(`${REST}/cocktails?slug=eq.${slug}`, {
          method: 'PATCH',
          headers: HEADERS,
          body: JSON.stringify({ thumb_url: urlMap[slug] }),
        }).then(r => {
          if (!r.ok) r.text().then(t => console.error(`  FAIL ${slug}: ${t.slice(0, 100)}`))
        })
      )
    )
    updated += batch.length
    process.stdout.write(`  ${updated}/${slugs.length}\r`)
  }

  console.log(`\nDone. ${updated} cocktails updated.`)

  // Verify 3 samples
  const samples = slugs.slice(0, 3)
  const rows = await fetch(`${REST}/cocktails?slug=in.(${samples.join(',')})&select=slug,thumb_url`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  }).then(r => r.json())

  console.log('\nVerification:')
  for (const r of rows) console.log(`  ${r.slug}: ${r.thumb_url}`)

  if (!useR2) {
    console.log('\nNext step for R2 images:')
    console.log('  1. Cloudflare Dashboard → R2 → LaPoison → Settings → Public Access → Allow Access')
    console.log('  2. Run: node scripts/fix-image-urls.mjs --r2')
  }
}

main().catch(e => { console.error(e); process.exit(1) })
