import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { createClient as createServerClient } from '@/utils/supabase/server'

const labels = {
  pt: {
    title: 'Inventário — LaPoison',
    heading: 'Inventário',
    selectBar: 'Selecione um bar para gerenciar seu inventário',
    noBars: 'Nenhum bar disponível',
    createBar: 'Criar um bar primeiro',
    selectOne: 'Selecionar',
  },
  en: {
    title: 'Inventory — LaPoison',
    heading: 'Inventory',
    selectBar: 'Select a bar to manage its inventory',
    noBars: 'No bars available',
    createBar: 'Create a bar first',
    selectOne: 'Select',
  },
  es: {
    title: 'Inventario — LaPoison',
    heading: 'Inventario',
    selectBar: 'Selecciona un bar para administrar su inventario',
    noBars: 'Sin bares disponibles',
    createBar: 'Crear un bar primero',
    selectOne: 'Seleccionar',
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

export default async function InventoryPage({ params }: { params: Promise<{ locale: string }> }) {
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
    .select('id, name')
    .eq('creator_id', session.user.id)
    .order('created_at', { ascending: false })

  const userBars = bars || []

  if (userBars.length === 1) {
    redirect(`/${locale}/meus-bares/${userBars[0].id}`)
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-evergreen mb-8">{label.heading}</h1>

        {userBars.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-shadow-grey/60 mb-4">{label.noBars}</p>
            <p className="text-sm text-shadow-grey/60 mb-6">{label.selectBar}</p>
            <a
              href={`/${locale}/meus-bares`}
              className="inline-block bg-hunter-green text-porcelain px-6 py-3 rounded-lg font-semibold hover:bg-evergreen transition-colors"
            >
              {label.createBar}
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-shadow-grey/60 mb-4">{label.selectBar}</p>
            {userBars.map(bar => (
              <a
                key={bar.id}
                href={`/${locale}/meus-bares/${bar.id}`}
                className="block bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-evergreen">{bar.name}</p>
                  <span className="text-evergreen font-semibold">{label.selectOne} →</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
