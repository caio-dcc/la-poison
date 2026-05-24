import type { Metadata } from 'next'
import { RootLayoutWrapper } from '@/components/RootLayoutWrapper'
import '../globals.css'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'
const localeToLang = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
}

export async function generateStaticParams() {
  return [{ locale: 'pt' }, { locale: 'en' }, { locale: 'es' }]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: localeRaw } = await params
  const locale = localeRaw as keyof typeof localeToLang
  const lang = localeToLang[locale] || 'pt-BR'

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

  return {
    title: {
      default: titles[locale],
      template: `%s | LaPoison`,
    },
    description: descriptions[locale],
    metadataBase: new URL(baseUrl),
    openGraph: {
      type: 'website',
      locale: lang,
      siteName: 'LaPoison',
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  const lang = localeToLang[locale as keyof typeof localeToLang] || 'pt-BR'

  return (
    <html lang={lang} className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&family=Merriweather+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col relative bg-evergreen">
        <RootLayoutWrapper locale={locale}>{children}</RootLayoutWrapper>
      </body>
    </html>
  )
}
