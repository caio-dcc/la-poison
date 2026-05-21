'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'

export function NavigationLinks({
  locale,
  labels,
}: {
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
}) {
  const pathname = usePathname()

  const links = [
    { href: `/${locale}/drinks`, label: labels.drinks, match: `/${locale}/drinks` },
    {
      href: `/${locale}/ingredientes`,
      label: labels.ingredientes,
      match: `/${locale}/ingredientes`,
    },
    { href: `/${locale}/chatbot`, label: labels.chatbot, match: `/${locale}/chatbot` },
    { href: `/${locale}/pricing`, label: labels.pricing, match: `/${locale}/pricing` },
  ]

  return (
    <>
      {links.map(link => {
        const isActive = pathname === link.match || pathname.startsWith(link.match + '/')
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-base transition-colors relative py-1 ${
              isActive ? 'text-porcelain font-semibold' : 'text-porcelain/80 hover:text-porcelain'
            }`}
          >
            {link.label}
            {isActive && (
              <motion.span
                layoutId="activeUnderline"
                className="absolute left-0 right-0 bottom-0 h-[2px] bg-porcelain rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        )
      })}
    </>
  )
}
