import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

console.log(`Function "bars-crud" up and running!`)

serve(async req => {
  try {
    const method = req.method

    if (method === 'GET') {
      // GET /bars?user_id={user_id} — list user's bars
      const { searchParams } = new URL(req.url)
      const user_id = searchParams.get('user_id')

      if (!user_id) throw new Error('user_id query param required')

      const { data, error } = await supabase
        .from('bars')
        .select('*')
        .eq('created_by_user_id', user_id)

      if (error) throw error

      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }

    if (method === 'POST') {
      // POST /bars — create new bar
      const body = await req.json()
      const { error, data } = await supabase.from('bars').insert([body]).select()

      if (error) throw error

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    if (method === 'PUT') {
      // PUT /bars/:id — update bar
      const { searchParams } = new URL(req.url)
      const id = searchParams.get('id')
      const body = await req.json()

      const { error, data } = await supabase.from('bars').update(body).eq('id', id).select()

      if (error) throw error

      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }

    if (method === 'DELETE') {
      // DELETE /bars/:id — delete bar
      const { searchParams } = new URL(req.url)
      const id = searchParams.get('id')

      const { error } = await supabase.from('bars').delete().eq('id', id)

      if (error) throw error

      return new Response(JSON.stringify({ deleted: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
