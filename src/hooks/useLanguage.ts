'use client'

import { useContext } from 'react'
import { LanguageContext } from '@/contexts/LanguageContext'
import { getDictionary } from '@/lib/i18n/dictionaries'

export function useLanguage() {
  const context = useContext(LanguageContext)
  const language = context?.language ?? 'pt'
  const setLanguage = context?.setLanguage ?? (() => {})
  const dict = getDictionary(language)
  return { language, setLanguage, dict }
}
