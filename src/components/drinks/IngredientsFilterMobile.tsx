'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, GripHorizontal } from 'lucide-react'
import { getIngredientName } from '@/lib/i18n/translate'

interface Ingredient {
  name: string
  slug: string
  name_i18n?: Record<string, string> | null
}

interface IngredientsFilterMobileProps {
  ingredients: Ingredient[]
  selectedSlug: string | null
  onSelect: (slug: string | null) => void
  locale: string
  label: string
}

export function IngredientsFilterMobile({
  ingredients,
  selectedSlug,
  onSelect,
  locale,
  label,
}: IngredientsFilterMobileProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleSelect = (slug: string) => {
    onSelect(selectedSlug === slug ? null : slug)
  }

  const handleClear = () => {
    onSelect(null)
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-[13px] font-mono font-semibold text-porcelain/45 uppercase tracking-widest">
          {label}
        </label>
        {selectedSlug && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-[11px] font-mono text-porcelain/45 hover:text-porcelain/75 transition-colors"
            aria-label="Clear ingredient selection"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Draggable horizontal scroll container */}
      <motion.div
        ref={scrollContainerRef}
        className="flex gap-2 pb-2 overflow-x-auto snap-x snap-mandatory scroll-smooth cursor-grab active:cursor-grabbing"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          onClick={() => onSelect(null)}
          className={`
            flex-shrink-0 px-3 py-1.5 rounded-full border font-mono text-[11px] font-medium
            transition-all duration-200 snap-start whitespace-nowrap
            ${
              selectedSlug === null
                ? 'bg-porcelain/20 border-porcelain/40 text-porcelain'
                : 'bg-white/8 border-white/15 text-porcelain/50 hover:bg-white/12 hover:border-white/25'
            }
          `}
        >
          Todos
        </button>

        {ingredients.map(ing => {
          const isSelected = selectedSlug === ing.slug
          return (
            <motion.button
              key={ing.slug}
              onClick={() => handleSelect(ing.slug)}
              className={`
                flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-full border
                font-mono text-[11px] font-medium transition-all duration-200
                snap-start whitespace-nowrap
                ${
                  isSelected
                    ? 'bg-white/20 border-white/40 text-porcelain shadow-lg'
                    : 'bg-white/8 border-white/15 text-porcelain/60 hover:bg-white/12 hover:border-white/25'
                }
              `}
              whileHover={!isDragging ? { scale: 1.05 } : {}}
              whileTap={{ scale: 0.98 }}
            >
              <GripHorizontal className="w-3 h-3 text-porcelain/30 hidden md:block" aria-hidden />
              {getIngredientName(ing, locale)}
            </motion.button>
          )
        })}
      </motion.div>

      {/* Selection indicator */}
      {selectedSlug && (
        <div className="text-[10px] font-mono text-porcelain/40 mt-2">1 selecionado</div>
      )}
    </div>
  )
}
