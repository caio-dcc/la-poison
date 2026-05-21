'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getIngredientName } from '@/lib/i18n/translate'

interface Ingredient {
  name: string
  name_i18n?: Record<string, string> | null
  slug?: string
  measure_text?: string
  amount_ml?: number | null
}

function parseAmount(measureText: string, amountMl?: number | null): number | null {
  if (amountMl) return amountMl

  const clMatch = measureText.match(/^(\d+(?:\.\d+)?)\s*cl/i)
  if (clMatch) return parseFloat(clMatch[1]) * 10

  const ozMatch = measureText.match(/oz/i)
  if (ozMatch) {
    const parts = measureText.match(/(\d+)(?:\s+(\d+)\/(\d+))?/)
    if (parts) {
      const whole = parseFloat(parts[1] || '0')
      const num = parseFloat(parts[2] || '0')
      const den = parseFloat(parts[3] || '1')
      return (whole + num / den) * 29.5735
    }
  }

  return null
}

function convertToMl(measureText: string | undefined, amountMl?: number | null): string {
  if (!measureText) return ''
  const ml = parseAmount(measureText, amountMl)
  if (ml !== null) return `${Math.round(ml)} ml`
  return measureText
}

const ingredientLabels = {
  pt: 'Ingredientes',
  en: 'Ingredients',
  es: 'Ingredientes',
}

export function IngredientsCard({
  ingredients,
  locale = 'pt',
}: {
  ingredients: Ingredient[]
  locale?: string
}) {
  const [unit, setUnit] = useState<'original' | 'ml'>('original')

  const canToggle = ingredients.some(i => i.amount_ml || i.measure_text?.match(/oz|cl/i))
  const label = ingredientLabels[locale as keyof typeof ingredientLabels] || ingredientLabels.pt

  const itemBase =
    'group relative flex items-center rounded-xl px-3 overflow-hidden cursor-pointer border border-white/5 hover:border-white/20 transition-colors duration-300'

  return (
    <div className="bg-evergreen/60 rounded-2xl shadow-lg ring-1 ring-white/10 backdrop-blur-md p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-porcelain">{label}</h2>
        {canToggle && (
          <div className="flex items-center rounded-lg border border-white/20 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setUnit('original')}
              className={`px-3 py-1.5 transition-colors ${unit === 'original' ? 'bg-porcelain text-evergreen' : 'text-porcelain/70 hover:bg-white/10'}`}
            >
              {ingredients.some(i => i.measure_text?.match(/cl/i) && !i.measure_text?.match(/oz/i))
                ? 'cl'
                : 'oz'}
            </button>
            <button
              onClick={() => setUnit('ml')}
              className={`px-3 py-1.5 transition-colors ${unit === 'ml' ? 'bg-porcelain text-evergreen' : 'text-porcelain/70 hover:bg-white/10'}`}
            >
              ml
            </button>
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {ingredients.map((ing, idx) => {
          const translatedName = getIngredientName(ing, locale)
          const measure =
            unit === 'ml' ? convertToMl(ing.measure_text, ing.amount_ml) : ing.measure_text || ''

          const innerContent = (
            <>
              {/* Loading-bar sweep: starts at 0 width, expands to 100% on hover */}
              <span
                aria-hidden
                className="absolute inset-0 w-0 group-hover:w-full rounded-xl"
                style={{
                  background: 'rgba(58, 110, 74, 0.65)',
                  transition: 'width 0.3s ease-out',
                }}
              />
              {/* Text content stays above the fill */}
              <span className="relative flex items-center gap-3 w-full">
                {measure && (
                  <span
                    className="text-xs font-bold text-porcelain/60 group-hover:text-white/80 min-w-[72px] shrink-0 tabular-nums"
                    style={{ transition: 'color 0.3s' }}
                  >
                    {measure}
                  </span>
                )}
                <span
                  className="text-sm font-medium text-porcelain/90 group-hover:text-white leading-snug"
                  style={{ transition: 'color 0.3s' }}
                >
                  {translatedName}
                </span>
              </span>
            </>
          )

          return ing.slug ? (
            <li key={idx}>
              <Link
                href={`/${locale}/drinks/ingredient/${ing.slug}`}
                className={itemBase}
                style={{ minHeight: '5vh' }}
              >
                {innerContent}
              </Link>
            </li>
          ) : (
            <li key={idx} className={itemBase} style={{ minHeight: '5vh' }}>
              {innerContent}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
