import { Metadata } from 'next'
import Link from 'next/link'
import { generateSEOMetadata, buildCanonicalUrl } from '@/lib/seo/metadata'
import { generateBreadcrumbSchema } from '@/lib/seo/jsonld'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

const localeToLang = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

const pageLabels = {
  pt: {
    title: 'Planos e Preços',
    heading: 'Planos simples e transparentes',
    subheading: 'Comece grátis. Faça upgrade quando quiser chatbot ilimitado.',
    home: 'Home',
    prices: 'Preços',
    faq: 'Perguntas frequentes',
    footer: 'Pagamentos processados com segurança via Stripe. Cancele a qualquer momento.',
  },
  en: {
    title: 'Pricing Plans',
    heading: 'Simple and transparent pricing',
    subheading: 'Start free. Upgrade when you want unlimited chatbot.',
    home: 'Home',
    prices: 'Prices',
    faq: 'Frequently asked questions',
    footer: 'Payments processed securely via Stripe. Cancel anytime.',
  },
  es: {
    title: 'Planes y Precios',
    heading: 'Planes simples y transparentes',
    subheading: 'Comienza gratis. Actualiza cuando quieras chatbot ilimitado.',
    home: 'Inicio',
    prices: 'Precios',
    faq: 'Preguntas frecuentes',
    footer: 'Pagos procesados de forma segura a través de Stripe. Cancela en cualquier momento.',
  },
}

