import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchResult {
  id: string
  name: string
  similarity: number
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

    const { embedding, limit = 5 } = (await req.json()) as {
      embedding: number[]
      limit?: number
    }

    if (!embedding || !Array.isArray(embedding) || embedding.length !== 384) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request: embedding array of 384 dimensions required',
        }),
        { status: 400, headers: corsHeaders }
      )
    }

    if (limit < 1 || limit > 20) {
      return new Response(JSON.stringify({ error: 'limit must be between 1 and 20' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Call PostgreSQL function for similarity search
    const { data, error } = await supabaseClient.rpc('similarity_search', {
      query_embedding: embedding,
      match_count: limit,
      similarity_threshold: 0.0, // return all results, caller filters by threshold
    })

    if (error) {
      throw new Error(`Search failed: ${error.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: (data as SearchResult[]) || [],
        count: (data as SearchResult[])?.length || 0,
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
