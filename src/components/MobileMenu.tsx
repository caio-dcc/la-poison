'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
]

const authLabels = {
  pt: { auth: 'Login / Registro' },
  en: { auth: 'Log in / Sign up' },
  es: { auth: 'Login / Registro' },
}

export function MobileMenu({ locale, labels }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

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
  const authLabel = authLabels[locale as keyof typeof authLabels] ?? authLabels.pt

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-porcelain/80 transition-colors hover:bg-white/10 hover:text-porcelain"
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
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-porcelain/70 transition-colors hover:bg-white/10 hover:text-porcelain"
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
                        className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
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
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor="mobile-language-selector">
                      {languageLabel}
                    </label>
                    <select
                      id="mobile-language-selector"
                      value={locale}
                      onChange={event => router.push(getLocaleUrl(event.target.value))}
                      className="min-w-0 flex-1 cursor-pointer rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm font-medium text-porcelain transition-colors hover:border-white/25 focus:border-white/35 focus:outline-none focus:ring-2 focus:ring-white/15"
                    >
                      {languages.map(lang => (
                        <option
                          key={lang.code}
                          value={lang.code}
                          className="cursor-pointer bg-[#0a0a0a]"
                        >
                          {lang.flag} - {lang.label}
                        </option>
                      ))}
                    </select>
                    <Link
                      href={`/${locale}/login`}
                      className="shrink-0 cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-porcelain transition-colors hover:border-white/25 hover:bg-white/10"
                    >
                      {authLabel.auth}
                    </Link>
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
