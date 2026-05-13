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

interface Ingredient {
  id: string
  name: string
}

interface CocktailWithIngredient {
  id: string
  name: string
  slug: string
  thumb_url: string
}

export const dynamicParams = false
export const revalidate = 3600

async function getCocktailsByIngredient(ingredientSlug: string): Promise<CocktailWithIngredient[]> {
  try {
    const supabase = await createClient()

    // First, find the ingredient by slug (convert slug back to name)
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

    // Then fetch cocktails that use this ingredient
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
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params
  const cocktails = await getCocktailsByIngredient(slug)
  const ingredientName = formatIngredientName(slug)

  if (!cocktails.length) {
    return {
      title: 'Ingredient not found',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/drinks/ingredient/${slug}`
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
      locale: 'pt-BR',
      type: 'website',
      tags: [ingredientName],
    },
    baseUrl
  )
}

export default async function IngredientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cocktails = await getCocktailsByIngredient(slug)
  const ingredientName = formatIngredientName(slug)

  if (!cocktails.length) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/drinks/ingredient/${slug}`
  const canonicalUrl = buildCanonicalUrl(pathname)

  // Build Collection schema
  const collectionSchema = generateCollectionSchema({
    name: `Cocktails with ${ingredientName}`,
    description: `${cocktails.length} cocktails made with ${ingredientName}`,
    url: canonicalUrl,
    image: cocktails[0]?.thumb_url || '',
    itemCount: cocktails.length,
  })

  // Build Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: 'Home', url: baseUrl, position: 1 },
      { name: 'Drinks', url: `${baseUrl}/drinks`, position: 2 },
      { name: ingredientName, url: canonicalUrl, position: 3 },
    ],
  })

  // Merge schemas
  const jsonLd = mergeJsonLdSchemas(collectionSchema, breadcrumbSchema)

  return (
    <main className="min-h-screen bg-porcelain py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="mb-8 text-sm text-shadow-grey">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          {' / '}
          <Link href="/drinks" className="hover:underline">
            Drinks
          </Link>
          {' / '}
          <span className="font-medium">{ingredientName}</span>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-evergreen mb-4">
            Cocktails with {ingredientName}
          </h1>
          <p className="text-xl text-hunter-green">
            {cocktails.length} recipe{cocktails.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Cocktails Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cocktails.map(cocktail => (
            <Link
              key={cocktail.id}
              href={`/drinks/${cocktail.slug}`}
              className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-200">
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

        {/* Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </div>
    </main>
  )
}
