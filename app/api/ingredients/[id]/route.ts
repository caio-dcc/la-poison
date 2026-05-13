import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { IngredientWithCocktails } from '@/types/api'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: ingredient, error: ingredientError } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single()

    if (ingredientError || !ingredient) {
      return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
    }

    const { data: cocktails, error: cocktailsError } = await supabase
      .from('cocktail_ingredients')
      .select('cocktail_id, measure_text, amount_ml')
      .eq('ingredient_id', id)

    if (cocktailsError) {
      throw cocktailsError
    }

    interface IngredientCocktailRow {
      cocktail_id: string
      measure_text: string
      amount_ml?: number
    }

    const result: IngredientWithCocktails = {
      ...ingredient,
      cocktails: ((cocktails || []) as IngredientCocktailRow[]).map(c => ({
        cocktail_id: c.cocktail_id,
        measure: c.measure_text,
        measure_ml: c.amount_ml,
      })),
    }

    return NextResponse.json(result, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
