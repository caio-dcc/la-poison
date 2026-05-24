import Link from 'next/link'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { LanguageSelector } from '@/components/LanguageSelector'
import { SmokeBackground } from '@/components/ui/SmokeBackground'
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
    <header className="border-b border-white/8 bg-transparent backdrop-blur-md sticky top-0 z-50 h-16 flex items-center">
      <nav className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between">
        {/* Left: logo + desktop nav */}
        <div className="flex items-center gap-8">
          <Link
            href={`/${locale}`}
            className="font-bold text-xl text-porcelain tracking-wide"
            style={{ fontFamily: 'var(--font-merriweather)' }}
          >
            LaPoison
          </Link>
          {/* Desktop nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <NavigationLinks locale={locale} labels={labels} />
            <AuthNav locale={locale} />
          </div>
        </div>

        {/* Right: desktop language selector + mobile hamburger */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <LanguageSelector currentLocale={locale} />
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
      <SmokeBackground smokeColor="#3A7D44" />
      <Header locale={locale} />
      {children}
      <Footer locale={locale} />
    </LanguageProvider>
  )
}
