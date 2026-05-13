'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
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
  abvMin: number
  abvMax: number
  prepTimeMin: number
  prepTimeMax: number
  sortBy: 'name' | 'difficulty' | 'abv'
}

export function DrinksSearch({
  cocktails,
  filterOptions,
}: {
  cocktails: Cocktail[]
  filterOptions: FilterOptions
}) {
  const { dict } = useLanguage()

  const [filters, setFilters] = useState<Filters>({
    search: '',
    category: null,
    difficulty: null,
    abvMin: 0,
    abvMax: 100,
    prepTimeMin: 0,
    prepTimeMax: 1000,
    sortBy: 'name',
  })

  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    const result = cocktails.filter(drink => {
      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matchesName = drink.name.toLowerCase().includes(q)
        const matchesCategory = drink.category?.toLowerCase().includes(q)
        if (!matchesName && !matchesCategory) return false
      }

      // Category filter
      if (filters.category && drink.category !== filters.category) return false

      // Difficulty filter
      if (filters.difficulty !== null && drink.difficulty !== filters.difficulty) return false

      // ABV range
      if (drink.abv_estimate !== undefined && drink.abv_estimate !== null) {
        if (drink.abv_estimate < filters.abvMin || drink.abv_estimate > filters.abvMax) return false
      }

      // Prep time range
      if (drink.prep_time_minutes !== undefined && drink.prep_time_minutes !== null) {
        if (
          drink.prep_time_minutes < filters.prepTimeMin ||
          drink.prep_time_minutes > filters.prepTimeMax
        )
          return false
      }

      return true
    })

    // Sort
    result.sort((a, b) => {
      if (filters.sortBy === 'name') return a.name.localeCompare(b.name)
      if (filters.sortBy === 'difficulty') {
        const aDiff = a.difficulty ?? 0
        const bDiff = b.difficulty ?? 0
        return aDiff - bDiff
      }
      if (filters.sortBy === 'abv') {
        const aAbv = a.abv_estimate ?? 0
        const bAbv = b.abv_estimate ?? 0
        return bAbv - aAbv
      }
      return 0
    })

    return result
  }, [cocktails, filters])

  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.difficulty !== null ||
    filters.abvMin > 0 ||
    filters.abvMax < 100 ||
    filters.prepTimeMin > 0 ||
    filters.prepTimeMax < 1000 ||
    filters.sortBy !== 'name'

  const handleReset = () => {
    setFilters({
      search: '',
      category: null,
      difficulty: null,
      abvMin: 0,
      abvMax: 100,
      prepTimeMin: 0,
      prepTimeMax: 1000,
      sortBy: 'name',
    })
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-shadow-grey w-5 h-5" />
        <input
          type="text"
          placeholder={dict.searchPlaceholder}
          value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-evergreen"
        />
      </div>

      {/* Filter Toggle & Results Count */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-evergreen text-porcelain rounded-lg hover:bg-hunter-green transition-colors font-medium"
        >
          {showFilters ? dict.hideFilters : dict.showFilters}
        </button>
        <div className="text-sm text-shadow-grey">
          {filtered.length} {dict.of} {cocktails.length} {dict.cocktails}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow-sm space-y-6 border border-gray-200">
          {/* Sort */}
          <div>
            <label className="block text-sm font-semibold text-evergreen mb-2">{dict.sortBy}</label>
            <select
              value={filters.sortBy}
              onChange={e =>
                setFilters({ ...filters, sortBy: e.target.value as Filters['sortBy'] })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-evergreen"
            >
              <option value="name">{dict.nameAZ}</option>
              <option value="difficulty">{dict.difficultyLow}</option>
              <option value="abv">{dict.abvHigh}</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-semibold text-evergreen mb-2">
              {dict.category}
            </label>
            <select
              value={filters.category || ''}
              onChange={e => setFilters({ ...filters, category: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-evergreen"
            >
              <option value="">{dict.allCategories}</option>
              {filterOptions.categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          {filterOptions.difficulties.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-evergreen mb-2">
                {dict.difficulty}
              </label>
              <select
                value={filters.difficulty === null ? '' : filters.difficulty}
                onChange={e =>
                  setFilters({
                    ...filters,
                    difficulty: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-evergreen"
              >
                <option value="">{dict.allLevels}</option>
                {filterOptions.difficulties.map(diff => (
                  <option key={diff} value={diff}>
                    Level {diff}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ABV Range */}
          <div>
            <label className="block text-sm font-semibold text-evergreen mb-2">
              {dict.abv}: {filters.abvMin}–{filters.abvMax}%
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.abvMin}
                onChange={e => setFilters({ ...filters, abvMin: parseInt(e.target.value) })}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filters.abvMax}
                onChange={e => setFilters({ ...filters, abvMax: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          {/* Prep Time Range */}
          <div>
            <label className="block text-sm font-semibold text-evergreen mb-2">
              {dict.prepTime}: {filters.prepTimeMin}–{filters.prepTimeMax} min
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="1000"
                step="5"
                value={filters.prepTimeMin}
                onChange={e => setFilters({ ...filters, prepTimeMin: parseInt(e.target.value) })}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max="1000"
                step="5"
                value={filters.prepTimeMax}
                onChange={e => setFilters({ ...filters, prepTimeMax: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-200 text-shadow-grey rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              {dict.resetFilters}
            </button>
          )}
        </div>
      )}

      {/* Results Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(cocktail => (
            <Link
              key={cocktail.id}
              href={`/drinks/${cocktail.slug}`}
              className="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-square overflow-hidden bg-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cocktail.thumb_url}
                  alt={cocktail.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              </div>
              <div className="p-4 space-y-2">
                <h2 className="font-semibold text-evergreen group-hover:text-hunter-green transition-colors line-clamp-2">
                  {cocktail.name}
                </h2>
                <p className="text-xs text-shadow-grey">{cocktail.category}</p>
                {cocktail.difficulty && (
                  <p className="text-xs text-hunter-green font-medium">
                    Difficulty: {cocktail.difficulty}/5
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-shadow-grey">{dict.noCocktailsFound}</p>
          <button
            onClick={handleReset}
            className="mt-4 px-6 py-2 bg-evergreen text-porcelain rounded-lg hover:bg-hunter-green transition-colors font-medium"
          >
            {dict.resetFilters}
          </button>
        </div>
      )}
    </div>
  )
}
