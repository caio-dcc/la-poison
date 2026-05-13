import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { User } from '@/types/api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user: User = {
      id: data.user.id,
      username: data.user.user_metadata?.username || '',
      email: data.user.email || '',
      created_at: data.user.created_at || new Date().toISOString(),
      updated_at: data.user.updated_at || new Date().toISOString(),
    }

    return NextResponse.json(user, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
