'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getIngredientName } from '@/lib/i18n/translate'
import { convertToMl } from '@/lib/measures'

interface Ingredient {
  name: string
  name_i18n?: Record<string, string> | null
  slug?: string
  measure_text?: string
  amount_ml?: number | null
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
  const [unit, setUnit] = useState<'original' | 'ml'>('ml')

  // We can convert if there is any measurement text
  const canToggle = ingredients.some(i => i.measure_text)
  const label = ingredientLabels[locale as keyof typeof ingredientLabels] || ingredientLabels.pt

  const itemBase =
    'group relative flex items-center justify-center rounded-xl px-4 py-3 overflow-hidden cursor-pointer border border-white/15 bg-evergreen/30 backdrop-blur-sm transition-all duration-300 shockwave-item'

  return (
    <div className="bg-evergreen/60 rounded-2xl shadow-lg ring-1 ring-white/10 backdrop-blur-md p-6 h-full flex flex-col justify-between">
      <div>
        <div className="flex flex-col gap-2 mb-4">
          <h2 className="text-lg font-bold text-porcelain">{label}</h2>
          {canToggle && (
            <div className="flex items-center self-start rounded-lg border border-white/20 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setUnit('original')}
                className={`px-3 py-1.5 transition-colors ${unit === 'original' ? 'bg-porcelain text-evergreen' : 'text-porcelain/70 hover:bg-white/10'}`}
              >
                Oz / Cups
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
              <span className="relative flex items-center justify-center gap-2 w-full text-center py-1">
                {measure && (
                  <span className="text-sm font-bold text-porcelain/60 group-hover:text-white/80 tabular-nums transition-colors duration-300">
                    {measure}
                  </span>
                )}
                <span className="text-sm font-medium text-porcelain/90 group-hover:text-white leading-snug transition-colors duration-300">
                  {translatedName}
                </span>
              </span>
            )

            return ing.slug ? (
              <li key={idx}>
                <Link href={`/${locale}/drinks/ingredient/${ing.slug}`} className={itemBase}>
                  {innerContent}
                </Link>
              </li>
            ) : (
              <li key={idx} className={itemBase}>
                {innerContent}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
