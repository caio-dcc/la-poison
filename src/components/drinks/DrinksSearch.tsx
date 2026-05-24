'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { getIngredientName, getCategoryName } from '@/lib/i18n/translate'
import { DrinkShowcaseCard } from '@/components/drinks/DrinkShowcaseCard'

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
  category: string | null
  ingredient: string | null
  alcoholic: 'all' | 'alcoholic' | 'non-alcoholic'
  sortBy: 'name' | 'difficulty' | 'abv'
}

const localLabels = {
  pt: {
    alcoholic: 'Tipo de Coquetel',
    allTypes: 'Todos',
    alcoholicOnly: 'Alcoólicos',
    nonAlcoholicOnly: 'Não Alcoólicos',
    ingredientSelect: 'Todos os Ingredientes',
  },
  en: {
    alcoholic: 'Cocktail Type',
    allTypes: 'All',
    alcoholicOnly: 'Alcoholic',
    nonAlcoholicOnly: 'Non-Alcoholic',
    ingredientSelect: 'All Ingredients',
  },
  es: {
    alcoholic: 'Tipo de Cóctel',
    allTypes: 'Todos',
    alcoholicOnly: 'Alcohólicos',
    nonAlcoholicOnly: 'Sin Alcohol',
    ingredientSelect: 'Todos los Ingredientes',
  },
}

const SELECT_CLS =
  'w-full px-3.5 py-2.5 text-[15px] font-medium border border-white/10 rounded-lg bg-black/60 text-porcelain focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/25 transition-colors'
const LABEL_CLS =
  'block text-[13px] font-mono font-semibold text-porcelain/45 mb-2 uppercase tracking-widest'

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

  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: null,
    ingredient: null,
    alcoholic: 'all',
    sortBy: 'name',
  })
  const [showFilters, setShowFilters] = useState(true)

  const filtered = useMemo(() => {
    const result = cocktails.filter(drink => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!drink.name.toLowerCase().includes(q) && !drink.category?.toLowerCase().includes(q))
          return false
      }
      if (filters.category && drink.category !== filters.category) return false
      if (filters.ingredient) {
        const has = drink.cocktail_ingredients?.some(
          ci => ci.ingredient.slug === filters.ingredient
        )
        if (!has) return false
      }
      if (filters.alcoholic === 'alcoholic' && drink.alcoholic !== true) return false
      if (filters.alcoholic === 'non-alcoholic' && drink.alcoholic === true) return false
      return true
    })
    result.sort((a, b) => {
      if (filters.sortBy === 'name') return a.name.localeCompare(b.name)
      if (filters.sortBy === 'difficulty') return (a.difficulty ?? 99) - (b.difficulty ?? 99)
      if (filters.sortBy === 'abv') return (b.abv_estimate ?? 0) - (a.abv_estimate ?? 0)
      return 0
    })
    return result
  }, [cocktails, filters])

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.category ||
    filters.ingredient ||
    filters.alcoholic !== 'all' ||
    filters.sortBy !== 'name'
  )

  const handleReset = () =>
    setFilters({ search: '', category: null, ingredient: null, alcoholic: 'all', sortBy: 'name' })

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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-porcelain/40 hover:text-porcelain"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${filterBtnCls}`}
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
                      filters.sortBy !== 'name',
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-[11px] font-mono text-porcelain/45 hover:text-porcelain/75 transition-colors"
              >
                <X className="w-3 h-3" />
                {dict.resetFilters}
              </button>
            )}
          </div>

          {/* Filter rows */}
          <div className="bg-[#0e0e0e] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/6">
            {/* Sort */}
            <div className="px-5 py-4">
              <label className={LABEL_CLS}>{dict.sortBy}</label>
              <select
                value={filters.sortBy}
                onChange={e =>
                  setFilters(f => ({ ...f, sortBy: e.target.value as Filters['sortBy'] }))
                }
                className={SELECT_CLS}
              >
                <option value="name">{dict.nameAZ}</option>
                <option value="difficulty">{dict.difficultyLow}</option>
                <option value="abv">{dict.abvHigh}</option>
              </select>
            </div>

            {/* Category */}
            <div className="px-5 py-4">
              <label className={LABEL_CLS}>{dict.category}</label>
              <select
                value={filters.category || ''}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value || null }))}
                className={SELECT_CLS}
              >
                <option value="">{dict.allCategories}</option>
                {filterOptions.categories.map(cat => (
                  <option key={cat} value={cat}>
                    {getCategoryName({ name: cat }, locale)}
                  </option>
                ))}
              </select>
            </div>

            {/* Ingredient */}
            <div className="px-5 py-4">
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

            {/* Alcoholic type */}
            <div className="px-5 py-4">
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
        <span className="text-porcelain/70 font-semibold">{cocktails.length}</span> {dict.cocktails}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
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
            className="px-5 py-2 bg-white/10 text-porcelain rounded-lg text-sm font-medium hover:bg-white/15 transition-colors border border-white/10"
          >
            {dict.resetFilters}
          </button>
        </div>
      )}
    </div>
  )
}
