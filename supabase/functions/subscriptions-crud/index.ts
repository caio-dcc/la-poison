import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

console.log(`Function "subscriptions-crud" up and running!`)

serve(async req => {
  try {
    const method = req.method

    if (method === 'GET') {
      // GET /subscriptions/:user_id — check if user has active subscription
      const { searchParams } = new URL(req.url)
      const user_id = searchParams.get('user_id')

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user_id)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      return new Response(JSON.stringify({ subscription: data || null }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (method === 'POST') {
      // POST /subscriptions — create subscription from Stripe webhook
      const body = await req.json()
      const { user_id, stripe_subscription_id, plan_type, current_period_end } = body

      const { error, data } = await supabase
        .from('subscriptions')
        .insert([
          {
            user_id,
            stripe_subscription_id,
            plan_type,
            current_period_end,
            status: 'active',
          },
        ])
        .select()

      if (error) throw error

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    if (method === 'PUT') {
      // PUT /subscriptions/:id — update subscription status
      const { searchParams } = new URL(req.url)
      const id = searchParams.get('id')
      const body = await req.json()

      const { error, data } = await supabase
        .from('subscriptions')
        .update(body)
        .eq('id', id)
        .select()

      if (error) throw error

      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
