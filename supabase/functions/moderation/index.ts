import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

console.log(`Function "moderation" up and running!`)

// Simple forbidden words list (PT, EN, ES)
const FORBIDDEN_WORDS = [
  'spam',
  'viagra',
  'casino',
  'crypto',
  'xxx',
  // PT
  'porno',
  'drogas',
  'arma',
  // ES
  'droga',
  'sexo',
]

function isFlagged(text: string): boolean {
  const lower = text.toLowerCase()
  return FORBIDDEN_WORDS.some(word => lower.includes(word))
}

serve(async req => {
  try {
    const body = await req.json()
    const { user_drink_id, body: content } = body

    const flagged = isFlagged(content)

    // Auto-approve if clean, else mark for manual review
    const { error } = await supabase
      .from('user_drinks')
      .update({ approved: !flagged })
      .eq('id', user_drink_id)

    if (error) throw error

    return new Response(
      JSON.stringify({
        flagged,
        approved: !flagged,
        message: flagged ? 'Content flagged for manual review' : 'Content approved',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
