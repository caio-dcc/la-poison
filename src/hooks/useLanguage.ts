'use client'

import { useContext } from 'react'
import { LanguageContext } from '@/contexts/LanguageContext'
import { getDictionary } from '@/lib/i18n/dictionaries'

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    return {
      language: 'pt' as const,
      setLanguage: () => {},
      dict: getDictionary('pt'),
    }
  }

  const { language, setLanguage } = context
  const dict = getDictionary(language)

  return {
    language,
    setLanguage,
    dict,
  }
}
