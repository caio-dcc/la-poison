/**
 * Common types for SEO and structured data
 */

export type Locale = 'pt-BR' | 'en-US' | 'es-ES'

export type LocaleCode = 'pt' | 'en' | 'es'

export const LOCALES: Record<Locale, { code: LocaleCode; name: string; flag: string }> = {
  'pt-BR': { code: 'pt', name: 'Português', flag: '🇧🇷' },
  'en-US': { code: 'en', name: 'English', flag: '🇺🇸' },
  'es-ES': { code: 'es', name: 'Español', flag: '🇪🇸' },
}

export const DEFAULT_LOCALE: Locale = 'pt-BR'

/**
 * SEO metadata for any page
 */
export interface PageMetadata {
  title: string
  description: string
  keywords?: string[]
  image?: {
    url: string
    alt: string
    width?: number
    height?: number
  }
  locale?: Locale
  canonicalUrl?: string
  alternateUrls?: Record<Locale, string>
}

/**
 * Drink/Cocktail specific metadata
 */
export interface DrinkMetadata extends PageMetadata {
  id: string
  slug: string
  name: string
  category: string
  difficulty?: 'Easy' | 'Moderate' | 'Hard'
  prepTime?: number
  servings?: number
  abv?: number
  ingredients: Array<{
    name: string
    amount?: string
  }>
}

/**
 * Breadcrumb navigation for pages
 */
export interface Breadcrumb {
  label: string
  href: string
}

/**
 * Core Web Vitals thresholds for monitoring
 */
export const CWV_THRESHOLDS = {
  LCP: 2500, // Largest Contentful Paint (ms)
  INP: 200, // Interaction to Next Paint (ms)
  CLS: 0.1, // Cumulative Layout Shift (unitless)
  FCP: 1800, // First Contentful Paint (ms)
  TTFB: 600, // Time to First Byte (ms)
} as const

/**
 * SEO scoring weights
 */
export const SEO_WEIGHTS = {
  title: 0.15,
  description: 0.1,
  h1: 0.15,
  internalLinks: 0.2,
  imageAlt: 0.1,
  structuredData: 0.15,
  loadSpeed: 0.15,
} as const

/**
 * Maximum lengths for SEO fields (avoid truncation in results)
 */
export const SEO_LIMITS = {
  titleMax: 60,
  descriptionMin: 120,
  descriptionMax: 160,
  h1Max: 70,
  metaDescriptionMax: 160,
  slugMax: 75,
  keywordMax: 160,
} as const
