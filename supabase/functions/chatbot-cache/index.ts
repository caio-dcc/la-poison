import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

console.log(`Function "chatbot-cache" up and running!`)

// Simple hash for query + ingredients combo
function hashQuery(query: string, ingredients: string[]): string {
  const combined = `${query}|${ingredients.sort().join(',')}`.toLowerCase()
  return btoa(combined) // Base64 encode for simplicity
}

serve(async req => {
  try {
    const method = req.method

    if (method === 'GET') {
      // GET /chatbot-cache?hash={hash} — retrieve cached response
      const { searchParams } = new URL(req.url)
      const hash = searchParams.get('hash')

      if (!hash) throw new Error('hash query param required')

      const { data, error } = await supabase
        .from('chatbot_cache')
        .select('response, created_at')
        .eq('query_hash', hash)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      if (data) {
        return new Response(JSON.stringify({ cached: true, response: data.response }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ cached: false }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'POST') {
      // POST /chatbot-cache — save response to cache
      const body = await req.json()
      const { query, ingredients, response } = body

      const hash = hashQuery(query, ingredients)

      const { error } = await supabase.from('chatbot_cache').insert([
        {
          query_hash: hash,
          query,
          response,
        },
      ])

      if (error) throw error

      return new Response(JSON.stringify({ cached: true, hash }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
