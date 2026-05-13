import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    const supabase = await createClient()

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code as string)

    if (exchangeError) {
      return NextResponse.redirect(new URL('/login?error=exchange_failed', request.url))
    }

    const redirectUrl = redirect.startsWith('/') ? redirect : '/'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    return NextResponse.redirect(new URL('/login?error=callback_error', request.url))
  }
}
