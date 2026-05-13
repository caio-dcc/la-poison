import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    console.log(`URL: ${supabaseUrl}`)

    // Try to get tables via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/information_schema.tables`, {
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
    })

    if (response.ok) {
      console.log('✅ Supabase connection successful!')
      const data = await response.json()
      console.log(`Found ${data.length} tables`)
    } else {
      console.error(`❌ Connection failed with status ${response.status}`)
      console.error(await response.text())
    }
  } catch (error) {
    console.error('❌ Connection error:', error)
  }
}

testConnection()
