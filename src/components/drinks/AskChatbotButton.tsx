'use client'

import Link from 'next/link'
import { MessageCircle, Lock } from 'lucide-react'

interface AskChatbotButtonProps {
  drinkName: string
  locale: string
  isPro: boolean
}

const copy = {
  pt: {
    ask: 'Perguntar no chatbot',
    locked: 'Exclusivo para assinantes',
    lockedSub: 'Assine o plano Pro para desbloquear',
    upgrade: 'Ver planos',
  },
  en: {
    ask: 'Ask the chatbot',
    locked: 'Subscribers only',
    lockedSub: 'Upgrade to Pro to unlock',
    upgrade: 'See plans',
  },
  es: {
    ask: 'Preguntar al chatbot',
    locked: 'Solo para suscriptores',
    lockedSub: 'Suscríbete al plan Pro para desbloquear',
    upgrade: 'Ver planes',
  },
}

export function AskChatbotButton({ drinkName, locale, isPro }: AskChatbotButtonProps) {
  const l = copy[locale as keyof typeof copy] ?? copy.pt
  const promptTexts = {
    pt: `Conte-me tudo sobre o ${drinkName}`,
    en: `Tell me all about ${drinkName}`,
    es: `Cuéntame todo sobre el ${drinkName}`,
  }
  const question = promptTexts[locale as keyof typeof promptTexts] ?? promptTexts.pt
  const chatbotUrl = `/${locale}/chatbot?question=${encodeURIComponent(question)}`
  const upgradeUrl = `/${locale}/precos`

  if (isPro) {
    return (
      <Link
        href={chatbotUrl}
        className="w-full bg-gradient-to-r from-hunter-green to-evergreen hover:from-hunter-green/90 hover:to-evergreen/90 text-porcelain font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
      >
        <MessageCircle className="w-4 h-4" />
        {l.ask}
      </Link>
    )
  }

  return (
    <div className="w-full rounded-lg border border-white/10 bg-white/4 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center shrink-0">
          <Lock className="w-3.5 h-3.5 text-porcelain/50" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-porcelain/80">{l.locked}</p>
          <p className="text-[11px] text-porcelain/40 mt-0.5">{l.lockedSub}</p>
        </div>
        <Link
          href={upgradeUrl}
          className="shrink-0 text-[11px] font-mono font-bold px-3 py-1.5 rounded-md bg-porcelain/10 hover:bg-porcelain/20 text-porcelain/70 hover:text-porcelain transition-colors border border-white/10"
        >
          {l.upgrade}
        </Link>
      </div>
    </div>
  )
}
