import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { BarWithDetails, InventoryItem } from '@/types/api'

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

    const { data: bar, error: barError } = await supabase
      .from('bars')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (barError || !bar) {
      return NextResponse.json({ error: 'Bar not found' }, { status: 404 })
    }

    const { data: inventory } = await supabase.from('inventory_items').select('*').eq('bar_id', id)

    const result: BarWithDetails = {
      ...bar,
      inventory: (inventory as InventoryItem[]) || [],
    }

    return NextResponse.json(result, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('bars')
      .update({ name })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Bar not found' }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase.from('bars').delete().eq('id', id).eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
