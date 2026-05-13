import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

console.log(`Function "cocktails-crud" up and running!`)

serve(async req => {
  try {
    const method = req.method

    if (method === 'GET') {
      // GET /cocktails — list all cocktails with optional filters
      const { searchParams } = new URL(req.url)
      const category = searchParams.get('category')
      const alcoholic = searchParams.get('alcoholic')
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = parseInt(searchParams.get('offset') || '0')

      let query = supabase.from('cocktails').select('*', { count: 'exact' })

      if (category) query = query.eq('category', category)
      if (alcoholic !== null) query = query.eq('alcoholic', alcoholic === 'true')

      const { data, count, error } = await query.range(offset, offset + limit - 1)

      if (error) throw error

      return new Response(JSON.stringify({ data, total: count }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'POST') {
      // POST /cocktails — create new cocktail
      const body = await req.json()
      const { error, data } = await supabase.from('cocktails').insert([body]).select()

      if (error) throw error

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
