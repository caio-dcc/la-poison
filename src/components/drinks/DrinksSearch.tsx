'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { getIngredientName } from '@/lib/i18n/translate'
import { DrinkShowcaseCard } from '@/components/drinks/DrinkShowcaseCard'
import { IngredientsFilterMobile } from '@/components/drinks/IngredientsFilterMobile'
import {
  dedupeDrinksByName,
  DRINK_CATEGORY_KEYS,
  DRINK_CATEGORY_LABELS,
  drinkMatchesSearch,
  getDrinkCategoryKey,
  isAlcoholicDrink,
  normalizeDrinkText,
  type DrinkCategoryKey,
} from '@/lib/drinks/classification'

interface Cocktail {
  id: string
  name: string
  slug: string
  thumb_url: string
  category: string
  abv_estimate?: number
  difficulty?: number
  prep_time_minutes?: number
  alcoholic?: boolean
  cocktail_ingredients?: Array<{
    ingredient: {
      name: string
      slug: string
      name_i18n?: Record<string, string> | null
    }
  }>
}

interface FilterOptions {
  categories: string[]
  ingredients: Array<{
    name: string
    slug: string
    name_i18n?: Record<string, string> | null
  }>
  abvRanges: { min: number; max: number }[]
  prepTimes: { min: number; max: number }[]
}

interface Filters {
  search: string
  category: DrinkCategoryKey | null
  ingredient: string | null
  alcoholic: 'all' | 'alcoholic' | 'non-alcoholic'
  sortBy: 'popular-desc' | 'popular-asc'
}

const localLabels = {
  pt: {
    alcoholic: 'Tipo de Coquetel',
    allTypes: 'Todos',
    alcoholicOnly: 'Alcoólicos',
    nonAlcoholicOnly: 'Não Alcoólicos',
    ingredientSelect: 'Todos os Ingredientes',
    mostFamous: 'Mais famosos',
    leastFamous: 'Menos famosos',
  },
  en: {
    alcoholic: 'Cocktail Type',
    allTypes: 'All',
    alcoholicOnly: 'Alcoholic',
    nonAlcoholicOnly: 'Non-Alcoholic',
    ingredientSelect: 'All Ingredients',
    mostFamous: 'Most famous',
    leastFamous: 'Least famous',
  },
  es: {
    alcoholic: 'Tipo de Cóctel',
    allTypes: 'Todos',
    alcoholicOnly: 'Alcohólicos',
    nonAlcoholicOnly: 'Sin Alcohol',
    ingredientSelect: 'Todos los Ingredientes',
    mostFamous: 'Más famosos',
    leastFamous: 'Menos famosos',
  },
}

const FAMOUS_DRINK_RANKS: Record<string, number> = {
  mojito: 1,
  margarita: 2,
  'old fashioned': 3,
  martini: 4,
  daiquiri: 5,
  negroni: 6,
  manhattan: 7,
  'whiskey sour': 8,
  'moscow mule': 9,
  'gin tonic': 10,
  'gin and tonic': 10,
  'piña colada': 11,
  'pina colada': 11,
  'mai tai': 12,
  'aperol spritz': 13,
  'bloody mary': 14,
  cosmopolitan: 15,
  caipirinha: 16,
  'cuba libre': 17,
  'long island iced tea': 18,
  'white russian': 19,
  'espresso martini': 20,
  'tom collins': 21,
  'mint julep': 22,
  'french 75': 23,
  'dark and stormy': 24,
  sidecar: 25,
}

const SELECT_CLS =
  'w-full min-w-0 cursor-pointer px-3.5 py-2.5 text-[15px] font-medium border border-white/10 rounded-lg bg-black/60 text-porcelain focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/25 transition-colors'
const LABEL_CLS =
  'block text-[13px] font-mono font-semibold text-porcelain/45 mb-2 uppercase tracking-widest'
const FILTER_CELL_CLS = 'min-w-0 px-5 py-4'

