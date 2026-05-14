'use client'

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react'

export type Language = 'pt' | 'en' | 'es'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function getStoredLanguage(): Language {
  const stored = localStorage.getItem('language') as Language | null
  if (stored && ['pt', 'en', 'es'].includes(stored)) return stored
  const browserLang = navigator.language.split('-')[0]
  return browserLang === 'es' ? 'es' : browserLang === 'en' ? 'en' : 'pt'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always start with 'pt' to match SSR, then hydrate from localStorage
  const [language, setLanguageState] = useState<Language>('pt')

  useEffect(() => {
    const stored = getStoredLanguage()
    if (stored !== 'pt') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(stored)
    }
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }, [])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
