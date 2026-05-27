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
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react'
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
    exact: 'Completo',
    missing: (n: number) => `falta ${n}`,
    noResults: 'Nenhum drink encontrado com esses ingredientes.',
    loading: 'Buscando drinks...',
    heading: 'Explore por Ingredientes',
    subheading: 'Marque o que você tem em casa e descubra os drinks possíveis.',
    total: (n: number) => `${n} ingredientes`,
    colName: 'Nome',
    colType: 'Tipo',
    typeAll: 'Todos',
    selectAll: 'Selecionar todos',
    clearAll: 'Limpar seleção',
    noIngredients: 'Nenhum ingrediente encontrado.',
  },
  en: {
    search: 'Search ingredients...',
    selected: 'selected',
    find: 'Search Drinks',
    clear: 'Clear selection',
    modalTitle: 'Possible drinks',
    modalSubtitle: (n: number) => `${n} drink${n !== 1 ? 's' : ''} found`,
    close: 'Close',
    exact: 'Complete',
    missing: (n: number) => `missing ${n}`,
    noResults: 'No drinks found with those ingredients.',
    loading: 'Searching drinks...',
    heading: 'Explore by Ingredients',
    subheading: 'Check what you have at home and discover possible drinks.',
    total: (n: number) => `${n} ingredients`,
    colName: 'Name',
    colType: 'Type',
    typeAll: 'All',
    selectAll: 'Select all',
    clearAll: 'Clear selection',
    noIngredients: 'No ingredients found.',
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
    exact: 'Completo',
    missing: (n: number) => `faltan ${n}`,
    noResults: 'No se encontraron bebidas con esos ingredientes.',
    loading: 'Buscando bebidas...',
    heading: 'Explorar por Ingredientes',
    subheading: 'Marca lo que tienes en casa y descubre las bebidas posibles.',
    total: (n: number) => `${n} ingredientes`,
    colName: 'Nombre',
    colType: 'Tipo',
    typeAll: 'Todos',
    selectAll: 'Seleccionar todos',
    clearAll: 'Limpiar selección',
    noIngredients: 'No se encontraron ingredientes.',
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

function SortIcon({
  col,
  sortKey,
  sortDir,
}: {
  col: 'name' | 'type'
  sortKey: string
  sortDir: string
}) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
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
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<'name' | 'type'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [results, setResults] = useState<DrinkResult[]>([])
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()
  const modalRef = useRef<HTMLDivElement>(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const uniqueTypes = useMemo(() => {
    const counts = new Map<string, number>()
    ingredients.forEach(ing => {
      const t = ing.type ?? 'other'
      counts.set(t, (counts.get(t) ?? 0) + 1)
    })
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [ingredients])

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = ingredients.filter(ing => {
      if (q) {
        const nameMatch =
          ing.name.toLowerCase().includes(q) ||
          (ing.name_i18n
            ? Object.values(ing.name_i18n).some(v => v?.toLowerCase().includes(q))
            : false)
        if (!nameMatch) return false
      }
      if (typeFilter && (ing.type ?? 'other') !== typeFilter) return false
      return true
    })

    return result.slice().sort((a, b) => {
      let aVal: string, bVal: string
      if (sortKey === 'name') {
        aVal = getIngredientName(a, locale).toLowerCase()
        bVal = getIngredientName(b, locale).toLowerCase()
      } else {
        aVal = (a.type ?? 'other').toLowerCase()
        bVal = (b.type ?? 'other').toLowerCase()
      }
      const cmp = aVal.localeCompare(bVal)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [ingredients, query, typeFilter, sortKey, sortDir, locale])

  const allVisibleSelected =
    filteredAndSorted.length > 0 && filteredAndSorted.every(i => selected.has(i.id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSort(key: 'name' | 'type') {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        filteredAndSorted.forEach(i => next.delete(i.id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filteredAndSorted.forEach(i => next.add(i.id))
        return next
      })
    }
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

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Page header */}
      <div className="w-full px-4 md:px-[10%] pt-10 pb-6">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-porcelain mb-1">
          {l.heading}
        </h1>
        <p className="text-sm font-mono text-porcelain/40">{l.subheading}</p>
      </div>

      {/* Filter bar */}
      <div className="w-full px-4 md:px-[10%] pb-5 flex flex-col gap-4">
        {/* Search input */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-porcelain/35 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => startTransition(() => setQuery(e.target.value))}
            placeholder={l.search}
            className="w-full pl-9 pr-9 py-2.5 bg-[#111] border border-white/10 rounded-xl text-[15px] text-porcelain placeholder:text-porcelain/25 focus:outline-none focus:border-white/30 transition-colors"
          />
          {query && (
            <button
              onClick={() => startTransition(() => setQuery(''))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-porcelain/35 hover:text-porcelain transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-3 py-1.5 rounded-full border font-mono text-[11px] font-medium transition-all cursor-pointer ${
              typeFilter === null
                ? 'bg-porcelain/20 border-porcelain/40 text-porcelain'
                : 'bg-white/5 border-white/10 text-porcelain/50 hover:border-white/20 hover:text-porcelain/70'
            }`}
          >
            {l.typeAll}
            <span className="ml-1.5 text-porcelain/30">{ingredients.length}</span>
          </button>
          {uniqueTypes.map(([type, count]) => {
            const meta = getTypeMeta(type)
            const Icon = meta.icon
            const isActive = typeFilter === type
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(isActive ? null : type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-[11px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? `${meta.bg} ${meta.border} ${meta.iconColor}`
                    : 'bg-white/5 border-white/10 text-porcelain/50 hover:border-white/20 hover:text-porcelain/70'
                }`}
              >
                <Icon className="w-3 h-3" />
                {meta.label}
                <span className="ml-0.5 text-porcelain/30">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats bar */}
      <div className="w-full px-4 md:px-[10%] pb-3 flex items-center justify-between">
        <p className="text-[13px] font-mono text-porcelain/30">
          <span className="text-porcelain/55 font-semibold">{filteredAndSorted.length}</span>
          {' / '}
          {l.total(ingredients.length)}
          {selected.size > 0 && (
            <span className="ml-3 text-emerald-400 font-semibold">
              · {selected.size} {l.selected}
            </span>
          )}
        </p>
        {selected.size > 0 && (
          <button
            onClick={() => setSelected(new Set())}
            className="text-[12px] font-mono text-porcelain/40 hover:text-porcelain/70 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
            {l.clearAll}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="w-full px-4 md:px-[10%] pb-6">
        <div className="rounded-2xl border border-white/8 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8 bg-[#0f0f0f]">
                <th className="w-12 px-4 py-3">
                  <button
                    onClick={toggleSelectAll}
                    className={`flex items-center justify-center w-5 h-5 rounded-md border transition-all cursor-pointer ${
                      allVisibleSelected
                        ? 'bg-emerald-500 border-emerald-400'
                        : 'bg-white/5 border-white/20 hover:bg-white/10'
                    }`}
                    aria-label={l.selectAll}
                  >
                    {allVisibleSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-widest text-porcelain/45 hover:text-porcelain/70 transition-colors cursor-pointer"
                  >
                    {l.colName}
                    <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">
                  <button
                    onClick={() => toggleSort('type')}
                    className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-widest text-porcelain/45 hover:text-porcelain/70 transition-colors cursor-pointer"
                  >
                    {l.colType}
                    <SortIcon col="type" sortKey={sortKey} sortDir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map(ing => {
                const isSelected = selected.has(ing.id)
                const displayName = getIngredientName(ing, locale)
                const meta = getTypeMeta(ing.type)
                const Icon = meta.icon

                return (
                  <tr
                    key={ing.id}
                    onClick={() => toggle(ing.id)}
                    className={`border-b border-white/5 cursor-pointer transition-colors last:border-0 ${
                      isSelected
                        ? 'bg-hunter-green/20 hover:bg-hunter-green/25'
                        : 'hover:bg-white/4'
                    }`}
                  >
                    <td className="w-12 px-4 py-3.5">
                      <span
                        className={`flex items-center justify-center w-5 h-5 rounded-md border transition-all ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400'
                            : 'bg-white/5 border-white/15'
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[14px] font-medium ${isSelected ? 'text-porcelain' : 'text-porcelain/75'}`}
                      >
                        {displayName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      {ing.type && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${meta.bg} ${meta.border} ${meta.iconColor}`}
                        >
                          <Icon className="w-3 h-3" aria-hidden />
                          {meta.label}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredAndSorted.length === 0 && (
            <p className="text-center font-mono text-porcelain/30 py-16 text-sm">
              {l.noIngredients}
            </p>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe-bottom">
          <div className="max-w-lg mx-auto pb-4">
            <button
              onClick={findDrinks}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-hunter-green to-evergreen hover:from-hunter-green/90 hover:to-evergreen/90 text-porcelain text-[16px] font-bold transition-all shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 active:scale-[0.98] cursor-pointer"
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

      {selected.size > 0 && <div className="h-24" />}

      {/* Results modal */}
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
            <div className="pt-3 flex justify-center sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/15" />
            </div>

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
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/6 hover:bg-white/12 border border-white/10 text-porcelain/60 hover:text-porcelain text-[13px] font-mono font-medium transition-colors cursor-pointer"
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
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-porcelain/50 hover:text-porcelain transition-colors cursor-pointer"
                  aria-label={l.close}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

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
