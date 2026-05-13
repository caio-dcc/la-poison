/**
 * Image optimization and CDN helpers for SEO
 * Handles responsive images, lazy loading, and Core Web Vitals optimization
 */

export interface ImageConfig {
  src: string
  alt: string
  width?: number
  height?: number
  priority?: boolean
  loading?: 'lazy' | 'eager'
  sizes?: string
  quality?: number
}

/**
 * Get optimized image dimensions for different screen sizes
 * Prevents layout shift (CLS) by providing explicit aspect ratio
 */
export function getResponsiveImageSizes(baseWidth: number = 1200): string {
  return [
    '(max-width: 640px) 100vw',
    '(max-width: 1024px) 80vw',
    '(max-width: 1280px) 70vw',
    '100vw',
  ].join(', ')
}

/**
 * Build responsive image srcset for next/image
 * Generates paths for different pixel densities and screen sizes
 */
export function buildImageSrcSet(
  imageUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1600]
): string {
  return widths.map(width => `${imageUrl}?w=${width}&q=75 ${width}w`).join(', ')
}

/**
 * Get image aspect ratio for responsive containers
 * Prevents CLS by maintaining consistent dimensions before load
 */
export function getImageAspectRatio(width: number, height: number): number {
  return (height / width) * 100
}

/**
 * Generate placeholder blur data URL for image lazy loading
 * Use with next/image blurDataURL prop for smooth loading UX
 */
export function getPlaceholderDataUrl(): string {
  // 1x1 transparent PNG (smallest possible placeholder)
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
}

/**
 * Get image URL with CDN parameters for optimization
 * Works with Vercel Image Optimization and Cloudflare R2
 */
export function getOptimizedImageUrl(
  imageUrl: string,
  options?: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'auto'
  }
): string {
  const { width, height, quality = 75, format = 'webp' } = options || {}

  const params = new URLSearchParams()
  if (width) params.set('w', String(width))
  if (height) params.set('h', String(height))
  params.set('q', String(quality))
  params.set('f', format)

  const separator = imageUrl.includes('?') ? '&' : '?'
  return `${imageUrl}${separator}${params.toString()}`
}

/**
 * Generate image srcset for next/image component
 * Optimizes for both resolution and screen size
 */
export function generateImageSrcSet(imageUrl: string, baseWidth: number = 1200) {
  const widths = [320, 640, 960, 1280, 1600]
  const devicePixelRatios = [1, 2]

  const srcset = widths
    .flatMap(w =>
      devicePixelRatios.map(dpr => ({
        width: w * dpr,
        url: getOptimizedImageUrl(imageUrl, {
          width: w * dpr,
          quality: 75,
        }),
      }))
    )
    .sort((a, b) => a.width - b.width)
    .map(item => `${item.url} ${item.width}w`)
    .join(', ')

  return srcset
}

/**
 * Check if image needs lazy loading based on position
 * Images above the fold (hero) should have priority=true
 */
export function shouldPrioritizeImage(priority?: boolean): boolean {
  return priority ?? false
}

/**
 * Get loading strategy for image based on context
 * Hero images: eager (download immediately)
 * Below-fold: lazy (download when near viewport)
 */
export function getImageLoadingStrategy(priority?: boolean): 'lazy' | 'eager' {
  return priority ? 'eager' : 'lazy'
}

/**
 * Build image alt text following accessibility best practices
 * Descriptive alts help both users and search engines
 */
export function buildImageAltText(drinkName: string, context?: string): string {
  if (context) {
    return `${drinkName} - ${context}`
  }
  return `${drinkName} cocktail drink`
}

/**
 * Get image dimensions for Open Graph (optimal for social sharing)
 * Facebook/Twitter: 1200x630px (1.91:1 ratio)
 */
export function getOGImageDimensions() {
  return {
    width: 1200,
    height: 630,
  }
}

/**
 * Validate image format for web (no expensive formats)
 */
export function isValidWebImageFormat(url: string): boolean {
  const validFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']
  return validFormats.some(format => url.toLowerCase().endsWith(format))
}

/**
 * Convert image URL to use Cloudflare R2 CDN if available
 */
export function getCloudflareImageUrl(
  imageUrl: string,
  options?: {
    width?: number
    quality?: number
  }
): string {
  const cdnUrl = process.env.NEXT_PUBLIC_R2_CDN_URL
  if (!cdnUrl || !imageUrl.includes('thecocktaildb.com')) {
    return imageUrl
  }

  const path = imageUrl.split('thecocktaildb.com')[1]
  const { width, quality } = options || {}

  const params = new URLSearchParams()
  if (width) params.set('w', String(width))
  if (quality) params.set('q', String(quality))

  const query = params.toString()
  return query ? `${cdnUrl}${path}?${query}` : `${cdnUrl}${path}`
}
