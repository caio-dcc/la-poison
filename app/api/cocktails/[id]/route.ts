import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CocktailWithIngredients } from '@/types/api'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: cocktail, error: cocktailError } = await supabase
      .from('cocktails')
      .select('*')
      .eq('id', id)
      .single()

    if (cocktailError || !cocktail) {
      return NextResponse.json({ error: 'Cocktail not found' }, { status: 404 })
    }

    const { data: ingredients, error: ingredientsError } = await supabase
      .from('cocktail_ingredients')
      .select('ingredient_id, measure_text, amount_ml, ingredients(id, name, type)')
      .eq('cocktail_id', id)

    if (ingredientsError) {
      throw ingredientsError
    }

    const result: CocktailWithIngredients = {
      ...cocktail,
      ingredients: (
        (ingredients as unknown as Array<{
          ingredient_id: string
          measure_text: string
          amount_ml?: number
          ingredients?: { id: string; name: string; type: string }
        }>) || []
      ).map(ing => ({
        ingredient_id: ing.ingredient_id,
        name: ing.ingredients?.name || '',
        type: ing.ingredients?.type || '',
        measure_text: ing.measure_text,
        amount_ml: ing.amount_ml,
      })),
    }

    return NextResponse.json(result, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
