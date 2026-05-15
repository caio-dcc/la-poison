/* eslint-disable @next/next/no-img-element */
import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { generateSEOMetadata, buildOGImageUrl, buildCanonicalUrl } from '@/lib/seo/metadata'
import {
  generateRecipeSchema,
  generateBreadcrumbSchema,
  mergeJsonLdSchemas,
} from '@/lib/seo/jsonld'
import { truncateDescription, formatTitle } from '@/lib/seo/metadata'
import { IngredientsCard } from '@/components/drinks/IngredientsCard'
import { getInstructions, getIngredientName, getCategoryName } from '@/lib/i18n/translate'

interface CocktailRow {
  id: string
  name: string
  slug: string
  instructions_pt: string | null
  instructions_en: string | null
  instructions_es: string | null
  category_id: string | null
  thumb_url: string
  abv_estimate?: number
  difficulty?: number
  prep_time_minutes?: number
}

interface Category {
  id: string
  name: string
  name_i18n?: Record<string, string> | null
  slug: string
}

interface Ingredient {
  name: string
  name_i18n?: Record<string, string> | null
  slug: string
}

interface CocktailWithIngredients extends CocktailRow {
  category?: Category
  ingredients: Array<{
    name: string
    name_i18n?: Record<string, string> | null
    measure_text?: string
    slug?: string
    amount_ml?: number | null
  }>
}

const localeToLang = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

const pageLabels = {
  pt: {
    home: 'Home',
    drinks: 'Drinks',
    category: 'Categoria',
    difficulty: 'Dificuldade',
    abv: 'ABV',
    prepTime: 'Tempo de preparo',
    instructions: 'Modo de preparo',
    notFound: 'Drink não encontrado',
  },
  en: {
    home: 'Home',
    drinks: 'Drinks',
    category: 'Category',
    difficulty: 'Difficulty',
    abv: 'ABV',
    prepTime: 'Prep time',
    instructions: 'Instructions',
    notFound: 'Drink not found',
  },
  es: {
    home: 'Inicio',
    drinks: 'Bebidas',
    category: 'Categoría',
    difficulty: 'Dificultad',
    abv: 'ABV',
    prepTime: 'Tiempo de preparación',
    instructions: 'Preparación',
    notFound: 'Bebida no encontrada',
  },
}

export const dynamicParams = true
export const revalidate = 3600

async function getCocktail(slug: string): Promise<CocktailWithIngredients | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !supabaseKey) return null

    // Use REST API to avoid cookies() during SSG
    const response = await fetch(
      `${supabaseUrl}/rest/v1/cocktails?slug=eq.${slug}&select=id,name,slug,instructions_pt,instructions_en,instructions_es,category_id,thumb_url,abv_estimate,difficulty,prep_time_minutes,categories(id,name,name_i18n,slug)`,
      {
        headers: { apikey: supabaseKey },
      }
    )
    if (!response.ok) return null
    const data = (await response.json()) as Array<any>
    if (!data.length) return null

    const cocktailRow = data[0] as CocktailRow & { categories: Category }

    // Fetch ingredients via REST API
    const ingredientResponse = await fetch(
      `${supabaseUrl}/rest/v1/cocktail_ingredients?cocktail_id=eq.${cocktailRow.id}&order=order_index.asc&select=measure_text,amount_ml,ingredients(name,name_i18n,slug)`,
      {
        headers: { apikey: supabaseKey },
      }
    )
    if (!ingredientResponse.ok) return null
    const ingredientData = (await ingredientResponse.json()) as Array<any>

    const ingredients = (ingredientData || []).map(item => {
      const ing = item.ingredients as Ingredient | Ingredient[] | null
      const resolved = Array.isArray(ing) ? ing[0] : ing
      return {
        name: resolved?.name || 'Unknown',
        name_i18n: resolved?.name_i18n,
        slug: resolved?.slug,
        measure_text: item.measure_text || '',
        amount_ml: item.amount_ml ?? null,
      }
    })

    return {
      ...cocktailRow,
      category: cocktailRow.categories,
      ingredients,
    }
  } catch (err) {
    console.error('Failed to fetch cocktail:', err)
    return null
  }
}

async function getAllCocktailSlugs(): Promise<string[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !supabaseKey) return []

    const response = await fetch(`${supabaseUrl}/rest/v1/cocktails?select=slug&limit=500`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    })
    if (!response.ok) return []
    const data = (await response.json()) as Array<{ slug: string }>
    return data.map(row => row.slug)
  } catch {
    return []
  }
}

