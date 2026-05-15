import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { generateSEOMetadata, buildOGImageUrl, buildCanonicalUrl } from '@/lib/seo/metadata'
import {
  generateCollectionSchema,
  generateBreadcrumbSchema,
  mergeJsonLdSchemas,
} from '@/lib/seo/jsonld'
import { truncateDescription, formatTitle } from '@/lib/seo/metadata'
import { getCategoryName } from '@/lib/i18n/translate'

interface Cocktail {
  id: string
  name: string
  slug: string
  thumb_url: string
}

interface Category {
  id: string
  name: string
  name_i18n?: Record<string, string> | null
  slug: string
}

const localeToLang = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

const pageLabels = {
  pt: { home: 'Home', drinks: 'Drinks', cocktails: 'Coquetéis', recipes: 'receita' },
  en: { home: 'Home', drinks: 'Drinks', cocktails: 'Cocktails', recipes: 'recipe' },
  es: { home: 'Inicio', drinks: 'Bebidas', cocktails: 'Cócteles', recipes: 'receta' },
}

export const dynamicParams = false
export const revalidate = 3600

async function getCategory(categorySlug: string): Promise<Category | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, name_i18n, slug')
      .eq('slug', categorySlug)
      .single()

    if (error || !data) return null
    return data as Category
  } catch (err) {
    console.error('Failed to fetch category:', err)
    return null
  }
}

async function getCocktailsByCategory(categoryId: string): Promise<Cocktail[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cocktails')
      .select('id, name, slug, thumb_url')
      .eq('category_id', categoryId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return []
    }

    return (data || []) as Cocktail[]
  } catch (err) {
    console.error('Failed to fetch cocktails by category:', err)
    return []
  }
}

async function getAllCategories(): Promise<string[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config')
      return []
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/categories?select=slug&limit=500`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })

    if (!response.ok) {
      console.error('Error fetching categories:', response.statusText)
      return []
    }

    const data = (await response.json()) as Array<{ slug: string }>
    return data.map(row => row.slug).filter(Boolean)
  } catch (err) {
    console.error('Failed to fetch categories:', err)
    return []
  }
}

export async function generateStaticParams() {
  const slugs = await getAllCategories()
  const locales = ['pt', 'en', 'es']
  const params: Array<{ locale: string; slug: string }> = []
  for (const locale of locales) {
    for (const slug of slugs) {
      params.push({ locale, slug })
    }
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const category = await getCategory(slug)

  if (!category) {
    return {
      title: 'Category not found',
    }
  }

  const cocktails = await getCocktailsByCategory(category.id)
  const categoryName = getCategoryName(category, locale)
  const localeKey = locale as keyof typeof localeToLang
  const lang = (localeToLang[localeKey] || 'pt-BR') as 'pt-BR' | 'en-US' | 'es-ES'

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks/category/${slug}`
  const description = truncateDescription(
    `${cocktails.length} ${categoryName} cocktails and recipes`
  )

  return generateSEOMetadata(
    {
      title: formatTitle(`${categoryName} Cocktails`),
      description,
      pathname,
      image: {
        url: buildOGImageUrl(`category-${slug}`),
        alt: `${categoryName} cocktails`,
        width: 1200,
        height: 630,
      },
      locale: lang,
      type: 'website',
      tags: [categoryName],
    },
    baseUrl
  )
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const category = await getCategory(slug)

  if (!category) {
    notFound()
  }

  const cocktails = await getCocktailsByCategory(category.id)
  const categoryName = getCategoryName(category, locale)
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt

  if (!cocktails.length) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks/category/${slug}`
  const canonicalUrl = buildCanonicalUrl(pathname)

  const collectionSchema = generateCollectionSchema({
    name: `${categoryName} Cocktails`,
    description: `Explore ${cocktails.length} ${categoryName} cocktails and recipes`,
    url: canonicalUrl,
    image: cocktails[0]?.thumb_url || '',
    itemCount: cocktails.length,
  })

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: labels.home, url: `${baseUrl}/${locale}`, position: 1 },
      { name: labels.drinks, url: `${baseUrl}/${locale}/drinks`, position: 2 },
      { name: categoryName, url: canonicalUrl, position: 3 },
    ],
  })

  const jsonLd = mergeJsonLdSchemas(collectionSchema, breadcrumbSchema)

  return (
    <main className="min-h-screen bg-porcelain py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <nav className="mb-8 text-sm text-shadow-grey">
          <Link href={`/${locale}`} className="hover:underline">
            {labels.home}
          </Link>
          {' / '}
          <Link href={`/${locale}/drinks`} className="hover:underline">
            {labels.drinks}
          </Link>
          {' / '}
          <span className="font-medium">{categoryName}</span>
        </nav>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-evergreen mb-4">
            {categoryName} {labels.cocktails}
          </h1>
          <p className="text-xl text-hunter-green">
            {cocktails.length} {labels.recipes}
            {cocktails.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cocktails.map(cocktail => (
            <Link
              key={cocktail.id}
              href={`/${locale}/drinks/${cocktail.slug}`}
              className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cocktail.thumb_url}
                  alt={cocktail.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <h2 className="font-semibold text-evergreen group-hover:text-hunter-green transition-colors">
                  {cocktail.name}
                </h2>
              </div>
            </Link>
          ))}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </div>
    </main>
  )
}
