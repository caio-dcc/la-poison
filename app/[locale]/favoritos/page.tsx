import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { LiquidAurora } from '@/components/ui/liquid-aurora'
import { getCategoryName } from '@/lib/i18n/translate'

interface FavoriteRow {
  cocktail: {
    id: string
    name: string
    slug: string
    thumb_url: string
    category: string
  } | null
}

const labels = {
  pt: {
    title: 'Meus Favoritos — LaPoison',
    heading: 'Meus Favoritos',
    description: 'Seus coquetéis favoritos salvos para rápido acesso.',
    noFavorites: 'Você ainda não salvou nenhum drink como favorito.',
    exploreBtn: 'Explorar Drinks',
    migrationRequired:
      'Aviso: A migration de favoritos não foi aplicada. Por favor, execute o arquivo 007_ratings_and_favorites.sql no console do Supabase.',
  },
  en: {
    title: 'My Favorites — LaPoison',
    heading: 'My Favorites',
    description: 'Your favorite cocktails saved for quick access.',
    noFavorites: 'You have not saved any drinks to your favorites yet.',
    exploreBtn: 'Explore Drinks',
    migrationRequired:
      'Notice: Favorites migration has not been applied. Please run 007_ratings_and_favorites.sql in Supabase console.',
  },
  es: {
    title: 'Mis Favoritos — LaPoison',
    heading: 'Mis Favoritos',
    description: 'Tus cócteles favoritos guardados para un acceso rápido.',
    noFavorites: 'Aún no has guardado ningún cóctel en tus favoritos.',
    exploreBtn: 'Explorar Bebidas',
    migrationRequired:
      'Aviso: No se ha aplicado la migración de favoritos. Ejecute 007_ratings_and_favorites.sql en la consola de Supabase.',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const label = labels[locale as keyof typeof labels] || labels.pt
  return { title: label.title, robots: 'noindex' }
}

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const label = labels[locale as keyof typeof labels] || labels.pt

  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  let favorites: FavoriteRow[] = []
  let migrationError = false

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('cocktail:cocktails(id, name, slug, thumb_url, category)')
      .eq('user_id', session.user.id)

    if (error) {
      if (error.message.includes('relation "favorites" does not exist')) {
        migrationError = true
      } else {
        throw error
      }
    } else {
      favorites = (data || []) as unknown as FavoriteRow[]
    }
  } catch (err) {
    console.error('Error fetching favorites:', err)
  }

  // Filter out any null cocktail joins
  const favoriteDrinks = favorites
    .map(f => f.cocktail)
    .filter((c): c is NonNullable<typeof c> => c !== null)

  return (
    <main className="min-h-screen pt-12 pb-24 relative px-4 flex justify-center">
      <LiquidAurora />

      <div className="max-w-5xl w-full relative z-10 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-porcelain tracking-tight">{label.heading}</h1>
          <p className="text-porcelain/70 text-sm mt-1">{label.description}</p>
        </div>

        {migrationError ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-amber-200 text-sm">
            <p>{label.migrationRequired}</p>
          </div>
        ) : favoriteDrinks.length === 0 ? (
          <div className="bg-evergreen/60 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center gap-4 max-w-md mx-auto">
            <p className="text-porcelain/70 text-sm">{label.noFavorites}</p>
            <Link
              href={`/${locale}/drinks`}
              className="bg-porcelain text-evergreen font-bold px-6 py-2.5 rounded-xl hover:bg-white transition-all text-sm cursor-pointer shadow-md"
            >
              {label.exploreBtn}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {favoriteDrinks.map(drink => {
              const catName = getCategoryName({ name: drink.category }, locale)
              return (
                <Link
                  key={drink.id}
                  href={`/${locale}/drinks/${drink.slug}`}
                  className="group bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl overflow-hidden shadow-sm transition-all hover:-translate-y-0.5 flex flex-col h-full"
                >
                  <div className="aspect-square overflow-hidden bg-white/5 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={drink.thumb_url}
                      alt={drink.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between gap-1 text-porcelain">
                    <h2 className="font-semibold text-xs leading-snug group-hover:text-amber-300 transition-colors line-clamp-2">
                      {drink.name}
                    </h2>
                    <p className="text-[10px] text-porcelain/60 truncate mt-auto">{catName}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
