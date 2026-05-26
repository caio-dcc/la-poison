'use client'

import Link from 'next/link'
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SendHorizontal, SlidersHorizontal, X } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { UpgradeModal } from '@/components/chatbot/UpgradeModal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface DrinkLink {
  name: string
  slug: string
}

interface LinkableDrink extends DrinkLink {
  pattern: RegExp
}

interface DrinkTextMatch {
  start: number
  end: number
  text: string
  slug: string
}

type Personality = 'bartender' | 'sommelier' | 'concise' | 'playful'

const RESPONSE_REVEAL_MAX_MS = 3000
const WORD_BOUNDARY = String.raw`[^\p{L}\p{N}]`
const DRINK_NAME_SEPARATOR = String.raw`(?:[\s'’.\-]+|\s*&\s*|\s+and\s+|\s+e\s+|\s+y\s+)`

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildDrinkNamePattern(name: string) {
  const tokens = name
    .normalize('NFC')
    .trim()
    .split(/[\s&+/.\-]+/)
    .filter(Boolean)

  if (tokens.join('').length < 3) return null

  const drinkPattern = tokens.map(escapeRegExp).join(DRINK_NAME_SEPARATOR)
  return new RegExp(`(^|${WORD_BOUNDARY})(${drinkPattern})(?=$|${WORD_BOUNDARY})`, 'giu')
}

function getLinkableDrinks(drinkLinks: DrinkLink[]): LinkableDrink[] {
  const uniqueBySlug = new Map<string, DrinkLink>()

  for (const drink of drinkLinks) {
    if (drink.name.trim() && drink.slug.trim()) {
      uniqueBySlug.set(drink.slug, { name: drink.name.trim(), slug: drink.slug.trim() })
    }
  }

  return Array.from(uniqueBySlug.values())
    .map(drink => {
      const pattern = buildDrinkNamePattern(drink.name)
      return pattern ? { ...drink, pattern } : null
    })
    .filter((drink): drink is LinkableDrink => drink !== null)
    .sort((a, b) => b.name.length - a.name.length)
}

function findDrinkTextMatches(content: string, drinks: LinkableDrink[]): DrinkTextMatch[] {
  const occupied = new Array(content.length).fill(false) as boolean[]
  const matches: DrinkTextMatch[] = []

  for (const drink of drinks) {
    drink.pattern.lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = drink.pattern.exec(content))) {
      const prefix = match[1] ?? ''
      const text = match[2] ?? ''
      const start = match.index + prefix.length
      const end = start + text.length

      if (!text.trim() || occupied.slice(start, end).some(Boolean)) {
        continue
      }

      for (let index = start; index < end; index += 1) {
        occupied[index] = true
      }

      matches.push({ start, end, text, slug: drink.slug })
    }
  }

  return matches.sort((a, b) => a.start - b.start)
}

