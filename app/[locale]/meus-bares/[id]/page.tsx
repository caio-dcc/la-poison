import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { createClient as createServerClient } from '@/utils/supabase/server'

const labels = {
  pt: {
    title: 'Bar — LaPoison',
    heading: 'Inventário',
    empty: 'Nenhum item adicionado',
    addItem: 'Adicionar item',
    quantity: 'Quantidade',
    unit: 'Unidade',
    removeItem: 'Remover',
    backToBars: 'Voltar aos bares',
    unauthorized: 'Você não tem acesso a este bar',
  },
  en: {
    title: 'Bar — LaPoison',
    heading: 'Inventory',
    empty: 'No items added',
    addItem: 'Add item',
    quantity: 'Quantity',
    unit: 'Unit',
    removeItem: 'Remove',
    backToBars: 'Back to bars',
    unauthorized: 'You do not have access to this bar',
  },
  es: {
    title: 'Bar — LaPoison',
    heading: 'Inventario',
    empty: 'Sin artículos agregados',
    addItem: 'Agregar artículo',
    quantity: 'Cantidad',
    unit: 'Unidad',
    removeItem: 'Eliminar',
    backToBars: 'Volver a bares',
    unauthorized: 'No tienes acceso a este bar',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const label = labels[locale as keyof typeof labels] || labels.pt
  return { title: label.title, robots: 'noindex' }
}

interface BarInventoryItem {
  id: string
  ingredient_id: string | null
  custom_name: string | null
  quantity: number
  unit: string
  ingredients: { name: string }[] | null
}

export default async function BarDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const label = labels[locale as keyof typeof labels] || labels.pt

  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  // Check authorization
  const { data: bar } = await supabase
    .from('bars')
    .select('id, name, creator_id, shared_with')
    .eq('id', id)
    .single()

  if (!bar) {
    notFound()
  }

  const isCreator = bar.creator_id === session.user.id
  const isShared =
    Array.isArray(bar.shared_with) &&
    bar.shared_with.some((s: { user_id: string }) => s.user_id === session.user.id)

  if (!isCreator && !isShared) {
    notFound()
  }

  // Fetch inventory
  const { data: inventory } = await supabase
    .from('bar_inventory')
    .select('id, ingredient_id, custom_name, quantity, unit, ingredients(name)')
    .eq('bar_id', id)
    .order('created_at', { ascending: false })

  const items = (inventory || []) as BarInventoryItem[]

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href={`/${locale}/meus-bares`}
            className="text-evergreen hover:text-hunter-green font-semibold transition-colors"
          >
            &larr; {label.backToBars}
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-evergreen">{bar.name}</h1>
          <button className="bg-hunter-green text-porcelain px-4 py-2 rounded-lg font-semibold hover:bg-evergreen transition-colors">
            {label.addItem}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <p className="text-shadow-grey/60 mb-4">{label.empty}</p>
            <button className="inline-block bg-hunter-green text-porcelain px-6 py-3 rounded-lg font-semibold hover:bg-evergreen transition-colors">
              {label.addItem}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-semibold text-evergreen">Item</th>
                  <th className="text-left px-6 py-3 font-semibold text-evergreen">
                    {label.quantity}
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-evergreen">{label.unit}</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-6 py-3 text-shadow-grey">
                      {item.custom_name || item.ingredients?.[0]?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-3 text-shadow-grey">{item.quantity}</td>
                    <td className="px-6 py-3 text-shadow-grey">{item.unit}</td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-red-600 hover:text-red-700 font-semibold transition-colors">
                        {label.removeItem}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
