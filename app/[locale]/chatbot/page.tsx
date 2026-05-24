import { Metadata } from 'next'
import Link from 'next/link'
import { generateSEOMetadata, buildCanonicalUrl } from '@/lib/seo/metadata'
import { generateBreadcrumbSchema } from '@/lib/seo/jsonld'
import { ChatbotInterface } from '@/components/chatbot/ChatbotInterface'

const localeToLang = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

const pageLabels = {
  pt: {
    title: 'Assistente de Coquetéis',
    description: 'Chat com IA para dicas de receitas, ingredientes e técnicas de coquetel',
    heading: 'Assistente de Coquetéis',
    subheading: 'Pergunte qualquer coisa sobre coquetéis e receba respostas instantâneas',
    home: 'Início',
    chatbot: 'Assistente',
  },
  en: {
    title: 'Cocktail Assistant',
    description: 'AI chat for cocktail recipes, ingredients, and techniques',
    heading: 'Cocktail Assistant',
    subheading: 'Ask anything about cocktails and get instant answers',
    home: 'Home',
    chatbot: 'Assistant',
  },
  es: {
    title: 'Asistente de Cócteles',
    description: 'Chat de IA para recetas, ingredientes y técnicas de cócteles',
    heading: 'Asistente de Cócteles',
    subheading: 'Pregunta cualquier cosa sobre cócteles y obtén respuestas instantáneas',
    home: 'Inicio',
    chatbot: 'Asistente',
  },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/chatbot`
  const localeKey = locale as keyof typeof localeToLang
  const lang = (localeToLang[localeKey] || 'pt-BR') as 'pt-BR' | 'en-US' | 'es-ES'

  return generateSEOMetadata(
    {
      title: labels.title,
      description: labels.description,
      pathname,
      locale: lang,
      type: 'website',
    },
    baseUrl
  )
}

export default async function ChatbotPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ question?: string }>
}) {
  const { locale } = await params
  const { question } = await searchParams
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pathname = `/${locale}/chatbot`
  const canonicalUrl = buildCanonicalUrl(pathname)

  const breadcrumbSchema = generateBreadcrumbSchema({
    items: [
      { name: labels.home, url: `${baseUrl}/${locale}`, position: 1 },
      { name: labels.chatbot, url: canonicalUrl, position: 2 },
    ],
  })

  return (
    <main className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <ChatbotInterface locale={locale} initialQuestion={question} />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </main>
  )
}
