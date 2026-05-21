'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { UpgradeModal } from '@/components/chatbot/UpgradeModal'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type ModelChoice = 'claude' | 'gemini'

const modelLabels: Record<
  ModelChoice,
  { name: string; badge: string; color: string; activeClass: string }
> = {
  claude: {
    name: 'Claude Haiku',
    badge: '🟠',
    color: 'text-orange-300',
    activeClass: 'bg-orange-500/20 border-orange-400/40 text-orange-200',
  },
  gemini: {
    name: 'Gemini Flash',
    badge: '🔵',
    color: 'text-blue-300',
    activeClass: 'bg-blue-500/20 border-blue-400/40 text-blue-200',
  },
}

const welcomeMessages: Record<string, Record<ModelChoice, string>> = {
  pt: {
    claude:
      'Olá! Sou o LaPoison, seu assistente de coquetéis alimentado pelo Claude Haiku. Faça qualquer pergunta sobre ingredientes, técnicas ou receitas! 🍹',
    gemini:
      'Olá! Sou o LaPoison, seu assistente de coquetéis alimentado pelo Gemini Flash. Pergunte-me sobre qualquer coquetel, ingrediente ou técnica! 🍹',
  },
  en: {
    claude:
      "Hi! I'm LaPoison, your cocktail assistant powered by Claude Haiku. Ask me anything about ingredients, techniques, or recipes! 🍹",
    gemini:
      "Hi! I'm LaPoison, your cocktail assistant powered by Gemini Flash. Ask me anything about cocktails, ingredients, or techniques! 🍹",
  },
  es: {
    claude:
      '¡Hola! Soy LaPoison, tu asistente de cócteles impulsado por Claude Haiku. ¡Pregúntame sobre ingredientes, técnicas o recetas! 🍹',
    gemini:
      '¡Hola! Soy LaPoison, tu asistente de cócteles impulsado por Gemini Flash. ¡Pregúntame sobre cualquier cóctel, ingrediente o técnica! 🍹',
  },
}

export function ChatbotInterface({
  locale,
  initialQuestion,
}: {
  locale: string
  initialQuestion?: string
}) {
  const { dict } = useLanguage()
  const [selectedModel, setSelectedModel] = useState<ModelChoice>('claude')

  const getWelcome = (model: ModelChoice) => {
    const localeKey = (locale in welcomeMessages ? locale : 'pt') as keyof typeof welcomeMessages
    return welcomeMessages[localeKey][model]
  }

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: getWelcome('claude') },
  ])
  const [input, setInput] = useState(initialQuestion || '')
  const [isLoading, setIsLoading] = useState(false)
  const [queriesRemaining, setQueriesRemaining] = useState(10)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleSendInitial = async (messageText: string) => {
    const userMessage: Message = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, model: selectedModel, locale }),
      })

      const remaining = response.headers.get('X-RateLimit-Remaining')
      if (remaining !== null && remaining !== '-1') {
        setQueriesRemaining(parseInt(remaining, 10))
      }

      if (!response.ok) {
        if (response.status === 429) {
          setShowUpgradeModal(true)
          setMessages(prev => prev.slice(0, -1))
        } else {
          const errorData = (await response.json()) as { error?: string }
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: errorData.error?.includes('GEMINI_API_KEY')
                ? locale === 'pt'
                  ? '⚠️ A chave da API do Gemini não está configurada. Adicione GEMINI_API_KEY ao .env.'
                  : '⚠️ Gemini API key not configured. Add GEMINI_API_KEY to your .env file.'
                : `${dict.chatbotError}: ${errorData.error || 'Unknown error'}`,
            },
          ])
        }
        setIsLoading(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setIsLoading(false)
        return
      }

      let assistantMessage = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        assistantMessage += text

        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages[newMessages.length - 1].role === 'assistant') {
            newMessages[newMessages.length - 1].content = assistantMessage
          } else {
            newMessages.push({ role: 'assistant', content: assistantMessage })
          }
          return newMessages
        })
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: dict.chatbotError }])
      setIsLoading(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send initial question if provided
  useEffect(() => {
    if (initialQuestion && input === initialQuestion && !isLoading) {
      const timer = setTimeout(() => {
        handleSendInitial(initialQuestion)
      }, 300)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, model: selectedModel, locale }),
      })

      const remaining = response.headers.get('X-RateLimit-Remaining')
      if (remaining !== null && remaining !== '-1') {
        setQueriesRemaining(parseInt(remaining, 10))
      }

      if (!response.ok) {
        if (response.status === 429) {
          setShowUpgradeModal(true)
          setMessages(prev => prev.slice(0, -1))
        } else {
          const errorData = (await response.json()) as { error?: string }
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: errorData.error?.includes('GEMINI_API_KEY')
                ? locale === 'pt'
                  ? '⚠️ A chave da API do Gemini não está configurada. Adicione GEMINI_API_KEY ao .env.'
                  : '⚠️ Gemini API key not configured. Add GEMINI_API_KEY to your .env file.'
                : `${dict.chatbotError}: ${errorData.error || 'Unknown error'}`,
            },
          ])
        }
        setIsLoading(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setIsLoading(false)
        return
      }

      let assistantMessage = ''
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        assistantMessage += text

        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages[newMessages.length - 1].role === 'assistant') {
            newMessages[newMessages.length - 1].content = assistantMessage
          } else {
            newMessages.push({ role: 'assistant', content: assistantMessage })
          }
          return newMessages
        })
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: dict.chatbotError }])
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const inactiveClass =
    'border border-white/10 text-porcelain/50 hover:text-porcelain/80 hover:bg-white/5 transition-all'

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col h-[600px]">
        {/* Model selector header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-evergreen/5 border-b border-gray-100">
          <span className="text-xs text-shadow-grey/50 font-medium mr-1">
            {locale === 'pt' ? 'Modelo:' : locale === 'es' ? 'Modelo:' : 'Model:'}
          </span>
          {(['claude', 'gemini'] as ModelChoice[]).map(m => {
            const info = modelLabels[m]
            const isActive = selectedModel === m
            return (
              <button
                key={m}
                onClick={() => setSelectedModel(m)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                  isActive ? info.activeClass + ' border' : inactiveClass
                }`}
              >
                <span>{info.badge}</span>
                <span>{info.name}</span>
              </button>
            )
          })}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-evergreen text-porcelain rounded-br-sm'
                    : 'bg-gray-100 text-shadow-grey rounded-bl-sm'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-shadow-grey rounded-2xl rounded-bl-sm px-4 py-3">
                <p className="text-sm">{dict.chatbotThinking}</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 p-4 bg-porcelain">
          {queriesRemaining !== -1 && (
            <p className="text-xs text-shadow-grey/60 mb-3">
              {queriesRemaining} {dict.chatbotQueriesRemaining}
            </p>
          )}

          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={dict.chatbotPlaceholder}
              disabled={isLoading}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-evergreen resize-none disabled:bg-gray-50"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-evergreen text-porcelain rounded-xl px-5 py-3 font-medium hover:bg-hunter-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        locale={locale}
      />
    </>
  )
}
