import { ImageResponse } from '@vercel/og'
import { createClient } from '@/utils/supabase/server'

interface CocktailIngredientRow {
  cocktails: { thumb_url: string | null } | null
}

interface IngredientQueryRow {
  cocktails: { thumb_url: string | null }[]
}

async function getCocktailCountByIngredient(
  ingredientSlug: string
): Promise<{ count: number; firstImage: string | null }> {
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
      return { count: 0, firstImage: null }
    }

    const { data, error } = await supabase
      .from('cocktail_ingredients')
      .select('cocktails(thumb_url)')
      .eq('ingredient_id', ingredientData.id)
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return { count: 0, firstImage: null }
    }

    const row = data?.[0] as IngredientQueryRow | undefined
    const firstImage = row?.cocktails?.[0]?.thumb_url || null
    return {
      count: data?.length || 0,
      firstImage,
    }
  } catch (err) {
    console.error('Failed to fetch ingredient cocktails:', err)
    return { count: 0, firstImage: null }
  }
}

function formatIngredientName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ingredientName = formatIngredientName(slug)
  const { count, firstImage } = await getCocktailCountByIngredient(slug)

  if (count === 0) {
    return new Response('Not Found', { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const imageBg = firstImage ? `url('${firstImage}')` : 'none'

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '1200px',
        height: '630px',
        background: 'linear-gradient(135deg, #14281D 0%, #355834 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '60px',
        color: '#F1F5F2',
        position: 'relative',
      }}
    >
      {/* Background overlay */}
      {imageBg !== 'none' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: imageBg,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
            zIndex: 0,
          }}
        />
      )}

      {/* Content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Top section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              margin: '0',
              maxWidth: '900px',
              lineHeight: '1.2',
            }}
          >
            Cocktails with {ingredientName}
          </h1>
          <p
            style={{
              fontSize: '36px',
              opacity: 0.9,
              margin: '0',
            }}
          >
            {count} recipe{count !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Bottom section */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: '24px',
          }}
        >
          <div style={{ opacity: 0.8 }}>LaPoison — Cocktail Recipes</div>
          <div
            style={{
              fontSize: '18px',
              opacity: 0.6,
            }}
          >
            {baseUrl.replace('https://', '').replace('http://', '')}
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Content-Type': 'image/png',
      },
    }
  )
}
