const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    console.log(`URL: ${supabaseUrl}`)

    const headers = {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/information_schema.tables`, {
      headers,
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
    console.error('❌ Connection error:', error.message)
  }
}

testConnection()
