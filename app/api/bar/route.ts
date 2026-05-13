import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { Bar } from '@/types/api'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('bars')
      .select('id, user_id, name, created_at, updated_at')
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json(data as Bar[], { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
      .insert({
        user_id: user.id,
        name,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data as Bar, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
