'use client'

import { usePathname, useRouter } from 'next/navigation'

const languages = [
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
]

export function LanguageSelector({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname()
  const router = useRouter()

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
    <>
      <label className="sr-only" htmlFor="desktop-language-selector">
        Idioma
      </label>
      <select
        id="desktop-language-selector"
        value={currentLocale}
        onChange={event => router.push(getLocaleUrl(event.target.value))}
        className="h-10 w-40 cursor-pointer rounded-lg border border-porcelain/20 bg-black/40 px-3 text-sm font-semibold text-porcelain transition-colors hover:border-porcelain/35 focus:border-porcelain/50 focus:outline-none focus:ring-2 focus:ring-porcelain/15"
        aria-label="Idioma"
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code} className="cursor-pointer">
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>
    </>
  )
}
