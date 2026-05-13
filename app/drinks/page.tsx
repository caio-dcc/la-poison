import { Metadata } from 'next'
import Link from 'next/link'
import { generateSEOMetadata, buildCanonicalUrl } from '@/lib/seo/metadata'
import {
  generateCollectionSchema,
  generateBreadcrumbSchema,
  mergeJsonLdSchemas,
} from '@/lib/seo/jsonld'
import { DrinksSearch } from '@/components/drinks/DrinksSearch'

interface Cocktail {
  id: string
  name: string
  slug: string
  thumb_url: string
  category: string
  abv_estimate?: number
  difficulty?: number
  prep_time_minutes?: number
}

interface FilterOptions {
  categories: string[]
  ingredients: string[]
  difficulties: number[]
  abvRanges: { min: number; max: number }[]
  prepTimes: { min: number; max: number }[]
}

export const revalidate = 3600

async function getAllCocktails(): Promise<Cocktail[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config')
      return []
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/cocktails?select=id,name,slug,thumb_url,category,abv_estimate,difficulty,prep_time_minutes&order=name.asc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Error fetching cocktails:', response.statusText)
      return []
    }

    return (await response.json()) as Cocktail[]
  } catch (err) {
    console.error('Failed to fetch cocktails:', err)
    return []
  }
}

async function getFilterOptions(): Promise<FilterOptions> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config')
      return {
        categories: [],
        ingredients: [],
        difficulties: [],
        abvRanges: [],
        prepTimes: [],
      }
    }

    // Fetch categories
    const catResponse = await fetch(`${supabaseUrl}/rest/v1/cocktails?select=category&limit=500`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })

    const categories = catResponse.ok
      ? [
          ...new Set(
            ((await catResponse.json()) as Array<{ category: string }>)
              .map(r => r.category)
              .filter(Boolean)
          ),
        ].sort()
      : []

    // Fetch ingredients
    const ingResponse = await fetch(
      `${supabaseUrl}/rest/v1/ingredients?select=name&order=name.asc&limit=500`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    const ingredients = ingResponse.ok
      ? ((await ingResponse.json()) as Array<{ name: string }>).map(r => r.name)
      : []

    // Fetch difficulties
    const diffResponse = await fetch(
      `${supabaseUrl}/rest/v1/cocktails?select=difficulty&limit=500`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    const difficulties = diffResponse.ok
      ? [
          ...new Set(
            ((await diffResponse.json()) as Array<{ difficulty: number }>)
              .map(r => r.difficulty)
              .filter(Boolean)
          ),
        ].sort((a, b) => a - b)
      : []

    return {
      categories: categories as string[],
      ingredients,
      difficulties: difficulties as number[],
      abvRanges: [
        { min: 0, max: 15 },
        { min: 15, max: 25 },
        { min: 25, max: 35 },
        { min: 35, max: 100 },
      ],
      prepTimes: [
        { min: 0, max: 5 },
        { min: 5, max: 15 },
        { min: 15, max: 30 },
        { min: 30, max: 1000 },
      ],
    }
  } catch (err) {
    console.error('Failed to fetch filter options:', err)
    return {
      categories: [],
      ingredients: [],
      difficulties: [],
      abvRanges: [],
      prepTimes: [],
    }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = '/drinks'

  return generateSEOMetadata(
    {
      title: 'Cocktail Recipes & Drinks',
      description:
        'Browse 425+ cocktail recipes with ingredients, instructions, and ratings. Filter by category, difficulty, and more.',
      pathname,
      image: {
        url: `${baseUrl}/og-image.png`,
        alt: 'Cocktail Recipes',
        width: 1200,
        height: 630,
      },
      locale: 'pt-BR',
      type: 'website',
      tags: ['cocktails', 'recipes', 'drinks'],
    },
    baseUrl
  )
}

export default async function DrinksPage() {
  const cocktails = await getAllCocktails()
  const filterOptions = await getFilterOptions()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = '/drinks'
  const canonicalUrl = buildCanonicalUrl(pathname)

  // Build Collection schema
  const collectionSchema = generateCollectionSchema({
    name: 'Cocktail Recipes',
    description: 'Browse all 425+ cocktail recipes with search and filters',
    url: canonicalUrl,
    image: '',
    itemCount: cocktails.length,
  })

  // Build Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: 'Home', url: baseUrl, position: 1 },
      { name: 'Drinks', url: canonicalUrl, position: 2 },
    ],
  })

  // Merge schemas
  const jsonLd = mergeJsonLdSchemas(collectionSchema, breadcrumbSchema)

  return (
    <main className="min-h-screen bg-porcelain py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="mb-8 text-sm text-shadow-grey">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          {' / '}
          <span className="font-medium">Drinks</span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-evergreen mb-4">Cocktail Recipes</h1>
          <p className="text-xl text-hunter-green">{cocktails.length} recipes to explore</p>
        </div>

        {/* Search & Filters */}
        <DrinksSearch cocktails={cocktails} filterOptions={filterOptions} />

        {/* Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </div>
    </main>
  )
}
