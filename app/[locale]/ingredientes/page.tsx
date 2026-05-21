import { Metadata } from 'next'
import { generateSEOMetadata, buildCanonicalUrl } from '@/lib/seo/metadata'
import { generateBreadcrumbSchema } from '@/lib/seo/jsonld'
import { IngredientsExplorer } from '@/components/ingredients/IngredientsExplorer'

interface Ingredient {
  id: string
  name: string
  slug: string
  name_i18n?: Record<string, string> | null
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

const pageLabels = {
  pt: {
    title: 'Ingredientes',
    description:
      'Explore todos os ingredientes e descubra quais drinks você pode preparar com o que tem em casa.',
    home: 'Home',
    heading: 'Explore por Ingredientes',
    subheading: 'Selecione os ingredientes que você tem e descubra os drinks possíveis.',
  },
  en: {
    title: 'Ingredients',
    description:
      'Explore all ingredients and discover which drinks you can make with what you have at home.',
    home: 'Home',
    heading: 'Explore by Ingredients',
    subheading: 'Select the ingredients you have and discover the possible drinks.',
  },
  es: {
    title: 'Ingredientes',
    description:
      'Explora todos los ingredientes y descubre qué bebidas puedes preparar con lo que tienes en casa.',
    home: 'Inicio',
    heading: 'Explorar por Ingredientes',
    subheading: 'Selecciona los ingredientes que tienes y descubre las bebidas posibles.',
  },
}

async function getAllIngredients(): Promise<Ingredient[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!supabaseUrl || !supabaseKey) return []

    const res = await fetch(
      `${supabaseUrl}/rest/v1/ingredients?select=id,name,slug,name_i18n&order=name.asc&limit=1000`,
      { headers: { apikey: supabaseKey }, next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    return (await res.json()) as Ingredient[]
  } catch {
    return []
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt

  return generateSEOMetadata(
    {
      title: labels.title,
      description: labels.description,
      pathname: `/${locale}/ingredientes`,
    },
    baseUrl
  )
}

export default async function IngredientesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt
  const ingredients = await getAllIngredients()
  const canonicalUrl = buildCanonicalUrl(`/${locale}/ingredientes`)

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: labels.home, url: `${baseUrl}/${locale}`, position: 1 },
      { name: labels.title, url: canonicalUrl, position: 2 },
    ],
  })

  return (
    <main className="min-h-screen pb-16">
      {/* Hero */}
      <div className="bg-evergreen/80 backdrop-blur-sm py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-porcelain mb-2">{labels.heading}</h1>
          <p className="text-porcelain/70 text-base max-w-2xl">{labels.subheading}</p>
          <p className="text-porcelain/40 text-sm mt-2">{ingredients.length} ingredientes</p>
        </div>
      </div>

      <IngredientsExplorer ingredients={ingredients} locale={locale} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </main>
  )
}
