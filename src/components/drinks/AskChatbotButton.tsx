'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

interface AskChatbotButtonProps {
  drinkName: string
  locale: string
}

const buttonLabels = {
  pt: 'Perguntar no chatbot',
  en: 'Ask the chatbot',
  es: 'Preguntar al chatbot',
}

export function AskChatbotButton({ drinkName, locale }: AskChatbotButtonProps) {
  const label = buttonLabels[locale as keyof typeof buttonLabels] || buttonLabels.pt
  const chatbotUrl = `/${locale}/chatbot?question=${encodeURIComponent(`Pergunte-me sobre o ${drinkName}`)}`

  return (
    <Link
      href={chatbotUrl}
      className="w-full bg-gradient-to-r from-hunter-green to-evergreen hover:from-hunter-green/90 hover:to-evergreen/90 text-porcelain font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
    >
      <MessageCircle className="w-4 h-4" />
      {label}
    </Link>
  )
}