const plans = {
  pt: [
    {
      id: 'free',
      name: 'Grátis',
      price: null,
      priceLabel: 'R$0',
      period: 'para sempre',
      description: 'Para quem quer explorar receitas e experimentar o chatbot.',
      cta: 'Começar grátis',
      ctaHref: '/signup',
      highlight: false,
      features: [
        'Acesso a 425+ receitas de coquetéis',
        'Busca e filtros avançados',
        '3 perguntas/dia no chatbot IA (sem login)',
        '10 perguntas/dia no chatbot IA (com login)',
        'Páginas de ingredientes e categorias',
      ],
      missing: ['Chatbot ilimitado', 'Histórico de conversa', 'Sugestões personalizadas'],
    },
    {
      id: 'pro_monthly',
      name: 'Pro',
      price: 19.9,
      priceLabel: 'R$19,90',
      period: 'por mês',
      description: 'Para entusiastas de coquetelaria que querem o máximo da IA.',
      cta: 'Assinar Pro',
      ctaHref: '/signup?plan=pro_monthly',
      highlight: true,
      badge: 'Mais popular',
      trialLabel: '7 dias grátis',
      features: [
        'Tudo do plano Grátis',
        'Chatbot IA ilimitado',
        'Histórico de conversas',
        'Sugestões personalizadas por ingredientes',
        'Receitas exclusivas Pro',
        'Suporte prioritário',
      ],
      missing: [],
    },
    {
      id: 'pro_annual',
      name: 'Pro Anual',
      price: 159,
      priceLabel: 'R$159',
      period: 'por ano',
      monthlyEquiv: 'R$13,25/mês',
      description: 'Melhor custo-benefício. Economize 33% em relação ao plano mensal.',
      cta: 'Assinar Anual',
      ctaHref: '/signup?plan=pro_annual',
      highlight: false,
      badge: 'Economize 33%',
      trialLabel: '7 dias grátis',
      features: ['Tudo do plano Pro', '2 meses grátis vs. mensal', 'Acesso antecipado a novidades'],
      missing: [],
    },
  ],
  en: [
    {
      id: 'free',
      name: 'Free',
      price: null,
      priceLabel: '$0',
      period: 'forever',
      description: 'For those who want to explore recipes and test the chatbot.',
      cta: 'Start free',
      ctaHref: '/signup',
      highlight: false,
      features: [
        'Access to 425+ cocktail recipes',
        'Advanced search and filters',
        '3 questions/day in AI chatbot (no login)',
        '10 questions/day in AI chatbot (with login)',
        'Ingredient and category pages',
      ],
      missing: ['Unlimited chatbot', 'Chat history', 'Personalized suggestions'],
    },
    {
      id: 'pro_monthly',
      name: 'Pro',
      price: 9.99,
      priceLabel: '$9.99',
      period: 'per month',
      description: 'For cocktail enthusiasts who want the best of AI.',
      cta: 'Subscribe Pro',
      ctaHref: '/signup?plan=pro_monthly',
      highlight: true,
      badge: 'Most popular',
      trialLabel: '7 days free',
      features: [
        'Everything in Free plan',
        'Unlimited AI chatbot',
        'Chat history',
        'Personalized ingredient suggestions',
        'Exclusive Pro recipes',
        'Priority support',
      ],
      missing: [],
    },
    {
      id: 'pro_annual',
      name: 'Pro Annual',
      price: 79.99,
      priceLabel: '$79.99',
      period: 'per year',
      monthlyEquiv: '$6.67/month',
      description: 'Best value. Save 33% compared to monthly plan.',
      cta: 'Subscribe Annual',
      ctaHref: '/signup?plan=pro_annual',
      highlight: false,
      badge: 'Save 33%',
      trialLabel: '7 days free',
      features: [
        'Everything in Pro plan',
        '2 months free vs. monthly',
        'Early access to new features',
      ],
      missing: [],
    },
  ],
  es: [
    {
      id: 'free',
      name: 'Gratis',
      price: null,
      priceLabel: '$0',
      period: 'por siempre',
      description: 'Para quienes quieren explorar recetas y probar el chatbot.',
      cta: 'Comenzar gratis',
      ctaHref: '/signup',
      highlight: false,
      features: [
        'Acceso a más de 425 recetas de cócteles',
        'Búsqueda y filtros avanzados',
        '3 preguntas/día en chatbot de IA (sin iniciar sesión)',
        '10 preguntas/día en chatbot de IA (con iniciar sesión)',
        'Páginas de ingredientes y categorías',
      ],
      missing: ['Chatbot ilimitado', 'Historial de chat', 'Sugerencias personalizadas'],
    },
    {
      id: 'pro_monthly',
      name: 'Pro',
      price: 9.99,
      priceLabel: '$9.99',
      period: 'por mes',
      description: 'Para entusiastas de cócteles que quieren lo mejor de la IA.',
      cta: 'Suscribirse Pro',
      ctaHref: '/signup?plan=pro_monthly',
      highlight: true,
      badge: 'Más popular',
      trialLabel: '7 días gratis',
      features: [
        'Todo en el plan Gratis',
        'Chatbot de IA ilimitado',
        'Historial de chat',
        'Sugerencias personalizadas de ingredientes',
        'Recetas exclusivas Pro',
        'Soporte prioritario',
      ],
      missing: [],
    },
    {
      id: 'pro_annual',
      name: 'Pro Anual',
      price: 79.99,
      priceLabel: '$79.99',
      period: 'por año',
      monthlyEquiv: '$6.67/mes',
      description: 'Mejor valor. Ahorra 33% en comparación con el plan mensual.',
      cta: 'Suscribirse Anual',
      ctaHref: '/signup?plan=pro_annual',
      highlight: false,
      badge: 'Ahorrar 33%',
      trialLabel: '7 días gratis',
      features: [
        'Todo en el plan Pro',
        '2 meses gratis vs. mensual',
        'Acceso anticipado a nuevas funciones',
      ],
      missing: [],
    },
  ],
}

