import { createClient } from '@/utils/supabase/middleware'
import { type NextRequest, NextResponse } from 'next/server'

const SUPPORTED_LOCALES = ['pt', 'en', 'es']
const DEFAULT_LOCALE = 'pt'

// Routes that require authentication (relative to locale, e.g., /[locale]/chatbot)
const PROTECTED_PREFIXES = ['/meus-bares', '/inventario', '/conta', '/admin']

function getLocaleFromPathname(pathname: string): string {
  const parts = pathname.split('/')
  const locale = parts[1]
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes are locale-agnostic; never rewrite them
  if (pathname.startsWith('/api/')) {
    const { response } = await createClient(request)
    return response
  }

  const locale = getLocaleFromPathname(pathname)

  // Redirect root to default locale
  if (pathname === '/') {
    const acceptLanguage = request.headers.get('accept-language') || ''
    let preferredLocale = DEFAULT_LOCALE

    for (const supportedLocale of SUPPORTED_LOCALES) {
      if (acceptLanguage.includes(supportedLocale)) {
        preferredLocale = supportedLocale
        break
      }
    }

    return NextResponse.redirect(new URL(`/${preferredLocale}`, request.url))
  }

  // Add locale prefix if missing
  if (!SUPPORTED_LOCALES.includes(pathname.split('/')[1])) {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}${pathname}`, request.url))
  }

  // Refresh Supabase session for every matched request
  const { response, supabase } = await createClient(request)

  // Check protected routes (with locale prefix)
  const isProtectedRoute = PROTECTED_PREFIXES.some(prefix =>
    pathname.startsWith(`/${locale}${prefix}`)
  )

  if (isProtectedRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL(`/${locale}/login`, request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
