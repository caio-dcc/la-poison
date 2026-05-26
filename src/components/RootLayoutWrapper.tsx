import Link from 'next/link'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { LanguageSelector } from '@/components/LanguageSelector'
import { Footer } from '@/components/Footer'
import { AuthNav } from '@/components/AuthNav'
import { NavigationLinks } from '@/components/NavigationLinks'
import { MobileMenu } from '@/components/MobileMenu'

async function Header({ locale }: { locale: string }) {
  const navigationLabels = {
    pt: {
      drinks: 'Drinks',
      ingredientes: 'Ingredientes',
      pricing: 'Preços',
      chatbot: 'Chatbot',
      about: 'Sobre',
      contact: 'Contato',
      barman: 'Barman',
    },
    en: {
      drinks: 'Drinks',
      ingredientes: 'Ingredients',
      pricing: 'Pricing',
      chatbot: 'Chatbot',
      about: 'About',
      contact: 'Contact',
      barman: 'Bartender',
    },
    es: {
      drinks: 'Bebidas',
      ingredientes: 'Ingredientes',
      pricing: 'Precios',
      chatbot: 'Chatbot',
      about: 'Sobre',
      contact: 'Contacto',
      barman: 'Barman',
    },
  }

  const labels = navigationLabels[locale as keyof typeof navigationLabels] || navigationLabels.pt

  return (
    <header className="border-b border-white/8 bg-[#0a0a0a] sticky top-0 z-50 h-16 flex items-center">
      <nav className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-8">
          <Link
            href={`/${locale}`}
            className="cursor-pointer font-bold text-xl text-porcelain tracking-wide"
            style={{ fontFamily: 'var(--font-merriweather)' }}
          >
            LaPoison
          </Link>
          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <NavigationLinks locale={locale} labels={labels} />
          </div>
        </div>

        {/* Right: desktop language selector + mobile hamburger */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <LanguageSelector currentLocale={locale} />
            <AuthNav locale={locale} />
          </div>
          {/* MobileMenu includes hamburger + drawer with language options */}
          <MobileMenu locale={locale} labels={labels} />
        </div>
      </nav>
    </header>
  )
}

export function RootLayoutWrapper({
  children,
  locale,
}: {
  children: React.ReactNode
  locale: string
}) {
  return (
    <LanguageProvider>
      <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
        <Header locale={locale} />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer locale={locale} />
      </div>
    </LanguageProvider>
  )
}
