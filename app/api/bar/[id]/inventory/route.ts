import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { InventoryItem } from '@/types/api'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: bar } = await supabase
      .from('bars')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!bar) {
      return NextResponse.json({ error: 'Bar not found' }, { status: 404 })
    }

    const { data, error } = await supabase.from('inventory_items').select('*').eq('bar_id', id)

    if (error) {
      throw error
    }

    return NextResponse.json(data as InventoryItem[], { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: bar } = await supabase
      .from('bars')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!bar) {
      return NextResponse.json({ error: 'Bar not found' }, { status: 404 })
    }

    const body = await request.json()
    const { ingredientId, customName, category, quantity, unit } = body

    if (!category || quantity === undefined || !unit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!ingredientId && !customName) {
      return NextResponse.json(
        { error: 'Either ingredientId or customName required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('inventory_items')
      .insert({
        bar_id: id,
        ingredient_id: ingredientId,
        custom_name: customName,
        category,
        quantity,
        unit,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data as InventoryItem, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
