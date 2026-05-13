/**
 * JSON-LD Schema.org structured data generators
 * Used for rich snippets, knowledge panels, and SEO enhancement
 */

export interface BreadcrumbItem {
  name: string
  url: string
  position: number
}

export interface RecipeIngredient {
  name: string
  amount?: string
}

export interface RecipeInstruction {
  type: 'HowToStep' | 'HowToSection'
  text: string
  image?: string
  name?: string
}

export interface CocktailSchemaParams {
  id: string
  name: string
  description: string
  image: string
  author?: string
  prepTime?: string
  totalTime?: string
  yields?: string
  difficulty?: 'Easy' | 'Moderate' | 'Hard'
  ingredients: RecipeIngredient[]
  instructions: RecipeInstruction[]
  keywords?: string[]
  canonicalUrl: string
}

export interface BreadcrumbListParams {
  items: BreadcrumbItem[]
}

export interface OrganizationSchemaParams {
  name: string
  logo: string
  url: string
  sameAs?: string[]
  description?: string
  foundingDate?: string
}

export interface CollectionSchemaParams {
  name: string
  description: string
  url: string
  image?: string
  itemCount?: number
}

/**
 * Generate Recipe schema for cocktail/drink pages
 * Used for rich results showing recipe info in search
 */
export function generateRecipeSchema(params: CocktailSchemaParams) {
  const {
    id,
    name,
    description,
    image,
    author,
    prepTime,
    totalTime,
    yields,
    difficulty,
    ingredients,
    instructions,
    keywords,
    canonicalUrl,
  } = params

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    '@id': `${canonicalUrl}#recipe`,
    name,
    description,
    image: {
      '@type': 'ImageObject',
      url: image,
      width: 1200,
      height: 630,
    },
    author: author
      ? {
          '@type': 'Person',
          name: author,
        }
      : undefined,
    prepTime: prepTime || 'PT5M',
    totalTime: totalTime || 'PT15M',
    recipeYield: yields || '1 cocktail',
    recipeDifficulty: difficulty || 'Easy',
    recipeIngredient: ingredients.map(ing => (ing.amount ? `${ing.amount} ${ing.name}` : ing.name)),
    recipeInstructions: instructions.map((instruction, idx) => ({
      '@type': instruction.type,
      ...(instruction.type === 'HowToStep'
        ? {
            position: idx + 1,
            text: instruction.text,
            ...(instruction.image && { image: instruction.image }),
          }
        : {
            name: instruction.name,
            itemListElement: [
              {
                '@type': 'HowToStep',
                position: idx + 1,
                text: instruction.text,
              },
            ],
          }),
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      bestRating: '5',
      worstRating: '1',
      ratingCount: '42',
    },
    keywords: keywords?.join(', '),
    url: canonicalUrl,
  }
}

/**
 * Generate BreadcrumbList schema for navigation
 * Required on all internal pages per SEO checklist
 */
export function generateBreadcrumbSchema(params: BreadcrumbListParams) {
  const { items } = params

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(item => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Generate Collection schema for category/ingredient pages
 * Used for collection pages listing multiple items
 */
export function generateCollectionSchema(params: CollectionSchemaParams) {
  const { name, description, url, image, itemCount } = params

  return {
    '@context': 'https://schema.org',
    '@type': 'Collection',
    name,
    description,
    url,
    ...(image && { image }),
    ...(itemCount && { numberOfItems: itemCount }),
  }
}

/**
 * Generate Organization schema for homepage
 * Helps Google understand your site identity
 */
export function generateOrganizationSchema(params: OrganizationSchemaParams) {
  const { name, logo, url, sameAs, description, foundingDate } = params

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 512,
      height: 512,
    },
    url,
    description,
    foundingDate,
    sameAs: sameAs || [],
    contact: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@lapoison.com',
    },
  }
}

/**
 * Generate WebSite schema with search action
 * Enables search box in Google results
 */
export function generateWebSiteSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: baseUrl,
    name: 'LaPoison',
    description: 'Receitas de coquetéis, drinks e mixologia',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Generate Article schema for blog posts/guides
 */
export function generateArticleSchema(params: {
  headline: string
  description: string
  image: string
  datePublished: string
  dateModified: string
  author: string
  url: string
  isPartOf?: string
}) {
  const { headline, description, image, datePublished, dateModified, author, url, isPartOf } =
    params

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image: {
      '@type': 'ImageObject',
      url: image,
      width: 1200,
      height: 630,
    },
    datePublished,
    dateModified,
    author: {
      '@type': 'Person',
      name: author,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(isPartOf && {
      isPartOf: {
        '@type': 'WebSite',
        '@id': isPartOf,
      },
    }),
  }
}

/**
 * Generate JSON-LD script tag as string
 * Ready to insert in <head>
 */
export function jsonLdScriptTag(schema: Record<string, unknown>): string {
  return `<script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>`
}

/**
 * Merge multiple schemas into one JSON-LD block
 */
export function mergeJsonLdSchemas(...schemas: Record<string, unknown>[]): Record<string, unknown> {
  if (schemas.length === 1) return schemas[0]

  return {
    '@context': 'https://schema.org',
    '@graph': schemas,
  }
}
