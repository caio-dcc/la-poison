'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  locale: string
}

export function UpgradeModal({ isOpen, onClose, locale }: UpgradeModalProps) {
  const { dict } = useLanguage()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleUpgradeClick = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
          locale,
        }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/${locale}/login`)
          return
        }
        router.push(`/${locale}/pricing`)
        return
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Checkout error:', err)
      router.push(`/${locale}/pricing`)
    } finally {
      setIsLoading(false)
    }
  }

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

        <button
          onClick={handleUpgradeClick}
          disabled={isLoading}
          className="w-full bg-evergreen text-porcelain rounded-lg py-3 font-semibold hover:bg-hunter-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          {isLoading ? 'Loading...' : dict.chatbotUpgrade}
        </button>

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
