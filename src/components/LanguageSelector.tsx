'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const languages = [
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
]

export function LanguageSelector({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname()

  const getLocaleUrl = (locale: string) => {
    const parts = pathname.split('/')
    if (parts[1] && ['pt', 'en', 'es'].includes(parts[1])) {
      parts[1] = locale
    } else {
      parts.splice(1, 0, locale)
    }
    return parts.join('/')
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-porcelain/20 overflow-hidden">
      {languages.map(lang => (
        <Link
          key={lang.code}
          href={getLocaleUrl(lang.code)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            currentLocale === lang.code
              ? 'bg-porcelain text-evergreen'
              : 'text-porcelain/60 hover:text-porcelain hover:bg-porcelain/10'
          }`}
        >
          <span>{lang.flag}</span>
          <span className="hidden sm:inline">{lang.label}</span>
        </Link>
      ))}
    </div>
  )
}