function getFameRank(drink: Cocktail) {
  const normalizedName = normalizeDrinkText(drink.name)
  const exactRank = FAMOUS_DRINK_RANKS[normalizedName]
  if (exactRank) return exactRank

  const partialMatch = Object.entries(FAMOUS_DRINK_RANKS).find(([name]) =>
    normalizedName.includes(name)
  )

  if (partialMatch) return partialMatch[1]

  const numericSourceId = Number.parseInt(drink.id, 10)
  if (Number.isFinite(numericSourceId)) return 1_000 + numericSourceId

  return (
    100_000 +
    Array.from(normalizedName).reduce((total, char, index) => {
      return total + char.charCodeAt(0) * (index + 1)
    }, 0)
  )
}

export function DrinksSearch({
  cocktails,
  filterOptions,
  locale,
}: {
  cocktails: Cocktail[]
  filterOptions: FilterOptions
  locale: string
}) {
  const { dict } = useLanguage()
  const ll = localLabels[locale as keyof typeof localLabels] ?? localLabels.pt
  const categoryLabels = DRINK_CATEGORY_LABELS[locale] ?? DRINK_CATEGORY_LABELS.pt

  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: null,
    ingredient: null,
    alcoholic: 'all',
    sortBy: 'popular-desc',
  })
  const [showFilters, setShowFilters] = useState(true)
  const uniqueCocktails = useMemo(() => dedupeDrinksByName(cocktails), [cocktails])

  const filtered = useMemo(() => {
    const result = uniqueCocktails.filter(drink => {
      if (filters.search && !drinkMatchesSearch(drink, filters.search, locale)) return false
      if (filters.category && getDrinkCategoryKey(drink) !== filters.category) return false
      if (filters.ingredient) {
        const has = drink.cocktail_ingredients?.some(
          ci => ci.ingredient.slug === filters.ingredient
        )
        if (!has) return false
      }
      const isAlcoholic = isAlcoholicDrink(drink)
      if (filters.alcoholic === 'alcoholic' && !isAlcoholic) return false
      if (filters.alcoholic === 'non-alcoholic' && isAlcoholic) return false
      return true
    })
    result.sort((a, b) => {
      const fameDiff = getFameRank(a) - getFameRank(b)
      const orderedDiff = filters.sortBy === 'popular-desc' ? fameDiff : -fameDiff

      return orderedDiff || a.name.localeCompare(b.name)
    })
    return result
  }, [filters, locale, uniqueCocktails])

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.ingredient ||
    filters.alcoholic !== 'all' ||
    filters.sortBy !== 'popular-desc'
  )

  const handleReset = () =>
    setFilters({
      search: '',
      category: null,
      ingredient: null,
      alcoholic: 'all',
      sortBy: 'popular-desc',
    })

  const filterBtnCls =
    showFilters || hasActiveFilters
      ? 'bg-white/15 text-porcelain border-white/20 backdrop-blur-sm'
      : 'bg-black/30 text-porcelain/70 border-white/10 hover:border-white/20 backdrop-blur-sm'

  return (
    <div className="px-[15%]">
      {/* Search bar + filter toggle */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-porcelain/40 w-4 h-4" />
          <input
            type="text"
            placeholder={dict.searchPlaceholder}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 text-porcelain placeholder:text-porcelain/30 backdrop-blur-sm transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(f => ({ ...f, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-porcelain/40 hover:text-porcelain"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${filterBtnCls}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">{dict.filters}</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-porcelain/60 inline-block" />
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-5 rounded-2xl overflow-hidden border border-white/10 backdrop-blur-sm">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-white/4 border-b border-white/8">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4 text-porcelain/40" />
              <span className="text-[11px] font-mono font-semibold text-porcelain/55 uppercase tracking-widest">
                {dict.filters}
              </span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-mono font-bold text-porcelain/90">
                  {
                    [
                      filters.category,
                      filters.ingredient,
                      filters.alcoholic !== 'all',
                      filters.sortBy !== 'popular-desc',
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="flex cursor-pointer items-center gap-1.5 text-[11px] font-mono text-porcelain/45 transition-colors hover:text-porcelain/75"
              >
                <X className="w-3 h-3" />
                {dict.resetFilters}
              </button>
            )}
          </div>

          {/* Filter rows */}
          <div className="grid grid-cols-1 divide-y divide-white/6 bg-[#0e0e0e] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {/* Sort */}
            <div className={FILTER_CELL_CLS}>
              <label className={LABEL_CLS}>{dict.sortBy}</label>
              <select
                value={filters.sortBy}
                onChange={e =>
                  setFilters(f => ({ ...f, sortBy: e.target.value as Filters['sortBy'] }))
                }
                className={SELECT_CLS}
              >
                <option value="popular-desc">{ll.mostFamous}</option>
                <option value="popular-asc">{ll.leastFamous}</option>
              </select>
            </div>

            {/* Category */}
            <div className={FILTER_CELL_CLS}>
              <label className={LABEL_CLS}>{dict.category}</label>
              <select
                value={filters.category || ''}
                onChange={e =>
                  setFilters(f => ({
                    ...f,
                    category: (e.target.value as DrinkCategoryKey) || null,
                  }))
                }
                className={SELECT_CLS}
              >
                <option value="">{dict.allCategories}</option>
                {DRINK_CATEGORY_KEYS.map(cat => (
                  <option key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </option>
                ))}
              </select>
            </div>

            {/* Ingredient — mobile: draggable pills, desktop: dropdown */}
            <div className="min-w-0 sm:px-5 sm:py-4">
              {/* Mobile version (hidden on sm and up) */}
              <div className="sm:hidden col-span-1">
                <IngredientsFilterMobile
                  ingredients={filterOptions.ingredients}
                  selectedSlug={filters.ingredient}
                  onSelect={slug => setFilters(f => ({ ...f, ingredient: slug }))}
                  locale={locale}
                  label={dict.ingredient}
                />
              </div>

              {/* Desktop version (hidden below sm) */}
              <div className="hidden min-w-0 sm:block">
                <label className={LABEL_CLS}>{dict.ingredient}</label>
                <select
                  value={filters.ingredient || ''}
                  onChange={e => setFilters(f => ({ ...f, ingredient: e.target.value || null }))}
                  className={SELECT_CLS}
                >
                  <option value="">{ll.ingredientSelect}</option>
                  {filterOptions.ingredients.map(ing => (
                    <option key={ing.slug} value={ing.slug}>
                      {getIngredientName(ing, locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Alcoholic type */}
            <div className={FILTER_CELL_CLS}>
              <label className={LABEL_CLS}>{ll.alcoholic}</label>
              <select
                value={filters.alcoholic}
                onChange={e =>
                  setFilters(f => ({ ...f, alcoholic: e.target.value as Filters['alcoholic'] }))
                }
                className={SELECT_CLS}
              >
                <option value="all">{ll.allTypes}</option>
                <option value="alcoholic">{ll.alcoholicOnly}</option>
                <option value="non-alcoholic">{ll.nonAlcoholicOnly}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-[12px] font-mono text-porcelain/40 mb-5 tracking-wide">
        <span className="text-porcelain/70 font-semibold">{filtered.length}</span> {dict.of}{' '}
        <span className="text-porcelain/70 font-semibold">{uniqueCocktails.length}</span>{' '}
        {dict.cocktails}
      </p>

      {/* Grid — cards maintain fixed size on desktop */}
      {filtered.length > 0 ? (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3 2xl:grid-cols-3">
          {filtered.map((cocktail, index) => (
            <DrinkShowcaseCard
              key={cocktail.id}
              cocktail={cocktail}
              locale={locale}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-porcelain/60 mb-4">{dict.noCocktailsFound}</p>
          <button
            onClick={handleReset}
            className="cursor-pointer rounded-lg border border-white/10 bg-white/10 px-5 py-2 text-sm font-medium text-porcelain transition-colors hover:bg-white/15"
          >
            {dict.resetFilters}
          </button>
        </div>
      )}
    </div>
  )
}
