'use client'

import { createContext, useState, ReactNode, useCallback } from 'react'

export type Language = 'pt' | 'en' | 'es'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'pt'
  const stored = localStorage.getItem('language') as Language | null
  if (stored && ['pt', 'en', 'es'].includes(stored)) {
    return stored
  }
  const browserLang = navigator.language.split('-')[0]
  return browserLang === 'es' ? 'es' : browserLang === 'en' ? 'en' : 'pt'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage())

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang)
    }
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
