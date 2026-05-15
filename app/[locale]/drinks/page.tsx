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

const localeToLang = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

const pageLabels = {
  pt: {
    title: 'Drinks & Coquetéis',
    description: 'Explore nossa coleção completa de receitas de coquetéis',
    home: 'Home',
    drinks: 'Drinks',
  },
  en: {
    title: 'Drinks & Cocktails',
    description: 'Explore our complete collection of cocktail recipes',
    home: 'Home',
    drinks: 'Drinks',
  },
  es: {
    title: 'Bebidas y Cócteles',
    description: 'Explora nuestra colección completa de recetas de cócteles',
    home: 'Inicio',
    drinks: 'Bebidas',
  },
}

export const revalidate = 0

async function getAllCocktails(): Promise<Cocktail[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config')
      return []
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/cocktails?select=id,name,slug,thumb_url,category,abv_estimate,difficulty,prep_time_minutes&order=name.asc&limit=500`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: 'no-store',
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

    const cocktails = await getAllCocktails()

    const categoriesSet = new Set(cocktails.map(c => c.category).filter(Boolean))
    const difficultiesSet = new Set(cocktails.map(c => c.difficulty).filter(d => d !== undefined))

    return {
      categories: Array.from(categoriesSet).sort(),
      ingredients: [],
      difficulties: Array.from(difficultiesSet).sort((a, b) => (a || 0) - (b || 0)),
      abvRanges: [
        { min: 0, max: 15 },
        { min: 15, max: 30 },
        { min: 30, max: 100 },
      ],
      prepTimes: [
        { min: 0, max: 5 },
        { min: 5, max: 15 },
        { min: 15, max: 60 },
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks`
  const localeKey = locale as keyof typeof localeToLang
  const lang = (localeToLang[localeKey] || 'pt-BR') as 'pt-BR' | 'en-US' | 'es-ES'

  return generateSEOMetadata(
    {
      title: labels.title,
      description: labels.description,
      pathname,
      locale: lang,
    },
    baseUrl
  )
}

export default async function DrinksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks`
  const canonicalUrl = buildCanonicalUrl(pathname)

  const cocktails = await getAllCocktails()
  const filterOptions = await getFilterOptions()

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: labels.home, url: `${baseUrl}/${locale}`, position: 1 },
      { name: labels.drinks, url: canonicalUrl, position: 2 },
    ],
  })

  const collectionSchema = generateCollectionSchema({
    name: labels.title,
    description: labels.description,
    url: canonicalUrl,
  })

  const jsonLd = mergeJsonLdSchemas(breadcrumbSchema, collectionSchema)

  return (
    <main className="min-h-screen bg-porcelain">
      <div className="bg-evergreen text-porcelain py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="text-sm text-porcelain/60 mb-4">
            <Link href={`/${locale}`} className="hover:text-porcelain transition-colors">
              {labels.home}
            </Link>
            {' / '}
            <span>{labels.drinks}</span>
          </nav>
          <h1 className="text-4xl font-bold">{labels.title}</h1>
          <p className="text-porcelain/80 mt-2">{labels.description}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <DrinksSearch cocktails={cocktails} filterOptions={filterOptions} locale={locale} />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
