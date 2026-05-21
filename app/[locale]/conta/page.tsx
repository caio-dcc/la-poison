import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { createClient as createServerClient } from '@/utils/supabase/server'

const labels = {
  pt: {
    title: 'Minha Conta — LaPoison',
    heading: 'Minha Conta',
    email: 'E-mail',
    subscription: 'Inscrição',
    subscriptionStatus: 'Status da inscrição',
    free: 'Gratuito',
    pro: 'Pro',
    billingPortal: 'Gerenciar cobrança',
    goToPricing: 'Ir para Preços',
    signOut: 'Sair',
    myBars: 'Meus Bares',
    noSubscription: 'Nenhuma',
    resetOn: 'Reseta em',
    favorites: 'Meus Favoritos',
    favoritesDesc: 'Veja e gerencie seus drinks salvos',
  },
  en: {
    title: 'My Account — LaPoison',
    heading: 'My Account',
    email: 'Email',
    subscription: 'Subscription',
    subscriptionStatus: 'Subscription status',
    free: 'Free',
    pro: 'Pro',
    billingPortal: 'Manage billing',
    goToPricing: 'Go to Pricing',
    signOut: 'Sign out',
    myBars: 'My Bars',
    noSubscription: 'None',
    resetOn: 'Resets on',
    favorites: 'My Favorites',
    favoritesDesc: 'View and manage your saved drinks',
  },
  es: {
    title: 'Mi Cuenta — LaPoison',
    heading: 'Mi Cuenta',
    email: 'Correo',
    subscription: 'Suscripción',
    subscriptionStatus: 'Estado de suscripción',
    free: 'Gratuito',
    pro: 'Pro',
    billingPortal: 'Administrar facturación',
    goToPricing: 'Ir a Precios',
    signOut: 'Cerrar sesión',
    myBars: 'Mis Bares',
    noSubscription: 'Ninguno',
    resetOn: 'Se restablece en',
    favorites: 'Mis Favoritos',
    favoritesDesc: 'Ver y administrar tus bebidas guardadas',
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

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const label = labels[locale as keyof typeof labels] || labels.pt

  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/${locale}/login`)
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', session.user.id)
    .single()

  const isProActive = subscription?.status === 'active'
  const resetDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(
        locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US'
      )
    : null

  return (
    <main className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-evergreen mb-8">{label.heading}</h1>

        {/* Account Info Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-shadow-grey/60 mb-1">{label.email}</p>
              <p className="text-lg font-medium text-shadow-grey">{session.user.email}</p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-shadow-grey/60 mb-3">{label.subscriptionStatus}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-evergreen">
                    {isProActive ? label.pro : label.free}
                  </p>
                  {resetDate && (
                    <p className="text-xs text-shadow-grey/60 mt-1">
                      {label.resetOn} {resetDate}
                    </p>
                  )}
                </div>
                {isProActive ? (
                  <a
                    href={`/${locale}/api/stripe/portal`}
                    className="inline-flex items-center gap-2 bg-hunter-green text-porcelain px-4 py-2 rounded-lg font-semibold hover:bg-evergreen transition-colors"
                  >
                    {label.billingPortal}
                  </a>
                ) : (
                  <Link
                    href={`/${locale}/pricing`}
                    className="inline-flex items-center gap-2 bg-hunter-green text-porcelain px-4 py-2 rounded-lg font-semibold hover:bg-evergreen transition-colors"
                  >
                    {label.goToPricing}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href={`/${locale}/meus-bares`}
            className="block bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-lg font-bold text-evergreen">{label.myBars}</p>
            <p className="text-sm text-shadow-grey/60 mt-1">Manage your bars and inventory</p>
          </Link>
          <Link
            href={`/${locale}/chatbot`}
            className="block bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-lg font-bold text-evergreen">Chatbot</p>
            <p className="text-sm text-shadow-grey/60 mt-1">Get drink suggestions</p>
          </Link>
          <Link
            href={`/${locale}/favoritos`}
            className="block bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-lg font-bold text-evergreen">{label.favorites}</p>
            <p className="text-sm text-shadow-grey/60 mt-1">{label.favoritesDesc}</p>
          </Link>
        </div>

        {/* Sign Out */}
        <form action={`/api/auth/logout`} method="POST">
          <button
            type="submit"
            className="text-center w-full py-3 text-red-600 hover:text-red-700 font-semibold transition-colors"
          >
            {label.signOut}
          </button>
        </form>
      </div>
    </main>
  )
}
