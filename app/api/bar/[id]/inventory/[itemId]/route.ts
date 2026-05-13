import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { InventoryItem } from '@/types/api'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
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
    const { quantity, unit } = body

    if (quantity === undefined && !unit) {
      return NextResponse.json({ error: 'Missing quantity or unit' }, { status: 400 })
    }

    interface UpdateData {
      quantity?: number
      unit?: string
    }
    const updateData: UpdateData = {}
    if (quantity !== undefined) updateData.quantity = quantity
    if (unit) updateData.unit = unit

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('bar_id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })
    }

    return NextResponse.json(data as InventoryItem, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params
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

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId)
      .eq('bar_id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
