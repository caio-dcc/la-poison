import { Metadata } from 'next'
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

interface CocktailWithIngredient {
  id: string
  name: string
  slug: string
  thumb_url: string
}

const localeToLang = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

const pageLabels = {
  pt: { home: 'Home', drinks: 'Drinks', with: 'com', recipes: 'receita' },
  en: { home: 'Home', drinks: 'Drinks', with: 'with', recipes: 'recipe' },
  es: { home: 'Inicio', drinks: 'Bebidas', with: 'con', recipes: 'receta' },
}

export const dynamicParams = false
export const revalidate = 3600

async function getCocktailsByIngredient(ingredientSlug: string): Promise<CocktailWithIngredient[]> {
  try {
    const supabase = await createClient()

    const ingredientName = ingredientSlug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())

    const { data: ingredientData, error: ingredientError } = await supabase
      .from('ingredients')
      .select('id')
      .ilike('name', ingredientName)
      .single()

    if (ingredientError || !ingredientData) {
      console.warn('Ingredient not found:', ingredientSlug)
      return []
    }

    const { data, error } = await supabase
      .from('cocktail_ingredients')
      .select('cocktails(id, name, slug, thumb_url)')
      .eq('ingredient_id', ingredientData.id)
      .order('cocktails(name)', { ascending: true })

    if (error) {
      console.error('Supabase error:', error)
      return []
    }

    return (data || [])
      .map(item => {
        const cocktails = item.cocktails as CocktailWithIngredient[] | CocktailWithIngredient
        return Array.isArray(cocktails) ? cocktails[0] : cocktails
      })
      .filter((cocktail): cocktail is CocktailWithIngredient => cocktail !== null)
  } catch (err) {
    console.error('Failed to fetch cocktails by ingredient:', err)
    return []
  }
}

async function getAllIngredients(): Promise<string[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config')
      return []
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/ingredients?select=name&limit=500`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })

    if (!response.ok) {
      console.error('Error fetching ingredients:', response.statusText)
      return []
    }

    const data = (await response.json()) as Array<{ name: string }>
    return data.map(row => row.name.toLowerCase().replace(/\s+/g, '-'))
  } catch (err) {
    console.error('Failed to fetch ingredients:', err)
    return []
  }
}

function formatIngredientName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export async function generateStaticParams() {
  const slugs = await getAllIngredients()
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
  const cocktails = await getCocktailsByIngredient(slug)
  const ingredientName = formatIngredientName(slug)
  const localeKey = locale as keyof typeof localeToLang
  const lang = (localeToLang[localeKey] || 'pt-BR') as 'pt-BR' | 'en-US' | 'es-ES'

  if (!cocktails.length) {
    return {
      title: 'Ingredient not found',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks/ingredient/${slug}`
  const description = truncateDescription(
    `${cocktails.length} cocktails made with ${ingredientName}`
  )

  return generateSEOMetadata(
    {
      title: formatTitle(`Cocktails with ${ingredientName}`),
      description,
      pathname,
      image: {
        url: buildOGImageUrl(`ingredient-${slug}`),
        alt: `Cocktails with ${ingredientName}`,
        width: 1200,
        height: 630,
      },
      locale: lang,
      type: 'website',
      tags: [ingredientName],
    },
    baseUrl
  )
}

export default async function IngredientPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const cocktails = await getCocktailsByIngredient(slug)
  const ingredientName = formatIngredientName(slug)
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt

  if (!cocktails.length) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks/ingredient/${slug}`
  const canonicalUrl = buildCanonicalUrl(pathname)

  const collectionSchema = generateCollectionSchema({
    name: `Cocktails ${labels.with} ${ingredientName}`,
    description: `${cocktails.length} cocktails made with ${ingredientName}`,
    url: canonicalUrl,
    image: cocktails[0]?.thumb_url || '',
    itemCount: cocktails.length,
  })

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: labels.home, url: `${baseUrl}/${locale}`, position: 1 },
      { name: labels.drinks, url: `${baseUrl}/${locale}/drinks`, position: 2 },
      { name: ingredientName, url: canonicalUrl, position: 3 },
    ],
  })

  const jsonLd = mergeJsonLdSchemas(collectionSchema, breadcrumbSchema)

  return (
    <main className="min-h-screen bg-porcelain">
      <div className="bg-evergreen text-porcelain py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <nav className="text-sm text-porcelain/60 mb-3">
            <Link href={`/${locale}`} className="hover:text-porcelain transition-colors">
              {labels.home}
            </Link>
            {' / '}
            <Link href={`/${locale}/drinks`} className="hover:text-porcelain transition-colors">
              {labels.drinks}
            </Link>
            {' / '}
            <span>{ingredientName}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-1">
            Cocktails {labels.with} {ingredientName}
          </h1>
          <p className="text-porcelain/70">
            {cocktails.length} {labels.recipes}
            {cocktails.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {cocktails.map(cocktail => (
            <Link
              key={cocktail.id}
              href={`/${locale}/drinks/${cocktail.slug}`}
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="aspect-square overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cocktail.thumb_url}
                  alt={cocktail.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
              <div className="p-2.5">
                <h2 className="font-semibold text-xs text-shadow-grey group-hover:text-evergreen transition-colors line-clamp-2 leading-snug">
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
