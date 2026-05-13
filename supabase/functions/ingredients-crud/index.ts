import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

console.log(`Function "ingredients-crud" up and running!`)

serve(async req => {
  try {
    const method = req.method

    if (method === 'GET') {
      // GET /ingredients — list all ingredients with optional filters
      const { searchParams } = new URL(req.url)
      const type = searchParams.get('type')
      const search = searchParams.get('search')

      let query = supabase.from('ingredients').select('*')

      if (type) query = query.eq('type', type)
      if (search) query = query.ilike('name', `%${search}%`)

      const { data, error } = await query

      if (error) throw error

      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }

    if (method === 'POST') {
      // POST /ingredients — create new ingredient
      const body = await req.json()
      const { error, data } = await supabase.from('ingredients').insert([body]).select()

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
