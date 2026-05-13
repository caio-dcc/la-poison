import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Cocktail } from '@/types/api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const alcoholic = searchParams.get('alcoholic')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    let query = supabase
      .from('cocktails')
      .select(
        'id, name, slug, category, alcoholic, instructions, thumb, description_pt, description_en, description_es, abv_estimate, difficulty, prep_time_minutes, created_at, updated_at'
      )

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (alcoholic !== null) {
      const alcoholicBool = alcoholic === 'true'
      query = query.eq('alcoholic', alcoholicBool)
    }

    const { data, error } = await query
      .range(offset, offset + limit - 1)
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json(data as Cocktail[], { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
