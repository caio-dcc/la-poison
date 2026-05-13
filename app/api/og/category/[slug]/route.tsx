import { ImageResponse } from '@vercel/og'
import { createClient } from '@/utils/supabase/server'

interface CocktailRow {
  id: string
  thumb_url: string | null
}

async function getCocktailCount(
  categorySlug: string
): Promise<{ count: number; firstImage: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cocktails')
      .select('id, thumb_url')
      .eq(
        'category',
        categorySlug === 'long-island-iced-tea'
          ? 'Long Island Iced Tea'
          : categorySlug.replace(/-/g, ' ')
      )
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return { count: 0, firstImage: null }
    }

    return {
      count: data?.length || 0,
      firstImage: (data?.[0]?.thumb_url as string | null) || null,
    }
  } catch (err) {
    console.error('Failed to fetch category cocktails:', err)
    return { count: 0, firstImage: null }
  }
}

function formatCategoryName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const categoryName = formatCategoryName(slug)
  const { count, firstImage } = await getCocktailCount(slug)

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
            {categoryName} Cocktails
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
