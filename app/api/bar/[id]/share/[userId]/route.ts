import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params
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
      .from('bar_shares')
      .delete()
      .eq('bar_id', id)
      .eq('user_id', user.id)
      .eq('shared_with_user_id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
