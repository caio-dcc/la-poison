'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { UpgradeModal } from '@/components/chatbot/UpgradeModal'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatbotInterface({ locale }: { locale: string }) {
  const { dict } = useLanguage()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: dict.chatbotWelcome,
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [queriesRemaining, setQueriesRemaining] = useState(10)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // Add user message
    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      // Check rate limit headers
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
              content: `${dict.chatbotError}: ${errorData.error || 'Unknown error'}`,
            },
          ])
        }
        setIsLoading(false)
        return
      }

      // Handle streaming response
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

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col h-[600px]">
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
              className="bg-evergreen text-porcelain rounded-xl px-5 py-3 font-medium hover:bg-hunter-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
