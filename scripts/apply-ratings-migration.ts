import { Client } from 'pg'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function applyMigration() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('Missing DATABASE_URL in environment')
    process.exit(1)
  }

  const client = new Client({ connectionString })
  await client.connect()

  const migrationPath = path.join(__dirname, '../supabase/migrations/007_ratings_and_favorites.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('Applying migration 007_ratings_and_favorites.sql...')
  try {
    await client.query(sql)
    console.log('✓ Migration applied successfully!')
  } catch (err: unknown) {
    const error = err as { message?: string }
    console.error('✗ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

applyMigration().catch(console.error)
