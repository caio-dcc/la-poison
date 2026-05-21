import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) ?? []

  if (ids.length === 0) {
    return NextResponse.json([], { status: 200 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get all cocktail_ingredients rows for the selected ingredient ids
  const { data: rows, error } = await supabase
    .from('cocktail_ingredients')
    .select('cocktail_id, ingredient_id')
    .in('ingredient_id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by cocktail: count how many selected ingredients each cocktail has
  const cocktailMatchCount = new Map<string, number>()
  for (const row of rows ?? []) {
    cocktailMatchCount.set(row.cocktail_id, (cocktailMatchCount.get(row.cocktail_id) ?? 0) + 1)
  }

  if (cocktailMatchCount.size === 0) {
    return NextResponse.json([], { status: 200 })
  }

  // Fetch cocktail details + total ingredient count for each matched cocktail
  const cocktailIds = Array.from(cocktailMatchCount.keys())
  const { data: cocktails, error: cocktailErr } = await supabase
    .from('cocktails')
    .select('id, name, slug, thumb_url')
    .in('id', cocktailIds)

  if (cocktailErr) {
    return NextResponse.json({ error: cocktailErr.message }, { status: 500 })
  }

  // Get total ingredient count per cocktail
  const { data: totalRows, error: totalErr } = await supabase
    .from('cocktail_ingredients')
    .select('cocktail_id')
    .in('cocktail_id', cocktailIds)

  if (totalErr) {
    return NextResponse.json({ error: totalErr.message }, { status: 500 })
  }

  const totalCountMap = new Map<string, number>()
  for (const row of totalRows ?? []) {
    totalCountMap.set(row.cocktail_id, (totalCountMap.get(row.cocktail_id) ?? 0) + 1)
  }

  const results = (cocktails ?? [])
    .map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      thumb_url: c.thumb_url,
      matchCount: cocktailMatchCount.get(c.id) ?? 0,
      totalIngredients: totalCountMap.get(c.id) ?? 0,
    }))
    // Sort: exact matches first, then by match count desc
    .sort((a, b) => {
      const aExact = a.matchCount === a.totalIngredients ? 1 : 0
      const bExact = b.matchCount === b.totalIngredients ? 1 : 0
      if (bExact !== aExact) return bExact - aExact
      return b.matchCount - a.matchCount
    })

  return NextResponse.json(results, { status: 200 })
}
