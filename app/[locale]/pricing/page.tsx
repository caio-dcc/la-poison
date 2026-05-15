import { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { generateSEOMetadata, buildCanonicalUrl } from '@/lib/seo/metadata'
import { generateBreadcrumbSchema } from '@/lib/seo/jsonld'
import { PricingClient } from '@/components/pricing/PricingClient'

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
    successMessage: 'Checkout iniciado com sucesso! Redirecionando...',
    errorMessage: 'Erro ao processar checkout. Tente novamente.',
    canceledMessage: 'Checkout cancelado. Sinta-se livre para escolher outro plano.',
  },
  en: {
    title: 'Pricing Plans',
    heading: 'Simple and transparent pricing',
    subheading: 'Start free. Upgrade when you want unlimited chatbot.',
    home: 'Home',
    prices: 'Prices',
    faq: 'Frequently asked questions',
    footer: 'Payments processed securely via Stripe. Cancel anytime.',
    successMessage: 'Checkout started successfully! Redirecting...',
    errorMessage: 'Error processing checkout. Please try again.',
    canceledMessage: 'Checkout canceled. Feel free to choose another plan.',
  },
  es: {
    title: 'Planes y Precios',
    heading: 'Planes simples y transparentes',
    subheading: 'Comienza gratis. Actualiza cuando quieras chatbot ilimitado.',
    home: 'Inicio',
    prices: 'Precios',
    faq: 'Preguntas frecuentes',
    footer: 'Pagos procesados de forma segura a través de Stripe. Cancela en cualquier momento.',
    successMessage: '¡Checkout iniciado con éxito! Redirigiendo...',
    errorMessage: 'Error al procesar el checkout. Intenta de nuevo.',
    canceledMessage: 'Checkout cancelado. Siéntete libre de elegir otro plan.',
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
      priceId: null,
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
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
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
      id: 'pro_yearly',
      name: 'Pro Anual',
      price: 159,
      priceLabel: 'R$159',
      period: 'por ano',
      monthlyEquiv: 'R$13,25/mês',
      description: 'Melhor custo-benefício. Economize 33% em relação ao plano mensal.',
      cta: 'Assinar Anual',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL,
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
      priceId: null,
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
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
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
      id: 'pro_yearly',
      name: 'Pro Annual',
      price: 79.99,
      priceLabel: '$79.99',
      period: 'per year',
      monthlyEquiv: '$6.67/month',
      description: 'Best value. Save 33% compared to monthly plan.',
      cta: 'Subscribe Annual',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL,
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
      priceId: null,
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
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
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
      id: 'pro_yearly',
      name: 'Pro Anual',
      price: 79.99,
      priceLabel: '$79.99',
      period: 'por año',
      monthlyEquiv: '$6.67/mes',
      description: 'Mejor valor. Ahorra 33% en comparación con el plan mensual.',
      cta: 'Suscribirse Anual',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL,
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

      <Suspense fallback={<div className="min-h-[400px]" />}>
        <PricingClient locale={locale} labels={labels} planList={planList} faqList={faqList} />
      </Suspense>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
    </main>
  )
}
