import Link from 'next/link'
import { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo/metadata'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const titles = {
    pt: 'LaPoison — Receitas de Coquetéis, Drinks e Mixologia',
    en: 'LaPoison — Cocktail Recipes, Drinks and Mixology',
    es: 'LaPoison — Recetas de Cócteles, Bebidas y Mixología',
  }

  const descriptions = {
    pt: 'Descubra receitas de coquetéis clássicos e modernos, aprenda mixologia e use nosso chatbot IA para criar drinks personalizados com os ingredientes que você tem em casa.',
    en: 'Discover classic and modern cocktail recipes, learn mixology, and use our AI chatbot to create personalized drinks with the ingredients you have at home.',
    es: 'Descubre recetas de cócteles clásicos y modernos, aprende mixología y usa nuestro chatbot de IA para crear bebidas personalizadas con los ingredientes que tienes en casa.',
  }

  const pathname = `/${locale}`

  return generateSEOMetadata(
    {
      title: titles[locale as keyof typeof titles],
      description: descriptions[locale as keyof typeof descriptions],
      pathname,
    },
    baseUrl
  )
}

const content = {
  pt: {
    heading: 'Bem-vindo ao LaPoison',
    subheading: 'Descubra coquetéis, aprenda mixologia, converse com IA',
    cta: 'Explorar Drinks',
  },
  en: {
    heading: 'Welcome to LaPoison',
    subheading: 'Discover cocktails, learn mixology, chat with AI',
    cta: 'Explore Drinks',
  },
  es: {
    heading: 'Bienvenido a LaPoison',
    subheading: 'Descubre cócteles, aprende mixología, chatea con IA',
    cta: 'Explorar Bebidas',
  },
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const page = content[locale as keyof typeof content] || content.pt

  return (
    <main className="flex-1 text-porcelain">
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <h1
          className="text-5xl md:text-6xl font-bold mb-6"
          style={{ fontFamily: 'var(--font-merriweather)' }}
        >
          {page.heading}
        </h1>
        <p className="text-xl text-porcelain/80 mb-12 max-w-2xl mx-auto">{page.subheading}</p>
        <Link
          href={`/${locale}/drinks`}
          className="inline-block bg-hunter-green text-porcelain px-8 py-4 rounded-lg font-semibold hover:bg-porcelain hover:text-evergreen transition-colors"
        >
          {page.cta}
        </Link>
      </div>
    </main>
  )
}
