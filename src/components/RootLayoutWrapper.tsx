'use client'

import Link from 'next/link'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { LanguageSelector } from '@/components/LanguageSelector'
import { SmokeBackground } from '@/components/ui/SmokeBackground'

function Header({ locale }: { locale: string }) {
  const navigationLabels = {
    pt: { drinks: 'Drinks', pricing: 'Preços' },
    en: { drinks: 'Drinks', pricing: 'Pricing' },
    es: { drinks: 'Bebidas', pricing: 'Precios' },
  }

  const labels = navigationLabels[locale as keyof typeof navigationLabels] || navigationLabels.pt

  return (
    <header className="border-b border-evergreen/20 bg-evergreen sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href={`/${locale}`}
            className="font-bold text-xl text-porcelain tracking-wide"
            style={{ fontFamily: 'var(--font-merriweather)' }}
          >
            LaPoison
          </Link>
          <Link
            href={`/${locale}/drinks`}
            className="text-sm text-porcelain/80 hover:text-porcelain transition-colors"
          >
            {labels.drinks}
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="text-sm text-porcelain/80 hover:text-porcelain transition-colors"
          >
            {labels.pricing}
          </Link>
        </div>
        <LanguageSelector currentLocale={locale} />
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
      <SmokeBackground smokeColor="#F1F5F2" />
      <Header locale={locale} />
      {children}
    </LanguageProvider>
  )
}
