'use client'

import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/contexts/LanguageContext'

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
]

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex gap-2">
      {languages.map(lang => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            language === lang.code
              ? 'bg-evergreen text-porcelain font-medium'
              : 'bg-gray-200 text-shadow-grey hover:bg-gray-300'
          }`}
          title={lang.label}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  )
}