export async function generateStaticParams() {
  const slugs = await getAllCocktailSlugs()
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
  const cocktail = await getCocktail(slug)
  if (!cocktail) return { title: 'Drink not found' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks/${slug}`
  const instructions = getInstructions(cocktail, locale)
  const categoryName = cocktail.category ? getCategoryName(cocktail.category, locale) : ''
  const description = truncateDescription(`${cocktail.name} — ${categoryName}. ${instructions}`)
  const localeKey = locale as keyof typeof localeToLang
  const lang = (localeToLang[localeKey] || 'pt-BR') as 'pt-BR' | 'en-US' | 'es-ES'

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
      locale: lang,
      type: 'article',
      tags: categoryName ? [categoryName] : [],
    },
    baseUrl
  )
}

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < level ? 'text-hunter-green' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </div>
  )
}

export default async function DrinkPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const cocktail = await getCocktail(slug)
  if (!cocktail) notFound()

  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks/${slug}`
  const canonicalUrl = buildCanonicalUrl(pathname)

  const categoryName = cocktail.category ? getCategoryName(cocktail.category, locale) : ''
  const instructions = getInstructions(cocktail, locale)

  const recipeSchema = generateRecipeSchema({
    id: cocktail.id,
    name: cocktail.name,
    description: instructions || '',
    image: cocktail.thumb_url,
    canonicalUrl,
    ingredients: cocktail.ingredients || [],
    instructions: [{ type: 'HowToStep', text: instructions || 'Mix and serve' }],
    keywords: [categoryName],
  })

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: labels.home, url: `${baseUrl}/${locale}`, position: 1 },
      { name: labels.drinks, url: `${baseUrl}/${locale}/drinks`, position: 2 },
      { name: cocktail.name, url: canonicalUrl, position: 3 },
    ],
  })

  const jsonLd = mergeJsonLdSchemas(recipeSchema, breadcrumbSchema)

  const instructionSteps = instructions
    ? instructions.split(/(?<=[.!])\s+(?=[A-Z1-9])/).filter(s => s.trim().length > 0)
    : []

  return (
    <main className="min-h-screen bg-porcelain">
      <div className="bg-evergreen text-porcelain py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <nav className="text-sm text-porcelain/60 mb-2">
            <Link href={`/${locale}`} className="hover:text-porcelain transition-colors">
              {labels.home}
            </Link>
            {' / '}
            <Link href={`/${locale}/drinks`} className="hover:text-porcelain transition-colors">
              {labels.drinks}
            </Link>
            {' / '}
            <span>{cocktail.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl overflow-hidden shadow-md bg-white">
              <img
                src={cocktail.thumb_url}
                alt={cocktail.name}
                className="w-full aspect-square object-cover"
                loading="eager"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-shadow-grey/70">{labels.category}</span>
                <Link
                  href={`/${locale}/drinks/category/${(cocktail.category?.slug || categoryName).toLowerCase().replace(/\s+/g, '-')}`}
                  className="font-medium text-evergreen hover:text-hunter-green transition-colors"
                >
                  {categoryName}
                </Link>
              </div>
              {cocktail.difficulty && (
                <div className="flex items-center justify-between">
                  <span className="text-shadow-grey/70">{labels.difficulty}</span>
                  <DifficultyStars level={cocktail.difficulty} />
                </div>
              )}
              {cocktail.abv_estimate && (
                <div className="flex items-center justify-between">
                  <span className="text-shadow-grey/70">{labels.abv}</span>
                  <span className="font-medium text-shadow-grey">{cocktail.abv_estimate}%</span>
                </div>
              )}
              {cocktail.prep_time_minutes && (
                <div className="flex items-center justify-between">
                  <span className="text-shadow-grey/70">{labels.prepTime}</span>
                  <span className="font-medium text-shadow-grey">
                    {cocktail.prep_time_minutes} min
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-3 space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-evergreen mb-1">
                {cocktail.name}
              </h1>
              <p className="text-hunter-green">{categoryName}</p>
            </div>

            {cocktail.ingredients.length > 0 && (
              <IngredientsCard ingredients={cocktail.ingredients} locale={locale} />
            )}

            {instructions && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-evergreen mb-4">{labels.instructions}</h2>
                {instructionSteps.length > 1 ? (
                  <ol className="space-y-3 list-decimal list-inside">
                    {instructionSteps.map((step, idx) => (
                      <li key={idx} className="text-shadow-grey leading-relaxed">
                        {step.trim()}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-shadow-grey leading-relaxed">{instructions}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
