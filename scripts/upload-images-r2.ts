/**
 * SCRIPT: upload-images-r2.ts
 *
 * Fix malformed R2 URLs in image-map.json and regenerate with correct account ID
 * This script:
 * 1. Reads the current (malformed) image-map.json
 * 2. Extracts the drink slugs from the keys
 * 3. Generates correct R2 URLs using R2_ACCOUNT_ID from env
 * 4. Saves the corrected image-map.json
 * 5. Updates the cocktails table in Supabase with the new thumb_url values
 *
 * Prerequisites:
 * - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env
 * - R2_BUCKET_NAME in .env (default: "LaPoison")
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 * - Actual image files exist in R2 bucket at /lapoison/drinks/thumbs/{slug}.webp
 *
 * Run: npm run upload-images-r2
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface OldImageMap {
  [slug: string]: string
}

interface NewImageMap {
  [slug: string]: string
}

async function regenerateImageMap() {
  console.log('🖼️  Regenerating R2 Image URLs\n')

  // Load environment
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
  const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'LaPoison'
  const SUPABASE_URL = process.env.SUPABASE_URL || ''
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

  if (!R2_ACCOUNT_ID) {
    console.error('❌ R2_ACCOUNT_ID is required in .env')
    process.exit(1)
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY required in .env')
    process.exit(1)
  }

  try {
    // Load old (malformed) image map
    const imageMapPath = path.join(__dirname, 'data', 'raw', 'image-map.json')

    if (!fs.existsSync(imageMapPath)) {
      console.error('❌ image-map.json not found at', imageMapPath)
      process.exit(1)
    }

    const oldImageMap: OldImageMap = JSON.parse(fs.readFileSync(imageMapPath, 'utf-8'))
    console.log(`✓ Loaded ${Object.keys(oldImageMap).length} drink slugs from image-map.json\n`)

    // Generate correct R2 URLs
    const newImageMap: NewImageMap = {}
    const baseUrl = `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    const imagePath = '/lapoison/drinks/thumbs'

    for (const [slug] of Object.entries(oldImageMap)) {
      newImageMap[slug] = `${baseUrl}${imagePath}/${slug}.webp`
    }

    console.log(`✅ Generated ${Object.keys(newImageMap).length} corrected URLs`)
    console.log(`📍 Base URL: ${baseUrl}\n`)

    // Save corrected image-map.json
    fs.writeFileSync(imageMapPath, JSON.stringify(newImageMap, null, 2), 'utf-8')
    console.log(`✓ Updated image-map.json\n`)

    // Update Supabase cocktails table with new URLs
    console.log('🔄 Updating Supabase cocktails table...')

    const updates = Object.entries(newImageMap).map(([slug, thumb_url]) => ({
      slug,
      thumb_url,
    }))

    // Batch update (Supabase allows 1000 items per request)
    const BATCH_SIZE = 100
    let updated = 0

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, Math.min(i + BATCH_SIZE, updates.length))

      try {
        // Update using RPC or individual updates
        // For simplicity, we'll update each drink individually
        for (const { slug, thumb_url } of batch) {
          const response = await fetch(`${SUPABASE_URL}/rest/v1/cocktails?slug=eq.${slug}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              apikey: SUPABASE_SERVICE_KEY,
            },
            body: JSON.stringify({ thumb_url }),
          })

          if (!response.ok) {
            const error = await response.text()
            console.error(`❌ Failed to update ${slug}:`, error)
          }
        }

        updated += batch.length
        const progress = ((updated / updates.length) * 100).toFixed(1)
        console.log(`  ${updated}/${updates.length} (${progress}%)...`)
      } catch (error) {
        console.error(`❌ Batch update failed:`, error)
        process.exit(1)
      }
    }

    console.log(`\n✅ Supabase update complete!\n`)

    // Verify a few updates
    console.log('🔍 Verifying sample URLs...')
    const sampleSlugs = Object.keys(newImageMap).slice(0, 3)

    for (const slug of sampleSlugs) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/cocktails?slug=eq.${slug}&select=slug,thumb_url`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            apikey: SUPABASE_SERVICE_KEY,
          },
        }
      )

      if (response.ok) {
        const data = (await response.json()) as Array<{ slug: string; thumb_url: string }>
        if (data.length > 0) {
          const { thumb_url } = data[0]
          console.log(`   ${slug}: ${thumb_url}`)
        }
      }
    }

    console.log(`\n✨ Next steps:`)
    console.log(`   1. Verify R2 bucket has images at: ${baseUrl}${imagePath}`)
    console.log(`   2. Clear browser cache (images may be cached with old URLs)`)
    console.log(`   3. Test: npm run dev && visit http://localhost:3000/pt/drinks/caipirinha`)
    console.log(`   4. Confirm photos are now visible\n`)
  } catch (error) {
    console.error('❌ Regeneration failed:', error)
    process.exit(1)
  }
}

regenerateImageMap()
