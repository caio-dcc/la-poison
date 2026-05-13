'use client'

import Link from 'next/link'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { LanguageSelector } from '@/components/LanguageSelector'

function Header() {
  return (
    <header className="border-b border-gray-200 bg-porcelain">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-evergreen">
          LaPoison
        </Link>
        <LanguageSelector />
      </nav>
    </header>
  )
}

export function RootLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <Header />
      {children}
    </LanguageProvider>
  )
}
