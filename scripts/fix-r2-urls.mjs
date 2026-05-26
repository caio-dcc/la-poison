/**
 * Fixes thumb_url in Supabase cocktails table:
 * Replaces private R2 storage URL with the public r2.dev URL.
 *
 * Also updates scripts/data/raw/image-map.json to use .jpg URLs (not .webp)
 * since we uploaded as JPEG.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const idx = t.indexOf('=')
    if (idx === -1) continue
    const k = t.slice(0, idx)
    const v = t.slice(idx + 1).replace(/^"(.*)"$/, '$1')
    if (!process.env[k]) process.env[k] = v
  }
}
loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID

// The upload script used the raw S3 endpoint without the bucket-as-path prefix
// The actual stored URL is: https://lapoison.<accountId>.r2.cloudflarestorage.com/drinks/thumbs/<slug>.jpg
// The correct public URL should be: https://pub-<accountId>.r2.dev/drinks/thumbs/<slug>.jpg
const OLD_PREFIX = `https://lapoison.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
const NEW_PREFIX = `https://pub-${R2_ACCOUNT_ID}.r2.dev`

async function main() {
  console.log('OLD prefix:', OLD_PREFIX)
  console.log('NEW prefix:', NEW_PREFIX)

  // Fetch all cocktails with private URL
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cocktails?select=id,slug,thumb_url&limit=500`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  )
  const cocktails = await res.json()
  const toFix = cocktails.filter(c =>
    c.thumb_url?.includes('r2.cloudflarestorage.com') ||
    c.thumb_url?.includes('thecocktaildb.com')
  )
  console.log(`Found ${toFix.length} rows with private R2 URL out of ${cocktails.length}`)

  let fixed = 0
  for (const c of toFix) {
    const newUrl = c.thumb_url.replace(OLD_PREFIX, NEW_PREFIX)
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/cocktails?slug=eq.${encodeURIComponent(c.slug)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ thumb_url: newUrl }),
      }
    )
    if (!r.ok) {
      console.error(`FAIL ${c.slug}: ${r.status}`)
    } else {
      fixed++
      process.stdout.write(`\r  Fixed: ${fixed}/${toFix.length}`)
    }
  }

  console.log(`\nDone. Fixed ${fixed} rows.`)

  // Update image-map.json to use public .jpg URLs
  const mapPath = path.join(__dirname, 'data', 'raw', 'image-map.json')
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
  const updatedMap = {}
  for (const [slug, url] of Object.entries(map)) {
    const newUrl = typeof url === 'string'
      ? url.replace(/^https:\/\/pub-[^/]+\.r2\.dev\/lapoison\/drinks\/thumbs\/(.+)\.webp$/, `${NEW_PREFIX}/drinks/thumbs/$1.jpg`)
        .replace(OLD_PREFIX, NEW_PREFIX)
      : url
    updatedMap[slug] = newUrl
  }
  fs.writeFileSync(mapPath, JSON.stringify(updatedMap, null, 2))
  console.log('Updated image-map.json')
}

main().catch(e => { console.error(e); process.exit(1) })
