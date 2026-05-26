/**
 * Script real de upload para Cloudflare R2.
 * Usa @aws-sdk/client-s3 (S3-compatible API do R2).
 * Baixa imagens do CocktailDB, converte para JPEG otimizado e sobe para R2.
 * Após upload, atualiza thumb_url no Supabase via service key.
 *
 * Uso: node scripts/upload-r2-real.mjs
 * Env necessárias: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *                  R2_BUCKET_NAME, NEXT_PUBLIC_R2_PUBLIC_URL,
 *                  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── load .env manually (no dotenv dep needed) ──────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    const val = trimmed.slice(idx + 1).replace(/^"(.*)"$/, '$1')
    if (!process.env[key]) process.env[key] = val
  }
}
loadEnv()

// ── config ─────────────────────────────────────────────────────────────────
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
// R2 bucket names must be lowercase — convert if env has mixed case
const R2_BUCKET = (process.env.R2_BUCKET_NAME ?? '').toLowerCase()
const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '').replace(/\/$/, '')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const REQUIRED = [
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME', 'NEXT_PUBLIC_R2_PUBLIC_URL',
  'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_KEY',
]
for (const k of REQUIRED) {
  if (!process.env[k]) { console.error(`Missing env var: ${k}`); process.exit(1) }
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const CACHE_DIR = path.join(__dirname, 'data', 'images')
const COCKTAILS_PATH = path.join(__dirname, 'data', 'raw', 'cocktails.json')
const CONCURRENCY = 8

// ── helpers ────────────────────────────────────────────────────────────────
function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(downloadToBuffer(res.headers.location))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

async function uploadBuffer(key, buffer, contentType = 'image/jpeg') {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
}

async function patchSupabaseThumb(slug, newUrl) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cocktails?slug=eq.${encodeURIComponent(slug)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ thumb_url: newUrl }),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase PATCH failed for ${slug}: ${res.status} ${text}`)
  }
}

function chunked(arr, size) {
  const result = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const cocktails = JSON.parse(fs.readFileSync(COCKTAILS_PATH, 'utf8'))
  console.log(`Processing ${cocktails.length} cocktails...`)

  let uploaded = 0, skipped = 0, failed = 0, dbUpdated = 0

  for (const batch of chunked(cocktails, CONCURRENCY)) {
    await Promise.all(batch.map(async drink => {
      const { slug, thumb_url: originalUrl } = drink
      if (!originalUrl) { skipped++; return }

      const r2Key = `drinks/thumbs/${slug}.jpg`
      const r2PublicUrl = `${R2_PUBLIC_URL}/${r2Key}`

      try {
        // Check if already in R2
        if (await existsInR2(r2Key)) {
          skipped++
          // Still update DB if it still points to CocktailDB
          if (originalUrl.includes('thecocktaildb.com')) {
            await patchSupabaseThumb(slug, r2PublicUrl)
            dbUpdated++
          }
          return
        }

        // Try local cache first, else download
        let buffer
        const cachedPath = path.join(CACHE_DIR, `${drink.id}.jpg`)
        if (fs.existsSync(cachedPath)) {
          buffer = fs.readFileSync(cachedPath)
        } else {
          buffer = await downloadToBuffer(originalUrl)
        }

        await uploadBuffer(r2Key, buffer, 'image/jpeg')
        await patchSupabaseThumb(slug, r2PublicUrl)
        uploaded++
        dbUpdated++
        process.stdout.write(`\r  Uploaded: ${uploaded} | Skipped: ${skipped} | Failed: ${failed}`)
      } catch (err) {
        console.error(`\n  FAIL ${slug}: ${err.message}`)
        failed++
      }
    }))
  }

  console.log(`\n\nDone.`)
  console.log(`  Uploaded to R2: ${uploaded}`)
  console.log(`  Already in R2 (skipped): ${skipped}`)
  console.log(`  DB rows updated: ${dbUpdated}`)
  console.log(`  Failed: ${failed}`)
}

main().catch(err => { console.error(err); process.exit(1) })
