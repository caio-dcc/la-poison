/* eslint-disable @next/next/no-img-element */
import { Metadata } from 'next'
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
import { SmokeBackground } from '@/components/ui/SmokeBackground'
import { DrinkQRCode } from '@/components/drinks/DrinkQRCode'
import { YouTubeLink } from '@/components/drinks/YouTubeLink'
import { createClient } from '@/utils/supabase/server'
import {
  getInstructions,
  getDescription,
  getHistory,
  getFunFact,
  getCategoryName,
} from '@/lib/i18n/translate'

interface CocktailRow {
  id: string
  name: string
  slug: string
  instructions: string | null
  instructions_en?: string | null
  instructions_pt?: string | null
  instructions_es?: string | null
  description_en?: string | null
  description_pt?: string | null
  description_es?: string | null
  history_en?: string | null
  history_pt?: string | null
  history_es?: string | null
  fun_fact_en?: string | null
  fun_fact_pt?: string | null
  fun_fact_es?: string | null
  category: string | null
  category_id: string | null
  thumb_url: string
  abv_estimate?: number
  difficulty?: number
  prep_time_minutes?: number
}

interface IngredientData {
  name: string
  name_i18n?: Record<string, string> | null
  slug: string
}

interface IngredientJoinItem {
  ingredients: IngredientData | IngredientData[] | null
  measure_text: string | null
  amount_ml: number | null
}

interface CategoryRow {
  id: string
  name: string
  name_i18n?: Record<string, string> | null
  slug: string
}

interface CocktailWithIngredients extends CocktailRow {
  ingredients: Array<{
    name: string
    name_i18n?: Record<string, string> | null
    measure_text?: string
    slug?: string
    amount_ml?: number | null
  }>
  categoryRecord: CategoryRow | null
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
    about: 'Sobre',
    history: 'História',
    funFact: 'Curiosidade',
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
    about: 'About',
    history: 'History',
    funFact: 'Fun fact',
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
    about: 'Sobre',
    history: 'Historia',
    funFact: 'Curiosidad',
    notFound: 'Bebida no encontrada',
  },
}

export const dynamicParams = true
export const revalidate = 3600

// Build a defensive column-select string: we list translation columns
// but if `instructions_pt`/`_es` don't exist in the DB yet (migration 006
// pending), PostgREST returns a 400. We probe once at module load.
let cachedColumnSelect: string | null = null
async function getCocktailColumnSelect(): Promise<string> {
  if (cachedColumnSelect) return cachedColumnSelect

  const baseCols = [
    'id',
    'name',
    'slug',
    'instructions',
    'category',
    'category_id',
    'thumb_url',
    'abv_estimate',
    'difficulty',
    'prep_time_minutes',
    'description_pt',
    'description_en',
    'description_es',
    'history_pt',
    'history_en',
    'history_es',
    'fun_fact_pt',
    'fun_fact_en',
    'fun_fact_es',
  ]

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    cachedColumnSelect = baseCols.join(',')
    return cachedColumnSelect
  }

  // Probe optional cols individually
  const optionalCols = ['instructions_en', 'instructions_pt', 'instructions_es']
  const present: string[] = []
  for (const col of optionalCols) {
    try {
      const r = await fetch(`${supabaseUrl}/rest/v1/cocktails?select=${col}&limit=1`, {
        headers: { apikey: supabaseKey },
      })
      if (r.ok) present.push(col)
    } catch {
      /* skip */
    }
  }
  cachedColumnSelect = [...baseCols, ...present].join(',')
  return cachedColumnSelect
}

