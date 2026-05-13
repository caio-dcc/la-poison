import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

console.log(`Function "chatbot-rate-limit" up and running!`)

// Hash IP with SHA-256
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

serve(async req => {
  try {
    const body = await req.json()
    const { user_id, ip, is_pro } = body

    // Pro users: unlimited
    if (is_pro) {
      return new Response(JSON.stringify({ allowed: true, remaining: -1 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const limit = user_id ? 10 : 3 // Free user: 10, anon: 3
    const identifier = user_id || (await hashIp(ip))

    // Get today's usage (reset daily at 00:00 UTC)
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('chatbot_usage')
      .select('id', { count: 'exact' })
      .eq(user_id ? 'user_id' : 'ip_hash', identifier)
      .gte('created_at', `${today}T00:00:00Z`)

    if (error) throw error

    const usage = data?.length || 0
    const remaining = Math.max(0, limit - usage)

    if (usage >= limit) {
      return new Response(
        JSON.stringify({
          allowed: false,
          remaining: 0,
          limit,
          reset_at: `${today}T23:59:59Z`,
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    return new Response(JSON.stringify({ allowed: true, remaining, limit }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
