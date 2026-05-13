import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import https from 'https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read cocktails.json
const cocktailsPath = path.join(__dirname, 'data', 'raw', 'cocktails.json')
const cocktails = JSON.parse(fs.readFileSync(cocktailsPath, 'utf-8'))

// Cloudflare R2 config (from env)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ''
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || ''
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || ''
const R2_BUCKET = process.env.R2_BUCKET || 'lapoison'

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

// Local cache dir
const CACHE_DIR = path.join(__dirname, 'data', 'images')
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  console.log(`✓ Created cache directory: ${CACHE_DIR}`)
}

// Map to store drink slug → R2 URL
const imageMap = {}

async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(CACHE_DIR, filename)

    // Skip if already cached
    if (fs.existsSync(filePath)) {
      resolve(filePath)
      return
    }

    const file = fs.createWriteStream(filePath)
    https
      .get(url, response => {
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve(filePath)
        })
      })
      .on('error', err => {
        fs.unlink(filePath, () => {}) // Delete partial file
        reject(err)
      })
  })
}

async function uploadToR2(filePath, remoteKey) {
  // Mock implementation — would use AWS SDK in production
  // For now, just log that we would upload
  console.log(`  [MOCK] Would upload ${path.basename(filePath)} → R2/${remoteKey}`)
  return `${R2_ENDPOINT}/${R2_BUCKET}/${remoteKey}`
}

async function processImages() {
  console.log('📸 Starting image processing and R2 upload...\n')

  let processed = 0
  let failed = 0

  for (const drink of cocktails) {
    if (!drink.thumb_url) {
      console.log(`⚠ ${drink.slug}: No thumb_url`)
      continue
    }

    try {
      // Download thumbnail
      const filename = `${drink.id}.jpg`
      const localPath = await downloadImage(drink.thumb_url, filename)
      console.log(`✓ Downloaded: ${drink.slug}`)

      // Upload to R2 (mocked for now)
      const remoteKey = `drinks/thumbs/${drink.slug}.webp`
      const r2Url = await uploadToR2(localPath, remoteKey)

      imageMap[drink.slug] = r2Url
      processed++
    } catch (error) {
      console.error(`✗ ${drink.slug}: ${error.message}`)
      failed++
    }

    // Rate limit: 50ms between downloads
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // Save image map
  const mapPath = path.join(__dirname, 'data', 'raw', 'image-map.json')
  fs.writeFileSync(mapPath, JSON.stringify(imageMap, null, 2))

  console.log(`\n✓ Image processing complete!`)
  console.log(`  Processed: ${processed}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Image map: ${mapPath}`)
  console.log(`  Local cache: ${CACHE_DIR}`)

  return imageMap
}

// Run
processImages().catch(console.error)