async function getCocktail(slug: string, locale: string): Promise<CocktailWithIngredients | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !supabaseKey) return null

    const select = await getCocktailColumnSelect()
    const response = await fetch(
      `${supabaseUrl}/rest/v1/cocktails?slug=eq.${slug}&select=${select}`,
      { headers: { apikey: supabaseKey } }
    )
    if (!response.ok) return null
    const data = (await response.json()) as Array<CocktailRow>
    if (!data.length) return null

    const cocktailRow = data[0]

    // Fetch ingredients
    const ingredientResponse = await fetch(
      `${supabaseUrl}/rest/v1/cocktail_ingredients?cocktail_id=eq.${cocktailRow.id}&select=measure_text,amount_ml,ingredients(name,name_i18n,slug)`,
      { headers: { apikey: supabaseKey } }
    )
    const ingredientData: Array<IngredientJoinItem> = ingredientResponse.ok
      ? ((await ingredientResponse.json()) as Array<IngredientJoinItem>)
      : []

    const ingredients = ingredientData.map(item => {
      const ing = item.ingredients
      const resolved = Array.isArray(ing) ? ing[0] : ing
      return {
        name: resolved?.name || 'Unknown',
        name_i18n: resolved?.name_i18n,
        slug: resolved?.slug,
        measure_text: item.measure_text || '',
        amount_ml: item.amount_ml ?? null,
      }
    })

    // Fetch category (for i18n + slug)
    let categoryRecord: CategoryRow | null = null
    if (cocktailRow.category_id) {
      const catRes = await fetch(
        `${supabaseUrl}/rest/v1/categories?id=eq.${cocktailRow.category_id}&select=id,name,name_i18n,slug`,
        { headers: { apikey: supabaseKey } }
      )
      if (catRes.ok) {
        const rows = (await catRes.json()) as CategoryRow[]
        categoryRecord = rows[0] ?? null
      }
    }
    if (!categoryRecord && cocktailRow.category) {
      const catRes = await fetch(
        `${supabaseUrl}/rest/v1/categories?name=eq.${encodeURIComponent(cocktailRow.category)}&select=id,name,name_i18n,slug&limit=1`,
        { headers: { apikey: supabaseKey } }
      )
      if (catRes.ok) {
        const rows = (await catRes.json()) as CategoryRow[]
        categoryRecord = rows[0] ?? null
      }
    }

    void locale // reserved for future per-locale filtering

    return {
      ...cocktailRow,
      ingredients,
      categoryRecord,
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
  const cocktail = await getCocktail(slug, locale)
  if (!cocktail) return { title: 'Drink not found' }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks/${slug}`
  const categoryName = cocktail.categoryRecord
    ? getCategoryName(cocktail.categoryRecord, locale)
    : cocktail.category || ''
  const description = truncateDescription(
    getDescription(cocktail, locale) ||
      `${cocktail.name} — ${categoryName}. ${getInstructions(cocktail, locale)}`
  )
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
  const cocktail = await getCocktail(slug, locale)
  if (!cocktail) notFound()

  let isPro = false
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user?.id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', session.user.id)
        .single()
      isPro = sub?.status === 'active'
    }
  } catch {
    // non-critical
  }

  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks/${slug}`
  const canonicalUrl = buildCanonicalUrl(pathname)

  const categoryName = cocktail.categoryRecord
    ? getCategoryName(cocktail.categoryRecord, locale)
    : cocktail.category || ''
  const categorySlug =
    cocktail.categoryRecord?.slug ||
    (cocktail.category ? cocktail.category.toLowerCase().replace(/\s+/g, '-') : '')

  const instructions = getInstructions(cocktail, locale)
  const description = getDescription(cocktail, locale)
  const history = getHistory(cocktail, locale)
  const funFact = getFunFact(cocktail, locale)

  const recipeSchema = generateRecipeSchema({
    id: cocktail.id,
    name: cocktail.name,
    description: description || instructions || '',
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
      {/* Hero section with smoke background */}
      <div className="relative overflow-hidden bg-evergreen">
        <SmokeBackground smokeColor="#F1F5F2" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-8 pb-16">
          {/* Breadcrumb */}
          <nav className="text-sm text-porcelain/60 mb-6">
            <Link href={`/${locale}`} className="hover:text-porcelain transition-colors">
              {labels.home}
            </Link>
            {' / '}
            <Link href={`/${locale}/drinks`} className="hover:text-porcelain transition-colors">
              {labels.drinks}
            </Link>
            {' / '}
            <span className="text-porcelain/90">{cocktail.name}</span>
          </nav>

          {/* Drink name + category in hero */}
          <h1 className="text-4xl md:text-5xl font-bold text-porcelain mb-2 drop-shadow-sm">
            {cocktail.name}
          </h1>
          {categoryName && <p className="text-porcelain/70 text-lg">{categoryName}</p>}
        </div>
      </div>

      {/* Content cards — overlap slightly over the hero */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 -mt-4 md:-mt-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6">
          {/* Left column: image + meta */}
          <div className="md:col-span-2 space-y-3 sm:space-y-4">
            <div className="rounded-2xl overflow-hidden shadow-lg bg-white ring-1 ring-black/5">
              <img
                src={cocktail.thumb_url}
                alt={cocktail.name}
                className="w-full aspect-square object-cover"
                loading="eager"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5 space-y-3 text-sm">
              {categoryName && (
                <div className="flex items-center justify-between">
                  <span className="text-shadow-grey/70">{labels.category}</span>
                  {categorySlug ? (
                    <Link
                      href={`/${locale}/drinks/category/${categorySlug}`}
                      className="font-medium text-evergreen hover:text-hunter-green transition-colors"
                    >
                      {categoryName}
                    </Link>
                  ) : (
                    <span className="font-medium text-evergreen">{categoryName}</span>
                  )}
                </div>
              )}
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

            <DrinkQRCode
              url={canonicalUrl}
              drinkName={cocktail.name}
              drinkImage={cocktail.thumb_url}
              locale={locale}
              isPro={isPro}
            />
          </div>

          {/* Right column: content */}
          <div className="md:col-span-3 space-y-4 sm:space-y-5">
            {description && (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6">
                <h2 className="text-lg font-bold text-evergreen mb-3">{labels.about}</h2>
                <p className="text-shadow-grey leading-relaxed">{description}</p>
              </div>
            )}

            {cocktail.ingredients.length > 0 && (
              <IngredientsCard ingredients={cocktail.ingredients} locale={locale} />
            )}

            {instructions && (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6">
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

            {history && (
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6">
                <h2 className="text-lg font-bold text-evergreen mb-3">{labels.history}</h2>
                <p className="text-shadow-grey leading-relaxed">{history}</p>
              </div>
            )}

            {funFact && (
              <div className="bg-hunter-green/10 border border-hunter-green/30 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-evergreen mb-2">{labels.funFact}</h2>
                <p className="text-shadow-grey leading-relaxed">{funFact}</p>
              </div>
            )}

            <YouTubeLink drinkName={cocktail.name} locale={locale} />
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
