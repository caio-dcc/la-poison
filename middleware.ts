import { createClient } from '@/utils/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected routes that require authentication
  const protectedRoutes = ['/(app)/']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Refresh session for all routes via Supabase middleware
  const supabaseResponse = createClient(request)

  if (isProtectedRoute) {
    // Supabase auth session is automatically refreshed via middleware
    // Protected route access control can be added here if needed
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
