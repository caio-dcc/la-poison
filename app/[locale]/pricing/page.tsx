import { Metadata } from 'next'
import Link from 'next/link'
import { generateSEOMetadata } from '@/lib/seo/metadata'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

const pageLabels = {
  pt: {
    title: 'Planos e Preços',
    description: 'Planos de assinatura LaPoison — em breve.',
    home: 'Home',
    prices: 'Preços',
    badge: 'Em breve',
    heading: 'Planos e Preços',
    sub: 'Estamos finalizando nossos planos de assinatura. Em breve você poderá desbloquear o chatbot de IA ilimitado.',
    back: 'Voltar para o início',
    teaser: [
      'Chatbot de mixologia com IA ilimitado',
      'Histórico de conversas',
      'Sugestões personalizadas por ingredientes',
      'Acesso antecipado a novidades',
    ],
  },
  en: {
    title: 'Pricing Plans',
    description: 'LaPoison subscription plans — coming soon.',
    home: 'Home',
    prices: 'Pricing',
    badge: 'Coming soon',
    heading: 'Pricing Plans',
    sub: 'We are finalizing our subscription plans. Soon you will be able to unlock unlimited AI chatbot access.',
    back: 'Back to home',
    teaser: [
      'Unlimited AI mixology chatbot',
      'Chat history',
      'Personalized ingredient suggestions',
      'Early access to new features',
    ],
  },
  es: {
    title: 'Planes y Precios',
    description: 'Planes de suscripción LaPoison — próximamente.',
    home: 'Inicio',
    prices: 'Precios',
    badge: 'Próximamente',
    heading: 'Planes y Precios',
    sub: 'Estamos finalizando nuestros planes de suscripción. Pronto podrás desbloquear el chatbot de IA ilimitado.',
    back: 'Volver al inicio',
    teaser: [
      'Chatbot de mixología con IA ilimitado',
      'Historial de chat',
      'Sugerencias personalizadas de ingredientes',
      'Acceso anticipado a novedades',
    ],
  },
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
      pathname: `/${locale}/pricing`,
    },
    baseUrl
  )
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-20">
      <div className="max-w-lg w-full text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold uppercase tracking-widest mb-8">
          {labels.badge}
        </span>

        <h1 className="text-4xl md:text-5xl font-serif font-bold text-porcelain mb-5 leading-tight">
          {labels.heading}
        </h1>

        <p className="text-porcelain/55 text-base leading-relaxed mb-10 max-w-sm mx-auto">
          {labels.sub}
        </p>

        <ul className="mb-10 space-y-3 text-left max-w-xs mx-auto">
          {labels.teaser.map(item => (
            <li key={item} className="flex items-center gap-3 text-sm text-porcelain/70 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/8 border border-white/12 text-porcelain/80 text-sm font-medium hover:bg-white/12 hover:text-porcelain transition-colors"
        >
          ← {labels.back}
        </Link>
      </div>
    </main>
  )
}
