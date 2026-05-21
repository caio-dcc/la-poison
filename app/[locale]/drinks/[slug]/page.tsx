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
import { LiquidAurora } from '@/components/ui/liquid-aurora'
import { DrinkQRCode } from '@/components/drinks/DrinkQRCode'
import { YouTubeLink } from '@/components/drinks/YouTubeLink'
import { AskChatbotButton } from '@/components/drinks/AskChatbotButton'
import { createClient } from '@/utils/supabase/server'
import { InteractiveSection } from './InteractiveSection'
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
    abv: 'Teor Alcoólico',
    prepTime: 'Tempo de preparo',
    instructions: 'Modo de preparo',
    about: 'Sobre',
    history: 'História',
    funFact: 'Curiosidade',
    notFound: 'Drink não encontrado',
    details: 'Detalhes',
    alcoholic: 'Alcoólico',
    nonAlcoholic: 'Sem álcool',
    type: 'Tipo',
    serving: 'Servido',
    glass: 'Taça',
    difficultyLevels: ['', 'Fácil', 'Fácil', 'Médio', 'Difícil', 'Expert'],
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
    details: 'Details',
    alcoholic: 'Alcoholic',
    nonAlcoholic: 'Non-alcoholic',
    type: 'Type',
    serving: 'Serving',
    glass: 'Glass',
    difficultyLevels: ['', 'Easy', 'Easy', 'Medium', 'Hard', 'Expert'],
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
    details: 'Detalles',
    alcoholic: 'Alcohólico',
    nonAlcoholic: 'Sin alcohol',
    type: 'Tipo',
    serving: 'Servicio',
    glass: 'Copa',
    difficultyLevels: ['', 'Fácil', 'Fácil', 'Medio', 'Difícil', 'Experto'],
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

  const labels = (pageLabels[locale as keyof typeof pageLabels] ||
    pageLabels.pt) as typeof pageLabels.pt
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/drinks/${slug}`
  const canonicalUrl = buildCanonicalUrl(pathname)

  const categoryName = getCategoryName(
    cocktail.categoryRecord || { name: cocktail.category || undefined },
    locale
  )
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
    <main className="min-h-screen pt-6 md:pt-10 pb-16 relative">
      <LiquidAurora />
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-20">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left column: title + image + meta */}
          <div className="w-full lg:w-1/4 flex-shrink-0 space-y-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-porcelain mb-1 drop-shadow-sm">
                {cocktail.name}
              </h1>
              {categoryName && (
                <p className="text-porcelain/70 text-lg font-medium">{categoryName}</p>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg bg-evergreen/60 ring-1 ring-white/10 backdrop-blur-md">
              <img
                src={cocktail.thumb_url}
                alt={cocktail.name}
                className="w-full aspect-square object-cover"
                loading="eager"
              />
            </div>

            <div className="bg-evergreen/60 rounded-2xl shadow-lg ring-1 ring-white/10 backdrop-blur-md p-5 space-y-3 text-sm">
              {categoryName && (
                <div className="flex items-center justify-between">
                  <span className="text-porcelain/70">{labels.category}</span>
                  {categorySlug ? (
                    <Link
                      href={`/${locale}/drinks/category/${categorySlug}`}
                      className="font-medium text-porcelain hover:text-white transition-colors"
                    >
                      {categoryName}
                    </Link>
                  ) : (
                    <span className="font-medium text-porcelain">{categoryName}</span>
                  )}
                </div>
              )}
              {cocktail.difficulty && (
                <div className="flex items-center justify-between">
                  <span className="text-porcelain/70">{labels.difficulty}</span>
                  <DifficultyStars level={cocktail.difficulty} />
                </div>
              )}
              {cocktail.abv_estimate && (
                <div className="flex items-center justify-between">
                  <span className="text-porcelain/70">{labels.abv}</span>
                  <span className="font-medium text-porcelain">{cocktail.abv_estimate}%</span>
                </div>
              )}
              {cocktail.prep_time_minutes && (
                <div className="flex items-center justify-between">
                  <span className="text-porcelain/70">{labels.prepTime}</span>
                  <span className="font-medium text-porcelain">
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
              ingredients={cocktail.ingredients || []}
              instructions={instructions}
              description={description}
              categoryName={categoryName}
              difficulty={cocktail.difficulty || undefined}
              abv={cocktail.abv_estimate || undefined}
              prepTime={cocktail.prep_time_minutes || undefined}
            />

            <AskChatbotButton drinkName={cocktail.name} locale={locale} />
          </div>

          {/* Right column: content */}
          <div className="w-full lg:w-3/4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              {/* Details card — always shown, spans full width on mobile */}
              <div className="bg-evergreen/60 rounded-2xl shadow-lg ring-1 ring-white/10 backdrop-blur-md p-6 flex flex-col gap-4">
                <h2 className="text-lg font-bold text-porcelain">{labels.details}</h2>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {categoryName && (
                    <>
                      <span className="text-porcelain/60">{labels.category}</span>
                      {categorySlug ? (
                        <Link
                          href={`/${locale}/drinks/category/${categorySlug}`}
                          className="font-medium text-porcelain hover:text-white transition-colors text-right"
                        >
                          {categoryName}
                        </Link>
                      ) : (
                        <span className="font-medium text-porcelain text-right">
                          {categoryName}
                        </span>
                      )}
                    </>
                  )}
                  {'alcoholic' in cocktail &&
                    cocktail.alcoholic !== null &&
                    cocktail.alcoholic !== undefined && (
                      <>
                        <span className="text-porcelain/60">{labels.type}</span>
                        <span className="font-medium text-porcelain text-right">
                          {cocktail.alcoholic ? labels.alcoholic : labels.nonAlcoholic}
                        </span>
                      </>
                    )}
                  {cocktail.abv_estimate ? (
                    <>
                      <span className="text-porcelain/60">{labels.abv}</span>
                      <span className="font-medium text-porcelain text-right">
                        {cocktail.abv_estimate}%
                      </span>
                    </>
                  ) : null}
                  {cocktail.difficulty ? (
                    <>
                      <span className="text-porcelain/60">{labels.difficulty}</span>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-porcelain/70">
                          {labels.difficultyLevels[cocktail.difficulty] ?? ''}
                        </span>
                        <DifficultyStars level={cocktail.difficulty} />
                      </div>
                    </>
                  ) : null}
                  {cocktail.prep_time_minutes ? (
                    <>
                      <span className="text-porcelain/60">{labels.prepTime}</span>
                      <span className="font-medium text-porcelain text-right">
                        {cocktail.prep_time_minutes} min
                      </span>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Ingredients */}
              {cocktail.ingredients.length > 0 && (
                <div className="h-full">
                  <IngredientsCard ingredients={cocktail.ingredients} locale={locale} />
                </div>
              )}

              {/* About */}
              {description && (
                <div className="bg-evergreen/60 rounded-2xl shadow-lg ring-1 ring-white/10 backdrop-blur-md p-6 flex flex-col">
                  <h2 className="text-lg font-bold text-porcelain mb-3">{labels.about}</h2>
                  <p className="text-porcelain/90 leading-relaxed flex-1">{description}</p>
                </div>
              )}

              {/* Instructions */}
              {instructions && (
                <div className="bg-evergreen/60 rounded-2xl shadow-lg ring-1 ring-white/10 backdrop-blur-md p-6 flex flex-col">
                  <h2 className="text-lg font-bold text-porcelain mb-4">{labels.instructions}</h2>
                  {instructionSteps.length > 1 ? (
                    <ol className="space-y-3 list-none flex-1">
                      {instructionSteps.map((step, idx) => (
                        <li key={idx} className="flex gap-3 text-porcelain/90 leading-relaxed">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-porcelain/20 text-porcelain text-xs font-bold flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{step.trim()}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-porcelain/90 leading-relaxed flex-1">{instructions}</p>
                  )}
                </div>
              )}

              {/* History */}
              {history && (
                <div className="bg-evergreen/60 rounded-2xl shadow-lg ring-1 ring-white/10 backdrop-blur-md p-6 flex flex-col">
                  <h2 className="text-lg font-bold text-porcelain mb-3">{labels.history}</h2>
                  <p className="text-porcelain/90 leading-relaxed flex-1">{history}</p>
                </div>
              )}

              {/* Fun fact */}
              {funFact && (
                <div className="bg-hunter-green/40 backdrop-blur-md border border-white/20 rounded-2xl p-6 flex flex-col shadow-lg">
                  <h2 className="text-lg font-bold text-porcelain mb-2">{labels.funFact}</h2>
                  <p className="text-porcelain/90 leading-relaxed flex-1">{funFact}</p>
                </div>
              )}

              {/* YouTube */}
              <div className="h-full">
                <YouTubeLink drinkName={cocktail.name} locale={locale} />
              </div>
            </div>
          </div>
        </div>

        {/* Avaliações e Favoritos */}
        <div className="mt-8">
          <InteractiveSection cocktailId={cocktail.id} locale={locale} />
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
