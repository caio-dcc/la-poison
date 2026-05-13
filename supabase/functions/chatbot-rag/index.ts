import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

console.log(`Function "chatbot-rag" up and running!`)

serve(async req => {
  try {
    const body = await req.json()
    const { query_embedding, top_k = 5 } = body

    if (!query_embedding) {
      throw new Error('query_embedding is required')
    }

    // Vector similarity search: find top-K cocktails most similar to query
    // This will be computed server-side by PostgreSQL pgvector
    const { data, error } = await supabase.rpc('match_cocktails', {
      query_embedding,
      match_count: top_k,
    })

    if (error) throw error

    // Fetch full details of matched cocktails
    interface CocktailMatch {
      id: string
    }
    const cocktail_ids = ((data as CocktailMatch[]) || []).map(d => d.id)

    if (cocktail_ids.length === 0) {
      return new Response(JSON.stringify({ context: [], message: 'No cocktails found' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: cocktails, error: cocktailError } = await supabase
      .from('cocktails')
      .select('id, name, instructions, description_pt, history_pt')
      .in('id', cocktail_ids)

    if (cocktailError) throw cocktailError

    // Fetch ingredients for each cocktail
    const cocktailsWithIngredients = await Promise.all(
      (cocktails || []).map(async cocktail => {
        const { data: ingredients, error: ingredError } = await supabase
          .from('cocktail_ingredients')
          .select('ingredient_id, measure, ingredients(name, type)')
          .eq('cocktail_id', cocktail.id)

        if (ingredError) throw ingredError

        return {
          ...cocktail,
          ingredients: ingredients || [],
        }
      })
    )

    return new Response(JSON.stringify({ context: cocktailsWithIngredients }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
