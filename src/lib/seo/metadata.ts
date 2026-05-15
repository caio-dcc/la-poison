import type { Metadata, ResolvingMetadata } from 'next'

function replaceLocaleInPathname(pathname: string, locale: string): string {
  const parts = pathname.split('/')
  if (['pt', 'en', 'es'].includes(parts[1])) {
    parts[1] = locale
    return parts.join('/')
  }
  return `/${locale}${pathname}`
}

export interface SEOMetadataParams {
  title: string
  description: string
  pathname: string
  image?: {
    url: string
    alt: string
    width?: number
    height?: number
  }
  locale?: 'pt-BR' | 'en-US' | 'es-ES'
  type?: 'article' | 'website' | 'product'
  author?: string
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
}

interface OpenGraphParams {
  title: string
  description: string
  url: string
  image?: {
    url: string
    alt: string
    width?: number
    height?: number
  }
  locale?: 'pt_BR' | 'en_US' | 'es_ES'
  type?: 'article' | 'website' | 'product'
  siteName?: string
}

interface TwitterCardParams {
  title: string
  description: string
  image?: {
    url: string
    alt: string
  }
  creator?: string
  site?: string
}

/**
 * Generate Next.js Metadata object with SEO best practices
 */
export function generateSEOMetadata(
  params: SEOMetadataParams,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
): Metadata {
  const {
    title,
    description,
    pathname,
    image,
    locale = 'pt-BR',
    type = 'website',
    author,
    publishedTime,
    modifiedTime,
    tags,
  } = params

  const canonicalUrl = new URL(pathname, baseUrl).toString()

  const baseMetadata: Metadata = {
    title,
    description,
    keywords: tags?.join(', '),
    authors: author ? [{ name: author }] : undefined,
    openGraph: generateOpenGraph({
      title,
      description,
      url: canonicalUrl,
      image,
      locale: locale === 'pt-BR' ? 'pt_BR' : locale === 'es-ES' ? 'es_ES' : 'en_US',
      type,
      siteName: 'LaPoison',
    }),
    twitter: generateTwitterCard({
      title,
      description,
      image,
      site: '@lapoison_',
    }),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'pt-BR': new URL(replaceLocaleInPathname(pathname, 'pt'), baseUrl).toString(),
        'en-US': new URL(replaceLocaleInPathname(pathname, 'en'), baseUrl).toString(),
        'es-ES': new URL(replaceLocaleInPathname(pathname, 'es'), baseUrl).toString(),
      },
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  }

  if (publishedTime) {
    return {
      ...baseMetadata,
      openGraph: {
        ...baseMetadata.openGraph,
        type: 'article',
        publishedTime,
        modifiedTime: modifiedTime || publishedTime,
        authors: author ? [author] : undefined,
      },
    }
  }

  return baseMetadata
}

/**
 * Generate Open Graph meta tags
 */
export function generateOpenGraph(params: OpenGraphParams) {
  const { title, description, url, image, locale = 'en_US', type = 'website', siteName } = params

  return {
    title,
    description,
    url,
    type,
    locale,
    siteName,
    ...(image && {
      images: [
        {
          url: image.url,
          alt: image.alt,
          width: image.width || 1200,
          height: image.height || 630,
        },
      ],
    }),
  }
}

/**
 * Generate Twitter Card meta tags
 */
export function generateTwitterCard(params: TwitterCardParams) {
  const { title, description, image, creator = '@lapoison_', site = '@lapoison_' } = params

  return {
    card: 'summary_large_image' as const,
    title,
    description,
    creator,
    site,
    ...(image && {
      images: [image.url],
    }),
  }
}

/**
 * Build canonical URL with locale support
 */
export function buildCanonicalUrl(pathname: string, locale?: 'pt-BR' | 'en-US' | 'es-ES'): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  let path = pathname

  if (locale && locale !== 'pt-BR') {
    const prefix = locale === 'en-US' ? '/en' : '/es'
    path = pathname.startsWith(prefix) ? pathname : `${prefix}${pathname}`
  }

  return new URL(path, baseUrl).toString()
}

/**
 * Build OG image URL for dynamic OG image generation
 */
export function buildOGImageUrl(
  slug: string,
  params?: {
    title?: string
    description?: string
    image?: string
  }
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const path = `/api/og/${slug}`

  const searchParams = new URLSearchParams()
  if (params?.title) searchParams.set('title', params.title)
  if (params?.description) searchParams.set('description', params.description)
  if (params?.image) searchParams.set('image', params.image)

  const query = searchParams.toString()
  return query ? `${baseUrl}${path}?${query}` : `${baseUrl}${path}`
}

/**
 * Get alternates language object for hreflang tags
 */
export function getLanguageAlternates(
  pathname: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
) {
  const locales = ['pt-BR', 'en-US', 'es-ES'] as const

  return {
    'pt-BR': new URL(pathname, baseUrl).toString(),
    'en-US': new URL(`/en${pathname}`, baseUrl).toString(),
    'es-ES': new URL(`/es${pathname}`, baseUrl).toString(),
  }
}

/**
 * Format date for structured data (ISO 8601)
 */
export function formatDateForSchema(date: Date | string): string {
  if (typeof date === 'string') {
    return new Date(date).toISOString()
  }
  return date.toISOString()
}

/**
 * Truncate description to SEO-optimal length (155-160 chars)
 */
export function truncateDescription(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text

  const truncated = text.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  return lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) + '…' : truncated + '…'
}

/**
 * Validate and format title (max 60 chars for optimal display)
 */
export function formatTitle(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text

  const truncated = text.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  return lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated
}
