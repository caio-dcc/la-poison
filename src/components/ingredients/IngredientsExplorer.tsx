'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'

interface Ingredient {
  id: string
  name: string
  slug: string
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
    selected: 'ingrediente(s) selecionado(s)',
    find: 'Encontrar Drinks',
    clear: 'Limpar seleção',
    modalTitle: 'Drinks possíveis',
    modalSubtitle: (n: number) => `${n} drink${n !== 1 ? 's' : ''} encontrado${n !== 1 ? 's' : ''}`,
    close: 'Fechar',
    viewDrink: 'Ver receita',
    exact: 'Exato',
    missing: (n: number) => `falta ${n}`,
    noResults: 'Nenhum drink encontrado com esses ingredientes.',
    selectPrompt: 'Selecione ao menos 1 ingrediente e clique em "Encontrar Drinks".',
    loading: 'Buscando drinks...',
    all: 'Todos',
    withSelected: 'Com selecionados',
  },
  en: {
    search: 'Search ingredients...',
    selected: 'ingredient(s) selected',
    find: 'Find Drinks',
    clear: 'Clear selection',
    modalTitle: 'Possible drinks',
    modalSubtitle: (n: number) => `${n} drink${n !== 1 ? 's' : ''} found`,
    close: 'Close',
    viewDrink: 'View recipe',
    exact: 'Exact',
    missing: (n: number) => `missing ${n}`,
    noResults: 'No drinks found with those ingredients.',
    selectPrompt: 'Select at least 1 ingredient and click "Find Drinks".',
    loading: 'Searching drinks...',
    all: 'All',
    withSelected: 'With selected',
  },
  es: {
    search: 'Buscar ingredientes...',
    selected: 'ingrediente(s) seleccionado(s)',
    find: 'Encontrar Bebidas',
    clear: 'Limpiar selección',
    modalTitle: 'Bebidas posibles',
    modalSubtitle: (n: number) =>
      `${n} bebida${n !== 1 ? 's' : ''} encontrada${n !== 1 ? 's' : ''}`,
    close: 'Cerrar',
    viewDrink: 'Ver receta',
    exact: 'Exacto',
    missing: (n: number) => `faltan ${n}`,
    noResults: 'No se encontraron bebidas con esos ingredientes.',
    selectPrompt: 'Selecciona al menos 1 ingrediente y haz clic en "Encontrar Bebidas".',
    loading: 'Buscando bebidas...',
    all: 'Todos',
    withSelected: 'Con seleccionados',
  },
}

function getIngredientName(ing: Ingredient, locale: string): string {
  const i18n = ing.name_i18n
  if (i18n) {
    return i18n[locale] || i18n.en || ing.name
  }
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
  const modalRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return ingredients
    const q = query.toLowerCase()
    return ingredients.filter(i => getIngredientName(i, locale).toLowerCase().includes(q))
  }, [query, ingredients, locale])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
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
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      }
    } finally {
      setLoading(false)
    }
  }

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [modalOpen])

  return (
    <>
      {/* Search + action bar */}
      <div className="sticky top-16 z-30 bg-porcelain/95 backdrop-blur-sm border-b border-black/5 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={l.search}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-shadow-grey placeholder:text-shadow-grey/40 focus:outline-none focus:ring-2 focus:ring-evergreen/30"
          />
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                className="text-sm text-shadow-grey/60 hover:text-shadow-grey transition-colors whitespace-nowrap"
              >
                {l.clear}
              </button>
            )}
            <button
              onClick={findDrinks}
              disabled={selected.size === 0}
              className="px-5 py-2.5 rounded-xl bg-evergreen text-porcelain text-sm font-semibold hover:bg-hunter-green transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {selected.size > 0 ? `${l.find} (${selected.size} ${l.selected})` : l.find}
            </button>
          </div>
        </div>
      </div>

      {/* Ingredient grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
          {filtered.map(ing => {
            const isSelected = selected.has(ing.id)
            const displayName = getIngredientName(ing, locale)
            return (
              <button
                key={ing.id}
                onClick={() => toggle(ing.id)}
                className={`
                  relative rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-all
                  ${
                    isSelected
                      ? 'bg-evergreen text-porcelain shadow-md ring-2 ring-evergreen/40'
                      : 'bg-white text-shadow-grey hover:bg-evergreen/5 ring-1 ring-black/5 hover:ring-evergreen/20'
                  }
                `}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-porcelain/70" />
                )}
                {displayName}
              </button>
            )
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-shadow-grey/50 py-16 text-sm">{l.noResults}</p>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-evergreen">{l.modalTitle}</h2>
                {!loading && (
                  <p className="text-sm text-shadow-grey/60 mt-0.5">
                    {l.modalSubtitle(results.length)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-shadow-grey/40 hover:text-shadow-grey text-2xl leading-none transition-colors"
                aria-label={l.close}
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-evergreen/20 border-t-evergreen rounded-full animate-spin" />
                </div>
              )}
              {!loading && results.length === 0 && (
                <p className="text-center text-shadow-grey/50 py-16 text-sm">{l.noResults}</p>
              )}
              {!loading && results.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.map(drink => (
                    <Link
                      key={drink.id}
                      href={`/${locale}/drinks/${drink.slug}`}
                      onClick={() => setModalOpen(false)}
                      className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-black/5 hover:ring-evergreen/30 hover:bg-evergreen/5 transition-all group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={drink.thumb_url}
                        alt={drink.name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-evergreen text-sm truncate group-hover:text-hunter-green">
                          {drink.name}
                        </p>
                        <p className="text-xs text-shadow-grey/60 mt-0.5">
                          {drink.matchCount === drink.totalIngredients ? (
                            <span className="text-hunter-green font-medium">{l.exact}</span>
                          ) : (
                            <span>{l.missing(drink.totalIngredients - drink.matchCount)}</span>
                          )}
                          {' · '}
                          {drink.matchCount}/{drink.totalIngredients} ingredientes
                        </p>
                      </div>
                      <span className="text-evergreen/40 group-hover:text-evergreen text-lg transition-colors">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
