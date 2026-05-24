'use client'

import { useState, useMemo, useRef, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import {
  Search,
  X,
  FlaskConical,
  Leaf,
  Droplets,
  Wine,
  Coffee,
  Sparkles,
  Citrus,
  Candy,
  HelpCircle,
  Check,
  Printer,
  GripHorizontal,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'

interface Ingredient {
  id: string
  name: string
  slug: string
  type?: string | null
  name_i18n?: Record<string, string> | null
}

interface DrinkResult {
  id: string
  name: string
  slug: string
  thumb_url: string
  matchCount: number
  totalIngredients: number
}

const labels = {
  pt: {
    search: 'Buscar ingredientes...',
    selected: 'selecionado(s)',
    find: 'Pesquisar Drinks',
    clear: 'Limpar seleção',
    modalTitle: 'Drinks possíveis',
    modalSubtitle: (n: number) => `${n} drink${n !== 1 ? 's' : ''} encontrado${n !== 1 ? 's' : ''}`,
    close: 'Fechar',
    viewDrink: 'Ver receita',
    exact: 'Completo',
    missing: (n: number) => `falta ${n}`,
    noResults: 'Nenhum drink encontrado com esses ingredientes.',
    selectPrompt: 'Selecione ingredientes acima.',
    loading: 'Buscando drinks...',
    heading: 'Explore por Ingredientes',
    subheading: 'Marque o que você tem em casa e descubra os drinks possíveis.',
    total: (n: number) => `${n} ingredientes`,
  },
  en: {
    search: 'Search ingredients...',
    selected: 'selected',
    find: 'Search Drinks',
    clear: 'Clear selection',
    modalTitle: 'Possible drinks',
    modalSubtitle: (n: number) => `${n} drink${n !== 1 ? 's' : ''} found`,
    close: 'Close',
    viewDrink: 'View recipe',
    exact: 'Complete',
    missing: (n: number) => `missing ${n}`,
    noResults: 'No drinks found with those ingredients.',
    selectPrompt: 'Select ingredients above.',
    loading: 'Searching drinks...',
    heading: 'Explore by Ingredients',
    subheading: 'Check what you have at home and discover possible drinks.',
    total: (n: number) => `${n} ingredients`,
  },
  es: {
    search: 'Buscar ingredientes...',
    selected: 'seleccionado(s)',
    find: 'Buscar Bebidas',
    clear: 'Limpiar selección',
    modalTitle: 'Bebidas posibles',
    modalSubtitle: (n: number) =>
      `${n} bebida${n !== 1 ? 's' : ''} encontrada${n !== 1 ? 's' : ''}`,
    close: 'Cerrar',
    viewDrink: 'Ver receta',
    exact: 'Completo',
    missing: (n: number) => `faltan ${n}`,
    noResults: 'No se encontraron bebidas con esos ingredientes.',
    selectPrompt: 'Selecciona ingredientes arriba.',
    loading: 'Buscando bebidas...',
    heading: 'Explorar por Ingredientes',
    subheading: 'Marca lo que tienes en casa y descubre las bebidas posibles.',
    total: (n: number) => `${n} ingredientes`,
  },
}

const TYPE_META: Record<
  string,
  { icon: React.ElementType; iconColor: string; bg: string; border: string; label: string }
> = {
  spirit: {
    icon: FlaskConical,
    iconColor: 'text-[#D4A574]',
    bg: 'bg-[#8B4513]/20',
    border: 'border-[#8B4513]/40',
    label: 'Spirit',
  },
  liqueur: {
    icon: Sparkles,
    iconColor: 'text-purple-300',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
    label: 'Liqueur',
  },
  wine: {
    icon: Wine,
    iconColor: 'text-[#E8A0A7]',
    bg: 'bg-[#722F37]/20',
    border: 'border-[#722F37]/35',
    label: 'Wine',
  },
  vermouth: {
    icon: Wine,
    iconColor: 'text-[#E8A0A7]',
    bg: 'bg-[#722F37]/20',
    border: 'border-[#722F37]/35',
    label: 'Vermouth',
  },
  beer: {
    icon: Wine,
    iconColor: 'text-[#E8C87A]',
    bg: 'bg-[#C68B3C]/20',
    border: 'border-[#C68B3C]/35',
    label: 'Beer',
  },
  juice: {
    icon: Citrus,
    iconColor: 'text-orange-300',
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/30',
    label: 'Juice',
  },
  mixer: {
    icon: Droplets,
    iconColor: 'text-sky-300',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/30',
    label: 'Mixer',
  },
  syrup: {
    icon: Candy,
    iconColor: 'text-pink-300',
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/30',
    label: 'Syrup',
  },
  cordial: {
    icon: Candy,
    iconColor: 'text-pink-300',
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/30',
    label: 'Cordial',
  },
  herb: {
    icon: Leaf,
    iconColor: 'text-emerald-300',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    label: 'Herb',
  },
  spice: {
    icon: Leaf,
    iconColor: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    label: 'Spice',
  },
  bitters: {
    icon: FlaskConical,
    iconColor: 'text-red-300',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    label: 'Bitters',
  },
  coffee: {
    icon: Coffee,
    iconColor: 'text-[#C9A87C]',
    bg: 'bg-[#4B2E1A]/30',
    border: 'border-[#4B2E1A]/45',
    label: 'Coffee',
  },
  other: {
    icon: HelpCircle,
    iconColor: 'text-porcelain/40',
    bg: 'bg-white/6',
    border: 'border-white/12',
    label: 'Other',
  },
}

const DEFAULT_META = TYPE_META.other

function getTypeMeta(type?: string | null) {
  return TYPE_META[(type ?? '').toLowerCase()] ?? DEFAULT_META
}

function getIngredientName(ing: Ingredient, locale: string): string {
  const i18n = ing.name_i18n
  if (i18n) return i18n[locale] || i18n.en || ing.name
  return ing.name
}

export function IngredientsExplorer({
  ingredients,
  locale,
}: {
  ingredients: Ingredient[]
  locale: string
}) {
  const l = labels[locale as keyof typeof labels] ?? labels.pt

  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [results, setResults] = useState<DrinkResult[]>([])
  const [loading, setLoading] = useState(false)
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [, startTransition] = useTransition()
  const modalRef = useRef<HTMLDivElement>(null)
  const widgetInputRef = useRef<HTMLInputElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // Drag state for desktop (≥1366px wide)
  // Uses RAF + direct DOM transform to avoid React re-render on every mousemove
  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const dragPos = useRef({ x: 0, y: 0 })
  const rafId = useRef<number | null>(null)
  // Track whether widget has been dragged (to switch from bottom/right anchor to top/left)
  const [hasDragged, setHasDragged] = useState(false)
  // Neon intro glow — active for 1.8s on mount
  const [neonIntro, setNeonIntro] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setNeonIntro(false), 1800)
    return () => clearTimeout(t)
  }, [])

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (window.innerWidth < 1366) return
    e.preventDefault()
    isDragging.current = true

    const el = widgetRef.current
    if (!el) return

    // Initialize drag position from current rendered position
    const rect = el.getBoundingClientRect()
    dragPos.current = { x: rect.left, y: rect.top }
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    // Switch to absolute top/left anchor once drag starts
    setHasDragged(true)

    function applyTransform(x: number, y: number) {
      if (!el) return
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.style.right = 'auto'
      el.style.bottom = 'auto'
    }

    function onMove(ev: MouseEvent) {
      if (!isDragging.current) return
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
      rafId.current = requestAnimationFrame(() => {
        const ww = window.innerWidth
        const wh = window.innerHeight
        const w = el?.offsetWidth ?? 448
        const h = el?.offsetHeight ?? 60
        const x = Math.max(0, Math.min(ev.clientX - dragOffset.current.x, ww - w))
        const y = Math.max(0, Math.min(ev.clientY - dragOffset.current.y, wh - h))
        dragPos.current = { x, y }
        applyTransform(x, y)
      })
    }

    function onUp() {
      isDragging.current = false
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const printList = useCallback(() => {
    const win = window.open('', '_blank')
    if (!win) return
    const rows = results
      .map(d => {
        const url = `${baseUrl}/${locale}/drinks/${d.slug}`
        const status =
          d.matchCount === d.totalIngredients
            ? '✓ Completo'
            : `falta ${d.totalIngredients - d.matchCount}`
        // Encode as data URL for QR: use a canvas approach via img src from google charts API — no external dep needed
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(url)}`
        return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;vertical-align:middle;">
            <strong style="font-size:14px">${d.name}</strong><br/>
            <span style="font-size:11px;color:#666">${d.matchCount}/${d.totalIngredients} ingredientes · ${status}</span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;vertical-align:middle;width:100px">
            <img src="${qrSrc}" width="72" height="72" alt="QR ${d.name}" style="display:block;margin:0 auto"/>
            <span style="font-size:9px;color:#999;display:block;margin-top:2px">lapoison.com</span>
          </td>
        </tr>`
      })
      .join('')

    win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Drinks Possíveis — La Poison</title>
<style>
  body{font-family:Georgia,serif;color:#111;padding:24px;max-width:700px;margin:0 auto}
  h1{font-size:20px;margin-bottom:4px}
  p.sub{font-size:12px;color:#666;margin-bottom:20px}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#999;padding:6px 8px;border-bottom:2px solid #ddd}
  @media print{body{padding:12px}}
</style>
</head><body>
<h1>Drinks Possíveis</h1>
<p class="sub">Gerado em lapoison.com · ${new Date().toLocaleDateString(locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US')}</p>
<table>
  <thead><tr><th>Drink</th><th style="text-align:center">QR Code</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
    }, 600)
  }, [results, locale, baseUrl])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function findDrinks() {
    if (selected.size === 0) return
    setLoading(true)
    setModalOpen(true)
    setResults([])
    try {
      const ids = Array.from(selected).join(',')
      const res = await fetch(`/api/ingredients/search?ids=${ids}`)
      if (res.ok) setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [modalOpen])

  useEffect(() => {
    if (widgetOpen) {
      setTimeout(() => widgetInputRef.current?.focus(), 50)
    }
  }, [widgetOpen])

  // Search across all languages stored in name_i18n
  const filtered = useMemo(() => {
    if (!query.trim()) return ingredients
    const q = query.toLowerCase()
    return ingredients.filter(ing => {
      if (ing.name.toLowerCase().includes(q)) return true
      if (ing.name_i18n) {
        return Object.values(ing.name_i18n).some(v => v?.toLowerCase().includes(q))
      }
      return false
    })
  }, [query, ingredients])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <style>{`
        @keyframes neon-pulse {
          from { box-shadow: 0 0 10px 2px rgba(57,255,20,0.4), 0 12px 48px rgba(0,0,0,0.75); border-color: rgba(57,255,20,0.7); }
          to   { box-shadow: 0 0 28px 8px rgba(57,255,20,0.75), 0 12px 48px rgba(0,0,0,0.75); border-color: #39FF14; }
        }
      `}</style>
      {/* Header */}
      <div className="w-full px-[15%] pt-10 pb-6">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-porcelain mb-1">
          {l.heading}
        </h1>
        <p className="text-sm font-mono text-porcelain/40">{l.subheading}</p>
      </div>

      {/* Floating search widget */}
      {/* Desktop (≥sm): draggable pill fixed to bottom-right unless dragged */}
      {/* Mobile (<sm): fixed bubble + expandable input */}

      {/* Desktop widget — hidden on mobile */}
      <div
        ref={widgetRef}
        className="hidden sm:flex flex-col items-end gap-0 z-40"
        style={
          hasDragged
            ? { position: 'fixed', bottom: 'auto', right: 'auto', willChange: 'left, top' }
            : { position: 'fixed', top: 72, right: 32 }
        }
      >
        {/* Drag handle bar + input row */}
        <div
          className={`
            flex items-center gap-2.5 bg-[#1a1a1a]/97 backdrop-blur-md rounded-2xl overflow-hidden w-[min(448px,80vw)]
            transition-[border-color,box-shadow] duration-300
            ${
              neonIntro
                ? 'border border-[#39FF14] shadow-[0_0_18px_4px_rgba(57,255,20,0.55),0_12px_48px_rgba(0,0,0,0.75)] animate-neon-pulse'
                : 'border border-white/15 shadow-[0_12px_48px_rgba(0,0,0,0.75)]'
            }
          `}
          style={neonIntro ? { animation: 'neon-pulse 0.45s ease-in-out 4 alternate' } : undefined}
        >
          {/* Drag handle — only shown/active on ≥1366px */}
          <button
            onMouseDown={handleDragStart}
            className="hidden [@media(min-width:1366px)]:flex items-center justify-center pl-4 pr-2 self-stretch shrink-0 cursor-grab active:cursor-grabbing text-porcelain/25 hover:text-porcelain/55 transition-colors"
            aria-label="Move widget"
            tabIndex={-1}
          >
            <GripHorizontal className="w-7 h-7" />
          </button>
          <Search className="w-5 h-5 text-porcelain/35 ml-3.5 [@media(min-width:1366px)]:ml-0 shrink-0" />
          <input
            ref={widgetInputRef}
            type="text"
            value={query}
            onChange={e => startTransition(() => setQuery(e.target.value))}
            placeholder={l.search}
            className="w-full py-[17px] pr-3 bg-transparent text-[19px] text-porcelain placeholder:text-porcelain/25 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                startTransition(() => setQuery(''))
                widgetInputRef.current?.focus()
              }}
              className="mr-2 shrink-0 text-porcelain/30 hover:text-porcelain transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {query && (
            <span className="mr-4 shrink-0 text-[15px] font-mono text-porcelain/40 whitespace-nowrap">
              {filtered.length}
            </span>
          )}
        </div>
      </div>

      {/* Mobile widget — bubble + expandable panel */}
      <div className="sm:hidden fixed bottom-6 right-5 z-40 flex flex-col items-end gap-2">
        {/* Expanded input — visible when open */}
        <div
          className={`
            flex items-center gap-2 bg-[#1a1a1a]/97 backdrop-blur-md border border-white/15
            shadow-[0_8px_32px_rgba(0,0,0,0.75)] rounded-2xl overflow-hidden
            transition-all duration-300 ease-out origin-bottom-right
            ${
              widgetOpen
                ? 'opacity-100 scale-100 w-[min(320px,78vw)] pointer-events-auto'
                : 'opacity-0 scale-90 w-0 pointer-events-none'
            }
          `}
        >
          <Search className="w-5 h-5 text-porcelain/35 ml-3.5 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => startTransition(() => setQuery(e.target.value))}
            placeholder={l.search}
            className="w-full py-4 pr-3 bg-transparent text-[19px] text-porcelain placeholder:text-porcelain/25 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => startTransition(() => setQuery(''))}
              className="mr-2 shrink-0 text-porcelain/30 hover:text-porcelain transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {query && (
            <span className="mr-3.5 shrink-0 text-[15px] font-mono text-porcelain/40 whitespace-nowrap">
              {filtered.length}
            </span>
          )}
        </div>

        {/* Bubble trigger */}
        <button
          onClick={() => setWidgetOpen(v => !v)}
          aria-label={l.search}
          className={`
            relative w-16 h-16 rounded-full flex items-center justify-center
            shadow-[0_6px_28px_rgba(0,0,0,0.65)] border transition-all duration-200 active:scale-95
            ${
              widgetOpen || query
                ? 'bg-hunter-green border-hunter-green/60 text-porcelain'
                : 'bg-[#1a1a1a]/97 border-white/15 text-porcelain/60 hover:text-porcelain hover:border-white/30'
            }
          `}
        >
          {widgetOpen && !query ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
          {query && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-[10px] font-mono font-bold text-white flex items-center justify-center">
              {filtered.length > 99 ? '!' : filtered.length}
            </span>
          )}
        </button>
      </div>

      {/* Ingredient grid */}
      <div className="w-full px-[15%] py-6">
        <p className="text-[13px] font-mono text-porcelain/30 mb-5 tracking-wide">
          <span className="text-porcelain/55 font-semibold">{filtered.length}</span>
          {' / '}
          {l.total(ingredients.length)}
          {selected.size > 0 && (
            <span className="ml-3 text-emerald-400 font-semibold">
              · {selected.size} {l.selected}
            </span>
          )}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-4">
          {filtered.map((ing, index) => {
            const isSelected = selected.has(ing.id)
            const displayName = getIngredientName(ing, locale)
            const meta = getTypeMeta(ing.type)
            const Icon = meta.icon

            return (
              <motion.button
                key={ing.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(index * 0.008, 0.2) }}
                onClick={() => toggle(ing.id)}
                aria-pressed={isSelected}
                className={`
                  relative rounded-2xl p-4 flex flex-col items-center gap-3 border transition-all duration-200 text-center cursor-pointer
                  ${
                    isSelected
                      ? 'bg-hunter-green/30 border-hunter-green/60 shadow-[0_0_20px_rgba(53,88,52,0.35)]'
                      : 'bg-[#111] border-white/8 hover:border-white/20 hover:bg-white/5'
                  }
                `}
              >
                {/* Checkbox indicator — top-right */}
                <span
                  className={`
                    absolute top-2.5 right-2.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200
                    ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-white/5 border-white/15'
                    }
                  `}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>

                {/* Icon container */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border ${meta.bg} ${meta.border}`}
                >
                  <Icon className={`w-6 h-6 ${meta.iconColor}`} aria-hidden="true" />
                </div>

                {/* Name */}
                <span
                  className={`text-[13px] font-medium leading-snug line-clamp-2 w-full ${isSelected ? 'text-porcelain' : 'text-porcelain/70'}`}
                >
                  {displayName}
                </span>

                {/* Type label */}
                {ing.type && (
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider ${meta.iconColor} opacity-60`}
                  >
                    {meta.label}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center font-mono text-porcelain/30 py-20 text-sm">{l.noResults}</p>
        )}
      </div>

      {/* Sticky bottom CTA — visible when items selected */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe-bottom">
          <div className="max-w-lg mx-auto pb-4">
            <button
              onClick={findDrinks}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-hunter-green to-evergreen hover:from-hunter-green/90 hover:to-evergreen/90 text-porcelain text-[16px] font-bold transition-all shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 active:scale-[0.98]"
            >
              <Search className="w-5 h-5" />
              {l.find}
              <span className="ml-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[13px] font-mono font-bold">
                {selected.size}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom padding so last cards aren't hidden by CTA */}
      {selected.size > 0 && <div className="h-24" />}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-6"
          onClick={() => setModalOpen(false)}
        >
          <div
            ref={modalRef}
            className="bg-[#111] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:w-[70vw] sm:max-w-4xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle on mobile */}
            <div className="pt-3 flex justify-center sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-white/8">
              <div>
                <h2 className="text-lg font-serif font-bold text-porcelain">{l.modalTitle}</h2>
                {!loading && (
                  <p className="text-[12px] font-mono text-porcelain/40 mt-0.5">
                    {l.modalSubtitle(results.length)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!loading && results.length > 0 && (
                  <button
                    onClick={printList}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-porcelain/60 hover:text-porcelain text-[13px] font-mono font-medium transition-colors"
                    title={
                      locale === 'pt'
                        ? 'Imprimir lista'
                        : locale === 'es'
                          ? 'Imprimir lista'
                          : 'Print list'
                    }
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {locale === 'pt' ? 'Imprimir' : locale === 'es' ? 'Imprimir' : 'Print'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-porcelain/50 hover:text-porcelain transition-colors"
                  aria-label={l.close}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-2 border-white/10 border-t-porcelain/60 rounded-full animate-spin" />
                </div>
              )}
              {!loading && results.length === 0 && (
                <p className="text-center font-mono text-porcelain/40 py-16 text-sm">
                  {l.noResults}
                </p>
              )}
              {!loading && results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {results.map(drink => {
                    const drinkUrl = `${baseUrl}/${locale}/drinks/${drink.slug}`
                    return (
                      <div
                        key={drink.id}
                        className="flex items-center gap-3 rounded-xl p-3 border border-white/8 hover:border-white/18 hover:bg-white/5 transition-all group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={drink.thumb_url}
                          alt={drink.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <Link
                            href={drinkUrl}
                            onClick={() => setModalOpen(false)}
                            className="font-serif font-semibold text-porcelain text-[15px] truncate block hover:text-porcelain/80 transition-colors"
                          >
                            {drink.name}
                          </Link>
                          <p className="text-[12px] font-mono text-porcelain/40 mt-0.5">
                            {drink.matchCount === drink.totalIngredients ? (
                              <span className="text-emerald-400 font-bold">{l.exact}</span>
                            ) : (
                              <span className="text-amber-400">
                                {l.missing(drink.totalIngredients - drink.matchCount)}
                              </span>
                            )}
                            {' · '}
                            {drink.matchCount}/{drink.totalIngredients}
                          </p>
                        </div>
                        {/* QR Code inline */}
                        <div className="shrink-0 flex flex-col items-center gap-0.5">
                          <QRCodeSVG
                            value={drinkUrl}
                            size={48}
                            bgColor="transparent"
                            fgColor="rgba(241,245,242,0.55)"
                            level="L"
                          />
                          <span className="text-[8px] font-mono text-porcelain/20 tracking-tight">
                            QR
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
