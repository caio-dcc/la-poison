import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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
    const { sharedWithUserId } = body

    if (!sharedWithUserId) {
      return NextResponse.json({ error: 'Missing sharedWithUserId' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('bar_shares')
      .insert({
        bar_id: id,
        user_id: user.id,
        shared_with_user_id: sharedWithUserId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to share bar' }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