function renderAnimatedCharacters(text: string, keyPrefix: string): ReactNode[] {
  return Array.from(text).map((char, index) => (
    <motion.span
      key={`${keyPrefix}-${index}-${char}`}
      initial={{ opacity: 0, y: '0.15em' }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
    >
      {char}
    </motion.span>
  ))
}

interface AutoResizeProps {
  minHeight: number
  maxHeight?: number
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current
      if (!textarea) return

      if (reset) {
        textarea.style.height = `${minHeight}px`
        return
      }

      textarea.style.height = `${minHeight}px`
      const nextHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity))
      textarea.style.height = `${nextHeight}px`
    },
    [minHeight, maxHeight]
  )

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`
  }, [minHeight])

  return { textareaRef, adjustHeight }
}

function AnimatedAssistantText({
  content,
  fontSize,
  locale,
  drinkLinks,
  canComplete,
  onRevealStep,
  onRevealComplete,
}: {
  content: string
  fontSize: number
  locale: string
  drinkLinks: DrinkLink[]
  canComplete: boolean
  onRevealStep?: () => void
  onRevealComplete?: () => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const [visibleLength, setVisibleLength] = useState(() =>
    prefersReducedMotion ? content.length : 0
  )
  const visibleLengthRef = useRef(visibleLength)
  const completedContentRef = useRef('')
  const previousContentRef = useRef(content)
  const linkableDrinks = useMemo(() => getLinkableDrinks(drinkLinks), [drinkLinks])

  useEffect(() => {
    visibleLengthRef.current = visibleLength
  }, [visibleLength])

  useEffect(() => {
    let frameId = 0

    if (prefersReducedMotion) {
      frameId = requestAnimationFrame(() => setVisibleLength(content.length))
      return () => cancelAnimationFrame(frameId)
    }

    let currentVisibleLength = visibleLengthRef.current

    if (!content.startsWith(previousContentRef.current)) {
      currentVisibleLength = 0
      visibleLengthRef.current = 0
      completedContentRef.current = ''
      setVisibleLength(0)
    }

    previousContentRef.current = content

    const startLength = Math.min(currentVisibleLength, content.length)
    const targetLength = content.length
    const charsToReveal = targetLength - startLength

    if (charsToReveal <= 0) return

    const startedAt = performance.now()
    const duration = Math.min(RESPONSE_REVEAL_MAX_MS, Math.max(900, charsToReveal * 12))

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1)
      const nextLength = startLength + Math.ceil(charsToReveal * progress)
      setVisibleLength(current => Math.max(current, Math.min(nextLength, targetLength)))

      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [content, prefersReducedMotion])

  useEffect(() => {
    onRevealStep?.()
  }, [onRevealStep, visibleLength])

  useEffect(() => {
    if (!canComplete || visibleLength < content.length || completedContentRef.current === content) {
      return
    }

    completedContentRef.current = content
    onRevealComplete?.()
  }, [canComplete, content, onRevealComplete, visibleLength])

  const visibleContent = content.slice(0, visibleLength)
  const drinkMatches = findDrinkTextMatches(visibleContent, linkableDrinks)
  const renderedContent: ReactNode[] = []
  let cursor = 0

  drinkMatches.forEach((match, index) => {
    const plainText = visibleContent.slice(cursor, match.start)

    if (plainText) {
      renderedContent.push(
        <span key={`text-${index}`}>{renderAnimatedCharacters(plainText, `text-${index}`)}</span>
      )
    }

    renderedContent.push(
      <Link
        key={`drink-${match.slug}-${match.start}`}
        href={`/${locale}/drinks/${match.slug}`}
        className="cursor-pointer font-semibold text-evergreen underline decoration-evergreen/70 underline-offset-2 transition-colors hover:text-hunter-green hover:decoration-hunter-green"
      >
        {renderAnimatedCharacters(match.text, `drink-${match.slug}-${match.start}`)}
      </Link>
    )

    cursor = match.end
  })

  const remainingText = visibleContent.slice(cursor)
  if (remainingText) {
    renderedContent.push(
      <span key="text-remaining">{renderAnimatedCharacters(remainingText, 'text-remaining')}</span>
    )
  }

  return (
    <p className="whitespace-pre-wrap break-words" style={{ fontSize: `${fontSize}px` }}>
      {renderedContent}
    </p>
  )
}

const personalityLabels: Record<
  Personality,
  Record<string, { name: string; option: string; detail: string }>
> = {
  bartender: {
    pt: {
      name: 'Bartender',
      option: 'Bartender — casual, prático e acolhedor',
      detail:
        'Fala como quem está atrás do balcão: sugere clássicos, monta drinks com o que você tem em casa, explica técnicas de forma simples e conta a história por trás de cada receita.',
    },
    en: {
      name: 'Bartender',
      option: 'Bartender — casual, practical and welcoming',
      detail:
        'Talks like someone behind the bar: suggests classics, builds drinks from what you have at home, explains techniques in plain language, and shares the story behind each recipe.',
    },
    es: {
      name: 'Bartender',
      option: 'Bartender — casual, práctico y acogedor',
      detail:
        'Habla como quien está detrás de la barra: sugiere clásicos, arma tragos con lo que tienes en casa, explica técnicas de forma sencilla y cuenta la historia de cada receta.',
    },
  },
  sommelier: {
    pt: {
      name: 'Sommelier',
      option: 'Sommelier — elegante, técnico e refinado',
      detail:
        'Responde com tom formal e preciso: destaca harmonizações, perfil aromático dos destilados, proporções ideais e nuances sensoriais para quem quer aprofundar em mixologia.',
    },
    en: {
      name: 'Sommelier',
      option: 'Sommelier — elegant, technical and refined',
      detail:
        'Responds in a formal, precise tone: highlights pairings, spirit flavor profiles, ideal proportions, and sensory nuances for those who want to go deeper into mixology.',
    },
    es: {
      name: 'Sommelier',
      option: 'Sommelier — elegante, técnico y refinado',
      detail:
        'Responde con tono formal y preciso: destaca maridajes, perfil aromático de los destilados, proporciones ideales y matices sensoriales para quien quiera profundizar en mixología.',
    },
  },
  concise: {
    pt: {
      name: 'Conciso',
      option: 'Conciso — direto, objetivo e rápido',
      detail:
        'Vai direto ao ponto: receita resumida, ingredientes, medidas e passos essenciais. Ideal quando você quer uma resposta curta, sem rodeios nem histórias extras.',
    },
    en: {
      name: 'Concise',
      option: 'Concise — direct, objective and fast',
      detail:
        'Gets straight to the point: summarized recipe, ingredients, measures, and essential steps. Ideal when you want a short answer without extra stories.',
    },
    es: {
      name: 'Conciso',
      option: 'Conciso — directo, objetivo y rápido',
      detail:
        'Va directo al grano: receta resumida, ingredientes, medidas y pasos esenciales. Ideal cuando quieres una respuesta corta, sin rodeos ni historias extra.',
    },
  },
  playful: {
    pt: {
      name: 'Divertido',
      option: 'Divertido — leve, animado e bem-humorado',
      detail:
        'Responde com energia e humor: traz curiosidades divertidas, sugestões criativas para festas e um tom descontraído, perfeito para explorar coquetéis de forma leve.',
    },
    en: {
      name: 'Playful',
      option: 'Playful — light, lively and witty',
      detail:
        'Responds with energy and humor: shares fun facts, creative party suggestions, and a relaxed tone — perfect for exploring cocktails in a lighthearted way.',
    },
    es: {
      name: 'Divertido',
      option: 'Divertido — ligero, animado y con humor',
      detail:
        'Responde con energía y humor: trae curiosidades divertidas, sugerencias creativas para fiestas y un tono relajado, perfecto para explorar cócteles de forma ligera.',
    },
  },
}

const welcomeMessages: Record<string, Record<Personality, string>> = {
  pt: {
    bartender:
      'E aí! Sou o Buky, seu bartender aqui no balcão. Me conta o que você está a fim: posso indicar um clássico, criar algo com o que você tem em casa ou contar a história por trás de qualquer drink.',
    sommelier:
      'Seja bem-vindo. Sou Buky, seu sommelier de coquetéis. Estou à disposição para orientá-lo em receitas clássicas, harmonizações refinadas e nuances sensoriais da mixologia.',
    concise: 'Buky aqui. Receitas, ingredientes, técnicas. Manda a pergunta.',
    playful:
      'Salve! Sou o Buky, seu parceiro de drinks favorito. Bora descobrir um coquetel novo, salvar uma festa ou conversar sobre o mundo dos destilados?',
  },
  en: {
    bartender:
      "Hey there! I'm Buky, your bartender behind the counter. Tell me what you're in the mood for: I can recommend a classic, build something with what you have at home, or share the story behind any drink.",
    sommelier:
      'Welcome. I am Buky, your cocktail sommelier. I am at your disposal to guide you through classic recipes, refined pairings, and the sensory nuances of mixology.',
    concise: 'Buky here. Recipes, ingredients, techniques. Hit me with the question.',
    playful:
      "Hey! I'm Buky, your favorite drinks buddy. Want to discover a new cocktail, save a party, or nerd out about the world of spirits?",
  },
  es: {
    bartender:
      '¡Hola! Soy Buky, tu bartender detrás del mostrador. Cuéntame qué te apetece: puedo recomendarte un clásico, crear algo con lo que tengas en casa o contarte la historia detrás de cualquier trago.',
    sommelier:
      'Bienvenido. Soy Buky, su sommelier de cócteles. Estoy a su disposición para orientarle en recetas clásicas, maridajes refinados y matices sensoriales de la mixología.',
    concise: 'Buky aquí. Recetas, ingredientes, técnicas. Dispara la pregunta.',
    playful:
      '¡Hey! Soy Buky, tu mejor amigo del mundo de los tragos. ¿Descubrimos un cóctel nuevo, salvamos una fiesta o hablamos del mundo de los destilados?',
  },
}

const chatTitleLabels: Record<string, { title: string; subtitle: string }> = {
  pt: {
    title: 'Fale com Buky,',
    subtitle:
      'nossa inteligência artificial disposta a te ajudar a extrair o melhor do mundo da coquetelaria e mixologia.',
  },
  en: {
    title: 'Talk to Buky,',
    subtitle:
      'our artificial intelligence ready to help you get the best out of the world of cocktails and mixology.',
  },
  es: {
    title: 'Habla con Buky,',
    subtitle:
      'nuestra inteligencia artificial dispuesta a ayudarte a extraer lo mejor del mundo de la coctelería y la mixología.',
  },
}

const fontSizeLabels: Record<string, { label: string; decrease: string; increase: string }> = {
  pt: { label: 'Tamanho do texto', decrease: 'Diminuir texto', increase: 'Aumentar texto' },
  en: { label: 'Text size', decrease: 'Decrease text', increase: 'Increase text' },
  es: { label: 'Tamaño del texto', decrease: 'Reducir texto', increase: 'Aumentar texto' },
}

const settingsLabels: Record<string, { title: string; trigger: string }> = {
  pt: { title: 'Filtros e personalidade', trigger: 'Abrir filtros e personalidade' },
  en: { title: 'Filters and personality', trigger: 'Open filters and personality' },
  es: { title: 'Filtros y personalidad', trigger: 'Abrir filtros y personalidad' },
}

const personalityOptions: Personality[] = ['bartender', 'sommelier', 'concise', 'playful']

export function ChatbotInterface({
  locale,
  initialQuestion,
}: {
  locale: string
  initialQuestion?: string
}) {
  const { dict } = useLanguage()
  const [personality, setPersonality] = useState<Personality>('bartender')
  const [messageFontSize, setMessageFontSize] = useState(14)
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 52,
    maxHeight: 150,
  })
  const initialQuestionSentRef = useRef(false)

  const getWelcome = (p: Personality) => {
    const localeKey = (locale in welcomeMessages ? locale : 'pt') as keyof typeof welcomeMessages
    return welcomeMessages[localeKey][p]
  }

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: getWelcome('bartender') },
  ])
  const [input, setInput] = useState(initialQuestion || '')
  const [isLoading, setIsLoading] = useState(false)
  const [queriesRemaining, setQueriesRemaining] = useState(10)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showMobileSettings, setShowMobileSettings] = useState(false)
  const [flashingAssistantIndex, setFlashingAssistantIndex] = useState<number | null>(null)
  const [drinkLinks, setDrinkLinks] = useState<DrinkLink[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localeKey = (locale in welcomeMessages ? locale : 'pt') as keyof typeof welcomeMessages
  const scrollToLatestMessage = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadDrinkLinks = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('cocktails')
          .select('name, slug')
          .order('name', { ascending: true })
          .limit(1000)

        if (!error && isMounted) {
          setDrinkLinks(
            (data ?? []).filter((drink): drink is DrinkLink => {
              return typeof drink.name === 'string' && typeof drink.slug === 'string'
            })
          )
        }
      } catch (error) {
        console.error('Error loading drink links:', error)
      }
    }

    loadDrinkLinks()

    return () => {
      isMounted = false
    }
  }, [])

  const sendMessage = async (messageText: string) => {
    const trimmedMessage = messageText.trim()
    if (!trimmedMessage || isLoading) return

    const userMessage: Message = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedMessage, locale, personality }),
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
                  ? 'A chave da API do Gemini não está configurada. Adicione GEMINI_API_KEY ao .env.'
                  : 'Gemini API key not configured. Add GEMINI_API_KEY to your .env file.'
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
    scrollToLatestMessage()
  }, [messages, scrollToLatestMessage])

  useEffect(() => {
    if (initialQuestion && !initialQuestionSentRef.current && !isLoading) {
      initialQuestionSentRef.current = true
      const timer = setTimeout(() => {
        sendMessage(initialQuestion)
        setInput('')
        adjustHeight(true)
      }, 300)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, isLoading])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return
    const nextMessage = input
    setInput('')
    adjustHeight(true)
    sendMessage(nextMessage)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      form?.requestSubmit()
    }
  }

  const handlePersonalityChange = (p: Personality) => {
    setPersonality(p)
    if (messages.length === 1 && messages[0].role === 'assistant') {
      setMessages([{ role: 'assistant', content: getWelcome(p) }])
    }
  }

  const selectedPersonality = personalityLabels[personality][localeKey]
  const chatTitle = chatTitleLabels[locale] ?? chatTitleLabels.pt
  const fontSizeLabel = fontSizeLabels[locale] ?? fontSizeLabels.pt
  const settingsLabel = settingsLabels[locale] ?? settingsLabels.pt

  const settingsPanel = (variant: 'desktop' | 'mobile') => (
    <div
      className={cn(
        'rounded-2xl border border-porcelain/10 bg-black/45 p-4 shadow-xl backdrop-blur-md sm:p-5',
        variant === 'desktop' && 'flex h-full flex-col',
        variant === 'mobile' && 'w-[min(360px,82vw)]'
      )}
    >
      {variant === 'mobile' && (
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-porcelain/10 pb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-porcelain/55">
            {settingsLabel.title}
          </p>
          <button
            type="button"
            onClick={() => setShowMobileSettings(false)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-porcelain/65 transition-colors hover:bg-white/10 hover:text-porcelain"
            aria-label={
              locale === 'pt'
                ? 'Fechar filtros'
                : locale === 'es'
                  ? 'Cerrar filtros'
                  : 'Close filters'
            }
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <label
        htmlFor={`chat-personality-${variant}`}
        className="mb-3 block text-xs font-semibold uppercase tracking-[0.24em] text-porcelain/55"
      >
        {locale === 'pt' ? 'Personalidade' : locale === 'es' ? 'Personalidad' : 'Personality'}
      </label>
      <select
        id={`chat-personality-${variant}`}
        value={personality}
        onChange={event => handlePersonalityChange(event.target.value as Personality)}
        className="w-full cursor-pointer rounded-xl border border-porcelain/15 bg-black/60 px-4 py-4 text-base text-porcelain outline-none transition-colors hover:border-porcelain/30 focus:border-hunter-green focus:ring-2 focus:ring-hunter-green/50 sm:text-lg"
      >
        {personalityOptions.map(option => {
          const info = personalityLabels[option][localeKey]

          return (
            <option
              key={option}
              value={option}
              className="cursor-pointer bg-[#0a0a0a] py-2 text-base text-porcelain"
            >
              {info.option}
            </option>
          )
        })}
      </select>
      <p className="mt-3 text-sm leading-relaxed text-porcelain/70">{selectedPersonality.detail}</p>

      <div
        className={cn(
          'mt-4 border-t border-porcelain/10 pt-4',
          variant === 'desktop' ? 'flex flex-col gap-3' : 'hidden'
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-porcelain/55">
          {fontSizeLabel.label}: {messageFontSize}px
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMessageFontSize(size => Math.max(12, size - 1))}
            className="h-9 min-w-9 cursor-pointer rounded-lg border-porcelain/15 bg-black/45 px-3 text-porcelain hover:bg-porcelain/10"
            aria-label={fontSizeLabel.decrease}
          >
            -
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMessageFontSize(size => Math.min(24, size + 1))}
            className="h-9 min-w-9 cursor-pointer rounded-lg border-porcelain/15 bg-black/45 px-3 text-porcelain hover:bg-porcelain/10"
            aria-label={fontSizeLabel.increase}
          >
            +
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0a] text-porcelain">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(53,88,52,0.55),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,40,29,0.8),transparent_42%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.35),rgba(10,10,10,0.78))]" />

        <div className="relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col px-3 py-4 sm:px-5 md:w-[82vw] md:max-w-[82vw] md:px-6 md:py-6">
          <div className="mb-4 text-center">
            <h1 className="text-3xl font-semibold text-porcelain sm:text-4xl">{chatTitle.title}</h1>
            <p className="mx-auto mt-2 max-w-3xl text-sm leading-relaxed text-porcelain/70 sm:text-base">
              {chatTitle.subtitle}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
            <aside className="hidden w-[19rem] shrink-0 md:block">{settingsPanel('desktop')}</aside>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-porcelain/10 bg-black/45 shadow-2xl backdrop-blur-md">
              <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6">
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        onAnimationEnd={() => {
                          if (flashingAssistantIndex === idx) setFlashingAssistantIndex(null)
                        }}
                        className={cn(
                          'max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed shadow-lg sm:max-w-[78%]',
                          msg.role === 'user'
                            ? 'rounded-br-sm border border-porcelain/10 bg-hunter-green text-porcelain'
                            : 'rounded-bl-sm border border-porcelain/20 bg-porcelain text-shadow-grey',
                          msg.role === 'assistant' &&
                            flashingAssistantIndex === idx &&
                            'buky-evergreen-border-flash'
                        )}
                        style={{ fontSize: `${messageFontSize}px` }}
                      >
                        {msg.role === 'assistant' ? (
                          <AnimatedAssistantText
                            content={msg.content}
                            fontSize={messageFontSize}
                            locale={locale}
                            drinkLinks={drinkLinks}
                            canComplete={!isLoading || idx < messages.length - 1}
                            onRevealStep={scrollToLatestMessage}
                            onRevealComplete={() => setFlashingAssistantIndex(idx)}
                          />
                        ) : (
                          <p
                            className="whitespace-pre-wrap break-words"
                            style={{ fontSize: `${messageFontSize}px` }}
                          >
                            {msg.content}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div
                        className="rounded-2xl rounded-bl-sm border border-porcelain/20 bg-porcelain px-4 py-3 text-shadow-grey shadow-lg"
                        style={{ fontSize: `${messageFontSize}px` }}
                      >
                        {dict.chatbotThinking}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="border-t border-porcelain/10 bg-black/45 p-3 sm:p-4">
                {queriesRemaining !== -1 && (
                  <p className="mb-3 text-xs text-porcelain/55">
                    {queriesRemaining} {dict.chatbotQueriesRemaining}
                  </p>
                )}

                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl border border-porcelain/15 bg-black/60 shadow-xl backdrop-blur-md"
                >
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={event => {
                      setInput(event.target.value)
                      adjustHeight()
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={dict.chatbotPlaceholder}
                    disabled={isLoading}
                    className="min-h-[52px] resize-none border-none bg-transparent px-4 py-3 text-porcelain placeholder:text-porcelain/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                    style={{ overflow: 'hidden', fontSize: `${messageFontSize}px` }}
                  />

                  <div className="flex items-center justify-end px-3 pb-3">
                    <Button
                      type="submit"
                      size="icon"
                      disabled={isLoading || !input.trim()}
                      className="h-11 w-11 rounded-xl border border-porcelain/10 bg-hunter-green text-porcelain hover:bg-evergreen"
                      aria-label={
                        locale === 'pt'
                          ? 'Enviar mensagem'
                          : locale === 'es'
                            ? 'Enviar mensaje'
                            : 'Send message'
                      }
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-2 md:hidden">
          <div
            className={cn(
              'origin-bottom-right transition-all duration-300 ease-out',
              showMobileSettings
                ? 'pointer-events-auto scale-100 opacity-100'
                : 'pointer-events-none scale-90 opacity-0'
            )}
          >
            {settingsPanel('mobile')}
          </div>

          <button
            type="button"
            onClick={() => setShowMobileSettings(open => !open)}
            aria-label={settingsLabel.trigger}
            aria-expanded={showMobileSettings}
            className={cn(
              'relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border shadow-[0_6px_28px_rgba(0,0,0,0.65)] transition-all duration-200 active:scale-95',
              showMobileSettings
                ? 'border-hunter-green/60 bg-hunter-green text-porcelain'
                : 'border-white/15 bg-[#1a1a1a]/97 text-porcelain/60 hover:border-white/30 hover:text-porcelain'
            )}
          >
            {showMobileSettings ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </section>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        locale={locale}
      />
    </>
  )
}
