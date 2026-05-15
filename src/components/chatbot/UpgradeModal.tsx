'use client'

import Link from 'next/link'
import { X } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  locale: string
}

export function UpgradeModal({ isOpen, onClose, locale }: UpgradeModalProps) {
  const { dict } = useLanguage()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-shadow-grey/60 hover:text-shadow-grey transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-evergreen mb-2">{dict.chatbotLimitReached}</h2>
        <p className="text-shadow-grey/80 text-sm mb-6">
          You&apos;ve used your daily queries. Upgrade to Pro for unlimited access to the chatbot
          assistant.
        </p>

        <Link
          href={`/${locale}/pricing`}
          className="w-full bg-evergreen text-porcelain rounded-lg py-3 font-semibold hover:bg-hunter-green transition-colors text-center block mb-3"
        >
          {dict.chatbotUpgrade}
        </Link>

        <button
          onClick={onClose}
          className="w-full border border-gray-300 text-shadow-grey rounded-lg py-3 font-medium hover:bg-gray-50 transition-colors"
        >
          Continue Tomorrow
        </button>
      </div>
    </div>
  )
}
