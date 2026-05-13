/* eslint-disable @next/next/no-img-element */
import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { generateSEOMetadata, buildOGImageUrl, buildCanonicalUrl } from '@/lib/seo/metadata'
import {
  generateRecipeSchema,
  generateBreadcrumbSchema,
  mergeJsonLdSchemas,
} from '@/lib/seo/jsonld'
import { truncateDescription, formatTitle } from '@/lib/seo/metadata'

interface CocktailRow {
  id: string
  name: string
  slug: string
  category: string
  instructions: string
  thumb_url: string
}

interface CocktailWithIngredients extends CocktailRow {
  ingredients: Array<{ name: string; measure?: string }>
}

export const dynamicParams = false
export const revalidate = 3600

async function getCocktail(slug: string): Promise<CocktailWithIngredients | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cocktails')
      .select('id, name, slug, category, instructions, thumb_url')
      .eq('slug', slug)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return null
    }

    // Query ingredients via the cocktail_ingredients junction table
    const { data: ingredientData, error: ingredientError } = await supabase
      .from('cocktail_ingredients')
      .select('measure, ingredients(name)')
      .eq('cocktail_id', (data as CocktailRow).id)

    if (ingredientError) {
      console.warn('Warning fetching ingredients:', ingredientError)
    }

    interface IngredientRow {
      measure: string | null
      ingredients: { name: string }[] | { name: string } | null
    }

    const ingredients = (ingredientData || []).map(item => {
      const ing = item.ingredients as IngredientRow['ingredients']
      const name = Array.isArray(ing) ? ing[0]?.name : (ing as { name: string } | null)?.name
      return {
        name: name || 'Unknown',
        measure: item.measure,
      }
    })

    return {
      ...(data as CocktailRow),
      ingredients,
    }
  } catch (err) {
    console.error('Failed to fetch cocktail:', err)
    return null
  }
}

async function getAllCocktailSlugs(): Promise<string[]> {
  try {
    // Use REST API directly instead of client to avoid cookies() in build time
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config')
      return []
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/cocktails?select=slug&limit=500`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })

    if (!response.ok) {
      console.error('Error fetching slugs:', response.statusText)
      return []
    }

    const data = (await response.json()) as Array<{ slug: string }>
    return data.map(row => row.slug)
  } catch (err) {
    console.error('Failed to fetch slugs:', err)
    return []
  }
}

export async function generateStaticParams() {
  const slugs = await getAllCocktailSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params
  const cocktail = await getCocktail(slug)

  if (!cocktail) {
    return {
      title: 'Drink not found',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/drinks/${slug}`
  const description = truncateDescription(`${cocktail.name} — ${cocktail.category}`)

  return generateSEOMetadata(
    {
      title: formatTitle(cocktail.name),
      description,
      pathname,
      image: {
        url: buildOGImageUrl(slug),
        alt: `${cocktail.name} cocktail`,
        width: 1200,
        height: 630,
      },
      locale: 'pt-BR',
      type: 'article',
      tags: [cocktail.category],
    },
    baseUrl
  )
}

export default async function DrinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cocktail = await getCocktail(slug)

  if (!cocktail) {
    notFound()
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/drinks/${slug}`
  const canonicalUrl = buildCanonicalUrl(pathname)

  // Build Recipe schema
  const recipeSchema = generateRecipeSchema({
    id: cocktail.id,
    name: cocktail.name,
    description: cocktail.instructions || '',
    image: cocktail.thumb_url,
    canonicalUrl,
    ingredients: cocktail.ingredients || [],
    instructions: [
      {
        type: 'HowToStep',
        text: cocktail.instructions || 'Mix and serve',
      },
    ],
    keywords: [cocktail.category],
  })

  // Build Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: 'Home', url: baseUrl, position: 1 },
      { name: 'Drinks', url: `${baseUrl}/drinks`, position: 2 },
      { name: cocktail.name, url: canonicalUrl, position: 3 },
    ],
  })

  // Merge schemas
  const jsonLd = mergeJsonLdSchemas(recipeSchema, breadcrumbSchema)

  return (
    <main className="min-h-screen bg-porcelain py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
          <span className="font-medium">{cocktail.name}</span>
        </nav>

        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="flex items-center justify-center">
            <img
              src={cocktail.thumb_url}
              alt={cocktail.name}
              className="w-full h-auto max-w-sm rounded-lg shadow-lg"
              loading="eager"
            />
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-evergreen mb-4">{cocktail.name}</h1>
            <p className="text-xl text-hunter-green mb-6">{cocktail.category}</p>

            <div className="prose prose-sm max-w-none mb-8">
              <p className="text-base text-shadow-grey leading-relaxed">{cocktail.instructions}</p>
            </div>

            {/* Ingredients List */}
            {cocktail.ingredients && cocktail.ingredients.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-evergreen mb-4">Ingredients</h2>
                <ul className="space-y-2">
                  {cocktail.ingredients.map((ing, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-shadow-grey">
                      <span className="text-hunter-green font-medium min-w-fit">
                        {ing.measure || '·'}
                      </span>
                      <span>{ing.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
