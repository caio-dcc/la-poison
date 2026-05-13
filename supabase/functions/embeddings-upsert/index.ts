import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmbeddedDrink {
  id: string
  name: string
  embedding: number[]
}

serve(async req => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { drinks } = (await req.json()) as { drinks: EmbeddedDrink[] }

    if (!drinks || !Array.isArray(drinks) || drinks.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request: drinks array required' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    console.log(`Upserting ${drinks.length} embeddings...`)

    // Upsert embeddings (update if exists, insert if not)
    const { error } = await supabaseClient.from('cocktails').upsert(
      drinks.map(drink => ({
        id: drink.id,
        embedding: drink.embedding,
      })),
      { onConflict: 'id' }
    )

    if (error) {
      throw new Error(`Upsert failed: ${error.message}`)
    }

    console.log(`✓ Successfully upserted ${drinks.length} embeddings`)

    return new Response(
      JSON.stringify({
        success: true,
        upserted: drinks.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
