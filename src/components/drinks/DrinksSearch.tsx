'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

interface Cocktail {
  id: string
  name: string
  slug: string
  thumb_url: string
  category: string
  abv_estimate?: number
  difficulty?: number
  prep_time_minutes?: number
}

interface FilterOptions {
  categories: string[]
  ingredients: string[]
  difficulties: number[]
  abvRanges: { min: number; max: number }[]
  prepTimes: { min: number; max: number }[]
}

interface Filters {
  search: string
  category: string | null
  difficulty: number | null
  sortBy: 'name' | 'difficulty' | 'abv'
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

  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: null,
    difficulty: null,
    sortBy: 'name',
  })
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    const result = cocktails.filter(drink => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!drink.name.toLowerCase().includes(q) && !drink.category?.toLowerCase().includes(q))
          return false
      }
      if (filters.category && drink.category !== filters.category) return false
      if (filters.difficulty !== null && drink.difficulty !== filters.difficulty) return false
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

  const hasActiveFilters =
    filters.search || filters.category || filters.difficulty !== null || filters.sortBy !== 'name'

  const handleReset = () =>
    setFilters({ search: '', category: null, difficulty: null, sortBy: 'name' })

  return (
    <div>
      {/* Search bar + filter toggle */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-shadow-grey/50 w-4 h-4" />
          <input
            type="text"
            placeholder={dict.searchPlaceholder}
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-evergreen/30 focus:border-evergreen text-shadow-grey"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(f => ({ ...f, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-shadow-grey/40 hover:text-shadow-grey"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-evergreen text-porcelain border-evergreen'
              : 'bg-white text-shadow-grey border-gray-200 hover:border-evergreen/40'
          }`}
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
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sort */}
          <div>
            <label className="block text-xs font-semibold text-evergreen mb-1.5 uppercase tracking-wide">
              {dict.sortBy}
            </label>
            <select
              value={filters.sortBy}
              onChange={e =>
                setFilters(f => ({ ...f, sortBy: e.target.value as Filters['sortBy'] }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-shadow-grey focus:outline-none focus:ring-2 focus:ring-evergreen/30"
            >
              <option value="name">{dict.nameAZ}</option>
              <option value="difficulty">{dict.difficultyLow}</option>
              <option value="abv">{dict.abvHigh}</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-evergreen mb-1.5 uppercase tracking-wide">
              {dict.category}
            </label>
            <select
              value={filters.category || ''}
              onChange={e => setFilters(f => ({ ...f, category: e.target.value || null }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-shadow-grey focus:outline-none focus:ring-2 focus:ring-evergreen/30"
            >
              <option value="">{dict.allCategories}</option>
              {filterOptions.categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          {filterOptions.difficulties.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-evergreen mb-1.5 uppercase tracking-wide">
                {dict.difficulty}
              </label>
              <select
                value={filters.difficulty ?? ''}
                onChange={e =>
                  setFilters(f => ({
                    ...f,
                    difficulty: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-shadow-grey focus:outline-none focus:ring-2 focus:ring-evergreen/30"
              >
                <option value="">{dict.allLevels}</option>
                {filterOptions.difficulties.map(d => (
                  <option key={d} value={d}>
                    {'★'.repeat(d)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset */}
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-shadow-grey border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                {dict.resetFilters}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-shadow-grey/60 mb-4">
        {filtered.length} {dict.of} {cocktails.length} {dict.cocktails}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {filtered.map(cocktail => (
            <Link
              key={cocktail.id}
              href={`/${locale}/drinks/${cocktail.slug}`}
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="aspect-square overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cocktail.thumb_url}
                  alt={cocktail.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={e => {
                    const img = e.currentTarget
                    img.onerror = null
                    img.src =
                      'https://www.thecocktaildb.com/images/media/drink/229s6v1571804529.jpg'
                  }}
                />
              </div>
              <div className="p-2.5">
                <h2 className="font-semibold text-xs text-shadow-grey group-hover:text-evergreen transition-colors line-clamp-2 leading-snug mb-0.5">
                  {cocktail.name}
                </h2>
                <p className="text-[10px] text-shadow-grey/50 truncate">{cocktail.category}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-shadow-grey/60 mb-4">{dict.noCocktailsFound}</p>
          <button
            onClick={handleReset}
            className="px-5 py-2 bg-evergreen text-porcelain rounded-lg text-sm font-medium hover:bg-hunter-green transition-colors"
          >
            {dict.resetFilters}
          </button>
        </div>
      )}
    </div>
  )
}
