import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { createClient as createServerClient } from '@/utils/supabase/server'

const labels = {
  pt: {
    title: 'Meus Bares — LaPoison',
    heading: 'Meus Bares',
    createBar: 'Criar novo bar',
    empty: 'Nenhum bar criado ainda',
    createdAt: 'Criado em',
    items: 'itens',
    viewDetails: 'Ver detalhes',
    sharedBy: 'Compartilhado por',
  },
  en: {
    title: 'My Bars — LaPoison',
    heading: 'My Bars',
    createBar: 'Create new bar',
    empty: 'No bars created yet',
    createdAt: 'Created on',
    items: 'items',
    viewDetails: 'View details',
    sharedBy: 'Shared by',
  },
  es: {
    title: 'Mis Bares — LaPoison',
    heading: 'Mis Bares',
    createBar: 'Crear nuevo bar',
    empty: 'Ningún bar creado',
    createdAt: 'Creado en',
    items: 'artículos',
    viewDetails: 'Ver detalles',
    sharedBy: 'Compartido por',
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

export default async function MyBarsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const label = labels[locale as keyof typeof labels] || labels.pt

  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  const { data: bars } = await supabase
    .from('bars')
    .select('id, name, created_at, creator_id')
    .or(`creator_id.eq.${session.user.id},shared_with.cs.[{"user_id":"${session.user.id}"}]`)
    .order('created_at', { ascending: false })

  const barsWithCount = await Promise.all(
    (bars || []).map(async bar => {
      const { count } = await supabase
        .from('bar_inventory')
        .select('*', { count: 'exact', head: true })
        .eq('bar_id', bar.id)

      return { ...bar, inventory_count: count || 0 }
    })
  )

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-evergreen">{label.heading}</h1>
          <Link
            href={`/${locale}/meus-bares/novo`}
            className="bg-hunter-green text-porcelain px-4 py-2 rounded-lg font-semibold hover:bg-evergreen transition-colors"
          >
            {label.createBar}
          </Link>
        </div>

        {barsWithCount.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-shadow-grey/60 mb-4">{label.empty}</p>
            <Link
              href={`/${locale}/meus-bares/novo`}
              className="inline-block bg-hunter-green text-porcelain px-6 py-3 rounded-lg font-semibold hover:bg-evergreen transition-colors"
            >
              {label.createBar}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {barsWithCount.map(bar => (
              <div
                key={bar.id}
                className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-evergreen">{bar.name}</h2>
                    <p className="text-sm text-shadow-grey/60 mt-1">
                      {label.createdAt}{' '}
                      {new Date(bar.created_at).toLocaleDateString(
                        locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US'
                      )}
                    </p>
                    <p className="text-sm text-shadow-grey/60 mt-1">
                      {bar.inventory_count} {label.items}
                    </p>
                  </div>
                  <Link
                    href={`/${locale}/meus-bares/${bar.id}`}
                    className="text-evergreen hover:text-hunter-green font-semibold transition-colors"
                  >
                    {label.viewDetails} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
