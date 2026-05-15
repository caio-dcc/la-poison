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

function convertToMl(measureText: string | undefined, amountMl?: number | null): string {
  if (!measureText) return ''
  if (amountMl) return `${Math.round(amountMl)} ml`

  // Try to parse oz from measure_text
  const ozMatch = measureText.match(/(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*oz/i)
  if (ozMatch) {
    const parts = measureText.match(/(\d+)(?:\s+(\d+)\/(\d+))?/)
    if (parts) {
      const whole = parseFloat(parts[1] || '0')
      const num = parseFloat(parts[2] || '0')
      const den = parseFloat(parts[3] || '1')
      const totalOz = whole + num / den
      return `${Math.round(totalOz * 29.5735)} ml`
    }
  }

  // Try fraction oz like "1 3/4 shot" -> can't reliably convert shots
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

  const canToggle = ingredients.some(i => i.amount_ml || i.measure_text?.match(/oz/i))
  const label = ingredientLabels[locale as keyof typeof ingredientLabels] || ingredientLabels.pt

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-evergreen">{label}</h2>
        {canToggle && (
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setUnit('original')}
              className={`px-3 py-1.5 transition-colors ${unit === 'original' ? 'bg-evergreen text-porcelain' : 'text-shadow-grey hover:bg-gray-50'}`}
            >
              oz
            </button>
            <button
              onClick={() => setUnit('ml')}
              className={`px-3 py-1.5 transition-colors ${unit === 'ml' ? 'bg-evergreen text-porcelain' : 'text-shadow-grey hover:bg-gray-50'}`}
            >
              ml
            </button>
          </div>
        )}
      </div>
      <ul className="space-y-2.5">
        {ingredients.map((ing, idx) => {
          const translatedName = getIngredientName(ing, locale)
          return (
            <li key={idx} className="flex items-baseline gap-3">
              {ing.measure_text && (
                <span className="text-sm font-semibold text-hunter-green min-w-[90px] shrink-0">
                  {unit === 'ml'
                    ? convertToMl(ing.measure_text, ing.amount_ml)
                    : ing.measure_text || ''}
                </span>
              )}
              {ing.slug ? (
                <Link
                  href={`/${locale}/drinks/ingredient/${ing.slug}`}
                  className="text-shadow-grey hover:text-evergreen transition-colors"
                >
                  {translatedName}
                </Link>
              ) : (
                <span className="text-shadow-grey">{translatedName}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
