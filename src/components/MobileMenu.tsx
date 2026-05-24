'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileMenuProps {
  locale: string
  labels: {
    drinks: string
    ingredientes: string
    pricing: string
    chatbot: string
    about: string
    contact: string
    barman: string
  }
}

const languages = [
  { code: 'pt', flag: '🇧🇷', label: 'Português' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
]

export function MobileMenu({ locale, labels }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    setOpen(false) // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const getLocaleUrl = (newLocale: string) => {
    const parts = pathname.split('/')
    if (parts[1] && ['pt', 'en', 'es'].includes(parts[1])) {
      parts[1] = newLocale
    } else {
      parts.splice(1, 0, newLocale)
    }
    return parts.join('/')
  }

  const navLinks = [
    { href: `/${locale}/drinks`, label: labels.drinks },
    { href: `/${locale}/ingredientes`, label: labels.ingredientes },
    { href: `/${locale}/chatbot`, label: labels.chatbot },
    { href: `/${locale}/pricing`, label: labels.pricing },
  ]

  const languageLabel = locale === 'pt' ? 'Idioma' : locale === 'es' ? 'Idioma' : 'Language'

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-porcelain/80 hover:text-porcelain hover:bg-white/10 transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay + drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer sliding from the right */}
            <motion.nav
              key="drawer"
              className="fixed top-0 right-0 w-72 z-[100] flex flex-col bg-[#0a0a0a] border-l border-white/10 shadow-2xl"
              style={{ height: '100dvh' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 h-16">
                  <span
                    className="font-bold text-lg text-porcelain"
                    style={{ fontFamily: 'var(--font-merriweather)' }}
                  >
                    LaPoison
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Fechar menu"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-porcelain/70 hover:text-porcelain hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Nav links */}
                <div className="flex flex-col gap-1 px-3 py-4">
                  {navLinks.map(link => {
                    const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-white/15 text-porcelain'
                            : 'text-porcelain/70 hover:text-porcelain hover:bg-white/10'
                        }`}
                      >
                        {link.label}
                      </Link>
                    )
                  })}
                </div>

                {/* Language selector */}
                <div className="px-5 py-4 border-t border-white/10 mt-auto">
                  <p className="text-xs font-semibold text-porcelain/50 uppercase tracking-wider mb-3">
                    {languageLabel}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {languages.map(lang => (
                      <Link
                        key={lang.code}
                        href={getLocaleUrl(lang.code)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          locale === lang.code
                            ? 'bg-white/15 text-porcelain border border-white/20'
                            : 'text-porcelain/70 hover:text-porcelain hover:bg-white/10'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
