import { MetadataRoute } from 'next'

interface Cocktail {
  slug: string
  updated_at?: string
}

interface Category {
  name: string
  updated_at?: string
}

interface Ingredient {
  name: string
  updated_at?: string
}

async function getAllCocktails(): Promise<Cocktail[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase config for cocktails sitemap')
      return []
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/cocktails?select=slug,updated_at&limit=500`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Error fetching cocktails for sitemap:', response.statusText)
      return []
    }

    return (await response.json()) as Cocktail[]
  } catch (err) {
    console.error('Failed to fetch cocktails for sitemap:', err)
    return []
  }
}

async function getAllCategories(): Promise<Category[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return []
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/categories?select=name,updated_at&limit=100`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Error fetching categories for sitemap:', response.statusText)
      return []
    }

    return (await response.json()) as Category[]
  } catch (err) {
    console.error('Failed to fetch categories for sitemap:', err)
    return []
  }
}

async function getAllIngredients(): Promise<Ingredient[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return []
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/ingredients?select=name,updated_at&limit=500`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Error fetching ingredients for sitemap:', response.statusText)
      return []
    }

    return (await response.json()) as Ingredient[]
  } catch (err) {
    console.error('Failed to fetch ingredients for sitemap:', err)
    return []
  }
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Fetch data in parallel
  const [cocktails, categories, ingredients] = await Promise.all([
    getAllCocktails(),
    getAllCategories(),
    getAllIngredients(),
  ])

  const sitemapEntries: MetadataRoute.Sitemap = [
    // Home page
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // Drinks listing
    {
      url: `${baseUrl}/drinks`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Individual drinks
    ...cocktails.map(cocktail => ({
      url: `${baseUrl}/drinks/${cocktail.slug}`,
      lastModified: cocktail.updated_at ? new Date(cocktail.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    // Category pages
    ...categories.map(category => ({
      url: `${baseUrl}/drinks/category/${slugify(category.name)}`,
      lastModified: category.updated_at ? new Date(category.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    // Ingredient pages
    ...ingredients.map(ingredient => ({
      url: `${baseUrl}/drinks/ingredient/${slugify(ingredient.name)}`,
      lastModified: ingredient.updated_at ? new Date(ingredient.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    // Static pages
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
  ]

  return sitemapEntries
}