const faqs = {
  pt: [
    {
      q: 'Posso cancelar quando quiser?',
      a: 'Sim. Cancele a qualquer momento pelo painel. Você mantém o acesso Pro até o fim do período pago.',
    },
    {
      q: 'O período de teste precisa de cartão?',
      a: 'Não. Os 7 dias de trial são gratuitos e sem necessidade de cartão de crédito.',
    },
    {
      q: 'O que é o chatbot de mixologia?',
      a: 'Um assistente de IA treinado em milhares de receitas que responde perguntas sobre coquetéis, sugere drinks com os ingredientes que você tem em casa e ensina técnicas de bartending.',
    },
    {
      q: 'Posso usar no celular?',
      a: 'Sim. O LaPoison é mobile-first e funciona em qualquer dispositivo.',
    },
  ],
  en: [
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. Cancel anytime from your dashboard. You keep Pro access until the end of your billing period.',
    },
    {
      q: 'Do I need a card for the trial?',
      a: 'No. The 7-day trial is free and requires no credit card.',
    },
    {
      q: 'What is the mixology chatbot?',
      a: 'An AI assistant trained on thousands of recipes that answers questions about cocktails, suggests drinks based on your available ingredients, and teaches bartending techniques.',
    },
    {
      q: 'Can I use it on mobile?',
      a: 'Yes. LaPoison is mobile-first and works on any device.',
    },
  ],
  es: [
    {
      q: '¿Puedo cancelar en cualquier momento?',
      a: 'Sí. Cancela en cualquier momento desde tu panel de control. Mantienes acceso Pro hasta el final de tu período de facturación.',
    },
    {
      q: '¿Necesito una tarjeta para la prueba?',
      a: 'No. La prueba de 7 días es gratuita y no requiere tarjeta de crédito.',
    },
    {
      q: '¿Qué es el chatbot de mixología?',
      a: 'Un asistente de IA entrenado con miles de recetas que responde preguntas sobre cócteles, sugiere bebidas basadas en tus ingredientes disponibles y enseña técnicas de bartending.',
    },
    {
      q: '¿Puedo usarlo en móvil?',
      a: 'Sí. LaPoison es mobile-first y funciona en cualquier dispositivo.',
    },
  ],
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const locale = params.locale as string
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt

  return generateSEOMetadata(
    {
      title: labels.title,
      description: labels.subheading,
      pathname: `/${locale}/pricing`,
    },
    baseUrl
  )
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-hunter-green shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-300 shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

export default function PricingPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as string
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt
  const planList = plans[locale as keyof typeof plans] || plans.pt
  const faqList = faqs[locale as keyof typeof faqs] || faqs.pt
  const canonicalUrl = buildCanonicalUrl(`/${locale}/pricing`)

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: labels.home, url: `${baseUrl}/${locale}`, position: 1 },
      { name: labels.prices, url: canonicalUrl, position: 2 },
    ],
  })

  return (
    <main className="min-h-screen bg-porcelain">
      <div className="bg-evergreen text-porcelain py-14 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <nav className="text-sm text-porcelain/50 mb-6 text-left">
            <Link href={`/${locale}`} className="hover:text-porcelain transition-colors">
              {labels.home}
            </Link>
            {' / '}
            <span>{labels.prices}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{labels.heading}</h1>
          <p className="text-porcelain/70 text-lg max-w-xl mx-auto">{labels.subheading}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planList.map(plan => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-sm flex flex-col ${
                plan.highlight ? 'ring-2 ring-evergreen shadow-md' : ''
              }`}
            >
              {plan.badge && (
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                    plan.highlight
                      ? 'bg-evergreen text-porcelain'
                      : 'bg-hunter-green text-porcelain'
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              <div className="p-7 flex flex-col flex-1">
                <div className="mb-6">
                  <p className="text-xs font-bold text-hunter-green uppercase tracking-widest mb-1">
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-4xl font-bold text-evergreen">{plan.priceLabel}</span>
                    <span className="text-sm text-shadow-grey/60 mb-1">{plan.period}</span>
                  </div>
                  {'monthlyEquiv' in plan && plan.monthlyEquiv && (
                    <p className="text-xs text-hunter-green font-semibold">{plan.monthlyEquiv}</p>
                  )}
                  {'trialLabel' in plan && plan.trialLabel && (
                    <p className="text-xs text-shadow-grey/60 mt-1">{plan.trialLabel}</p>
                  )}
                  <p className="text-sm text-shadow-grey/70 mt-3">{plan.description}</p>
                </div>

                <Link
                  href={plan.ctaHref}
                  className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors mb-7 ${
                    plan.highlight
                      ? 'bg-evergreen text-porcelain hover:bg-hunter-green'
                      : 'border border-evergreen text-evergreen hover:bg-evergreen hover:text-porcelain'
                  }`}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-2.5 text-sm text-shadow-grey flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map(f => (
                    <li key={f} className="flex items-start gap-2.5 opacity-40">
                      <XIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-shadow-grey/50 mt-6">{labels.footer}</p>
      </div>

      <div className="bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-14">
          <h2 className="text-2xl font-bold text-evergreen text-center mb-10">{labels.faq}</h2>
          <dl className="space-y-6">
            {faqList.map(faq => (
              <div key={faq.q} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                <dt className="font-semibold text-evergreen mb-2">{faq.q}</dt>
                <dd className="text-shadow-grey/80 text-sm leading-relaxed">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </main>
  )
}
