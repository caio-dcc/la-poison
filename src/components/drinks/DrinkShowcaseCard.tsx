'use client'

import React, { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { ArrowRight, Wine, Sparkles, WineOff } from 'lucide-react'
import {
  getDrinkCategoryKey,
  getDrinkCategoryLabel,
  isAlcoholicDrink,
  type DrinkCategoryKey,
} from '@/lib/drinks/classification'

interface Ingredient {
  name: string
  slug: string
  name_i18n?: Record<string, string> | null
}

interface DrinkShowcaseCardProps {
  cocktail: {
    id: string
    name: string
    slug: string
    thumb_url: string
    category: string
    abv_estimate?: number
    difficulty?: number
    prep_time_minutes?: number
    alcoholic?: boolean
    cocktail_ingredients?: Array<{ ingredient: Ingredient }>
  }
  locale: string
  index?: number
}

const CATEGORY_ICONS: Record<DrinkCategoryKey, React.ElementType> = {
  'alcoholic-cocktail': Wine,
  'non-alcoholic': WineOff,
  wine: Wine,
  other: Sparkles,
}

const CTA_LABELS: Record<string, string> = {
  pt: 'Ver',
  en: 'View',
  es: 'Ver',
}

const CATEGORY_BADGE_CLASSES: Record<DrinkCategoryKey, string> = {
  'alcoholic-cocktail': 'bg-amber-500/15 border-amber-500/25 text-amber-300',
  'non-alcoholic': 'bg-white/5 border-white/10 text-porcelain/35',
  wine: 'bg-[#722F37]/25 border-[#722F37]/40 text-[#E8A0A7]',
  other: 'bg-[#4B2E1A]/30 border-[#4B2E1A]/45 text-[#C9A87C]',
}

const FALLBACK_IMAGE_URL = 'https://www.thecocktaildb.com/images/media/drink/229s6v1571804529.jpg'

function getHighQualityImageUrl(url: string) {
  return url.replace(/\/preview$/, '')
}

export function DrinkShowcaseCard({ cocktail, locale, index = 0 }: DrinkShowcaseCardProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })
  const [imageSrc, setImageSrc] = useState(() => getHighQualityImageUrl(cocktail.thumb_url))

  const categoryKey = getDrinkCategoryKey(cocktail)
  const CategoryIcon = CATEGORY_ICONS[categoryKey]
  const isAlcoholic = isAlcoholicDrink(cocktail)
  const categoryLabel = getDrinkCategoryLabel(cocktail, locale)
  const abvBadgeClasses = CATEGORY_BADGE_CLASSES[categoryKey]

  const ingredients = cocktail.cocktail_ingredients ?? []
  const visibleIngredients = ingredients.slice(0, 4)
  const remainingIngredients = Math.max(ingredients.length - visibleIngredients.length, 0)
  const ctaLabel = CTA_LABELS[locale] ?? CTA_LABELS.pt

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(index * 0.03, 0.4) }}
      className="h-full"
    >
      <Link
        href={`/${locale}/drinks/${cocktail.slug}`}
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-porcelain/50 rounded-2xl"
      >
        <article
          className="
          h-full min-h-[14.5rem] md:min-h-[15.5rem]
          group relative bg-[#111] border border-white/8 rounded-2xl overflow-hidden
          shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-row-reverse cursor-pointer
          transition-all duration-300 ease-out
          hover:border-white/18 hover:shadow-[0_8px_32px_rgba(0,0,0,0.65)] hover:-translate-y-0.5
        "
        >
          {/* ── Image ── */}
          <div className="relative h-auto min-h-full w-[40%] shrink-0 overflow-hidden bg-black/40 sm:w-[38%]">
            {/* blur glow */}
            <Image
              src={imageSrc}
              alt=""
              aria-hidden="true"
              fill
              sizes="(min-width: 1536px) 170px, (min-width: 1280px) 210px, (min-width: 768px) 220px, 44vw"
              quality={95}
              className="pointer-events-none object-cover scale-110 blur-lg opacity-35"
            />
            {/* main */}
            <Image
              src={imageSrc}
              alt={cocktail.name}
              fill
              sizes="(min-width: 1536px) 170px, (min-width: 1280px) 210px, (min-width: 768px) 220px, 44vw"
              quality={95}
              className="relative z-10 object-contain p-1 transition-opacity duration-300 ease-out group-hover:opacity-95"
              onError={() => setImageSrc(FALLBACK_IMAGE_URL)}
            />
            {/* ABV badge — only when drink has alcohol */}
            {isAlcoholic && cocktail.abv_estimate && (
              <div
                className={`
                absolute top-2.5 left-2.5 z-20
                flex items-center gap-1 px-2 py-0.5 rounded-full border
                text-[clamp(13px,0.72rem+0.12vw,15px)] font-mono font-bold backdrop-blur-sm
                ${abvBadgeClasses}
              `}
              >
                <Wine className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{cocktail.abv_estimate}%</span>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2 p-4 text-left">
            {/* Category row */}
            <div className="flex max-w-full items-center justify-start gap-1.5">
              <CategoryIcon className="h-4 w-4 shrink-0 text-porcelain/35" aria-hidden="true" />
              <span className="truncate text-[clamp(14px,0.76rem+0.12vw,16px)] font-mono font-medium uppercase tracking-widest text-porcelain/45">
                {categoryLabel}
              </span>
            </div>

            {/* Name */}
            <h2 className="line-clamp-3 text-[clamp(21px,1.05rem+0.45vw,26px)] font-serif font-bold leading-[1.18] text-porcelain">
              {cocktail.name}
            </h2>

            {/* Ingredients list — hidden on mobile */}
            {ingredients.length > 0 && (
              <ul className="flex min-w-0 flex-col items-start gap-1 overflow-hidden">
                {visibleIngredients.map((ci, i) => (
                  <li
                    key={i}
                    className="max-w-full truncate text-[clamp(15px,0.82rem+0.14vw,17px)] font-mono leading-tight text-porcelain/60"
                  >
                    {ci.ingredient.name_i18n?.[locale] ?? ci.ingredient.name}
                  </li>
                ))}
                {remainingIngredients > 0 && (
                  <li className="text-[clamp(15px,0.82rem+0.14vw,17px)] font-mono leading-tight text-porcelain/45">
                    +{remainingIngredients}
                  </li>
                )}
              </ul>
            )}

            {/* Footer CTA */}
            <div className="mt-auto flex w-full items-center justify-start border-t border-white/6 pt-2">
              <div className="flex items-center gap-1.5 text-[clamp(14px,0.76rem+0.12vw,16px)] font-mono font-semibold text-porcelain/60 transition-colors group-hover:text-porcelain">
                <span>{ctaLabel}</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  )
}
