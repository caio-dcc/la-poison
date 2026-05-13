import { createClient } from '@/utils/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

// Routes that require authentication (real pathnames, not route groups)
const PROTECTED_PREFIXES = ['/chatbot', '/meus-bares', '/inventario', '/conta']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Refresh Supabase session for every matched request
  const { response, supabase } = await createClient(request)

  const isProtectedRoute = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))

  if (isProtectedRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
