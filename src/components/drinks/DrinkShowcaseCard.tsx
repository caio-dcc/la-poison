'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Wine, FlaskConical, Coffee, Beer, Droplets, Sparkles, WineOff, Clock } from 'lucide-react'
import { getCategoryName } from '@/lib/i18n/translate'

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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  cocktail: Wine,
  'ordinary drink': Wine,
  shake: FlaskConical,
  shot: Droplets,
  beer: Beer,
  'coffee / tea': Coffee,
  'homemade liqueur': Sparkles,
  'soft drink / soda': WineOff,
  'punch / party drink': Wine,
  cocoa: Coffee,
}

const DIFFICULTY_LABELS: Record<string, Record<number, string>> = {
  pt: { 1: 'Fácil', 2: 'Fácil', 3: 'Médio', 4: 'Difícil', 5: 'Expert' },
  en: { 1: 'Easy', 2: 'Easy', 3: 'Medium', 4: 'Hard', 5: 'Expert' },
  es: { 1: 'Fácil', 2: 'Fácil', 3: 'Medio', 4: 'Difícil', 5: 'Experto' },
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'text-emerald-400',
  2: 'text-emerald-400',
  3: 'text-amber-400',
  4: 'text-rose-400',
  5: 'text-rose-400',
}

const SPIRIT_GROUPS: Array<{
  keywords: string[]
  classes: string
  label: Record<string, string>
}> = [
  {
    keywords: [
      'wine',
      'vinho',
      'vermouth',
      'port',
      'sangria',
      'campari',
      'aperol',
      'red wine',
      'vino',
    ],
    classes: 'bg-[#722F37]/25 border-[#722F37]/40 text-[#E8A0A7]',
    label: { pt: 'Vinho', en: 'Wine', es: 'Vino' },
  },
  {
    keywords: [
      'whiskey',
      'whisky',
      'bourbon',
      'scotch',
      'cognac',
      'brandy',
      'dark rum',
      'rum',
      'cachaça',
      'cachaca',
      'amaretto',
      'kahlua',
      'kahlúa',
      'jägermeister',
      'jagermeister',
    ],
    classes: 'bg-[#8B4513]/25 border-[#8B4513]/40 text-[#D4A574]',
    label: { pt: 'Destilado Escuro', en: 'Dark Spirit', es: 'Dest. Oscuro' },
  },
  {
    keywords: [
      'vodka',
      'gin',
      'tequila',
      'mezcal',
      'sake',
      'soju',
      'white rum',
      'light rum',
      'pisco',
      'grappa',
      'absinthe',
      'absinto',
    ],
    classes: 'bg-white/10 border-white/20 text-[#E8EDF0]',
    label: { pt: 'Destilado Claro', en: 'Clear Spirit', es: 'Dest. Claro' },
  },
  {
    keywords: ['champagne', 'prosecco', 'sparkling', 'cava', 'espumante'],
    classes: 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFE066]',
    label: { pt: 'Espumante', en: 'Sparkling', es: 'Espumoso' },
  },
  {
    keywords: ['beer', 'cerveja', 'lager', 'ale', 'stout', 'ipa', 'cerveza'],
    classes: 'bg-[#C68B3C]/20 border-[#C68B3C]/35 text-[#E8C87A]',
    label: { pt: 'Cerveja', en: 'Beer', es: 'Cerveza' },
  },
  {
    keywords: ['curaçao', 'curacao', 'triple sec', 'cointreau', 'grand marnier', 'orange liqueur'],
    classes: 'bg-orange-500/20 border-orange-500/30 text-orange-300',
    label: { pt: 'Licor Laranja', en: 'Orange Liqueur', es: 'Licor Naranja' },
  },
  {
    keywords: ['coffee', 'café', 'cafe', 'espresso', 'cocoa', 'chocolate', 'cacao'],
    classes: 'bg-[#4B2E1A]/30 border-[#4B2E1A]/45 text-[#C9A87C]',
    label: { pt: 'Café / Cacau', en: 'Coffee / Cocoa', es: 'Café / Cacao' },
  },
  {
    keywords: ['midori', 'chartreuse', 'crème de menthe', 'creme de menthe', 'mint liqueur'],
    classes: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
    label: { pt: 'Licor Verde', en: 'Green Liqueur', es: 'Licor Verde' },
  },
]

function getSpiritGroup(
  category: string,
  ingredients?: Array<{ ingredient: Ingredient }>
): (typeof SPIRIT_GROUPS)[number] | null {
  const catLower = category?.toLowerCase() ?? ''
  if (catLower.includes('beer')) return SPIRIT_GROUPS.find(s => s.keywords.includes('beer'))!
  if (catLower.includes('coffee') || catLower.includes('cocoa'))
    return SPIRIT_GROUPS.find(s => s.keywords.includes('coffee'))!
  if (ingredients && ingredients.length > 0) {
    for (const group of SPIRIT_GROUPS) {
      for (const ci of ingredients) {
        const ingName = ci.ingredient.name.toLowerCase()
        const ingSlug = ci.ingredient.slug.toLowerCase()
        if (group.keywords.some(kw => ingName.includes(kw) || ingSlug.includes(kw))) return group
      }
    }
  }
  return null
}

export function DrinkShowcaseCard({ cocktail, locale, index = 0 }: DrinkShowcaseCardProps) {
  const CategoryIcon = CATEGORY_ICONS[cocktail.category?.toLowerCase().trim() ?? ''] ?? Wine
  const isAlcoholic =
    cocktail.alcoholic === true || (cocktail.abv_estimate != null && cocktail.abv_estimate > 0)
  const categoryLabel = getCategoryName({ name: cocktail.category }, locale)

  const spiritGroup = isAlcoholic
    ? getSpiritGroup(cocktail.category, cocktail.cocktail_ingredients)
    : null

  const abvBadgeClasses = isAlcoholic
    ? (spiritGroup?.classes ?? 'bg-amber-500/15 border-amber-500/25 text-amber-300')
    : 'bg-white/5 border-white/10 text-porcelain/35'

  const spiritLabel =
    spiritGroup?.label[locale as keyof typeof spiritGroup.label] ?? spiritGroup?.label.en ?? null

  const diffLabel = cocktail.difficulty
    ? (DIFFICULTY_LABELS[locale]?.[cocktail.difficulty] ??
      DIFFICULTY_LABELS.en[cocktail.difficulty])
    : null
  const diffColor = cocktail.difficulty
    ? (DIFFICULTY_COLORS[cocktail.difficulty] ?? 'text-porcelain/40')
    : ''

  const ingredients = cocktail.cocktail_ingredients ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: Math.min(index * 0.025, 0.35) }}
    >
      <Link
        href={`/${locale}/drinks/${cocktail.slug}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-porcelain/50 rounded-2xl"
      >
        <article
          className="
          group relative bg-[#111] border border-white/8 rounded-2xl overflow-hidden
          shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex flex-col cursor-pointer
          transition-all duration-300 ease-out
          hover:border-white/18 hover:shadow-[0_8px_32px_rgba(0,0,0,0.65)] hover:-translate-y-0.5
        "
        >
          {/* ── Image ── */}
          <div className="relative overflow-hidden aspect-[4/3] w-full">
            {/* blur glow */}
            <img
              src={cocktail.thumb_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg opacity-30 pointer-events-none"
              loading="lazy"
            />
            {/* main */}
            <img
              src={cocktail.thumb_url}
              alt={cocktail.name}
              className="relative z-10 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-103"
              loading="lazy"
              onError={e => {
                const img = e.currentTarget
                img.onerror = null
                img.src = 'https://www.thecocktaildb.com/images/media/drink/229s6v1571804529.jpg'
              }}
            />
            {/* ABV badge — only when drink has alcohol */}
            {isAlcoholic && cocktail.abv_estimate && (
              <div
                className={`
                absolute top-2.5 right-2.5 z-20
                flex items-center gap-1 px-2 py-0.5 rounded-full border
                text-[11px] font-mono font-bold backdrop-blur-sm
                ${abvBadgeClasses}
              `}
              >
                <Wine className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                <span>{cocktail.abv_estimate}%</span>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div className="flex flex-col items-center gap-2.5 p-3 pt-2.5 text-center">
            {/* Category row */}
            <div className="flex items-center justify-center gap-1.5">
              <CategoryIcon className="w-3 h-3 text-porcelain/30 shrink-0" aria-hidden="true" />
              <span className="text-[10px] font-mono font-medium text-porcelain/40 uppercase tracking-widest truncate">
                {categoryLabel}
              </span>
            </div>

            {/* Name */}
            <h2 className="text-[14px] font-serif font-bold text-porcelain leading-snug">
              {cocktail.name}
            </h2>

            {/* Ingredients list */}
            {ingredients.length > 0 && (
              <ul className="flex flex-col items-center gap-1">
                {ingredients.map((ci, i) => (
                  <li key={i} className="text-[11px] font-mono text-porcelain/55 leading-tight">
                    {ci.ingredient.name_i18n?.[locale] ?? ci.ingredient.name}
                  </li>
                ))}
              </ul>
            )}

            {/* Footer: difficulty + spirit + prep time */}
            {(diffLabel || spiritLabel || cocktail.prep_time_minutes) && (
              <div className="flex flex-wrap justify-center items-center gap-1.5 pt-1 border-t border-white/6 mt-0.5 w-full">
                {diffLabel && (
                  <span className={`text-[10px] font-mono font-semibold ${diffColor}`}>
                    {diffLabel}
                  </span>
                )}
                {diffLabel && (spiritLabel || cocktail.prep_time_minutes) && (
                  <span className="text-white/15 text-[10px]">·</span>
                )}
                {spiritLabel && (
                  <span className="text-[10px] font-mono text-porcelain/35">{spiritLabel}</span>
                )}
                {cocktail.prep_time_minutes && (
                  <>
                    {spiritLabel && <span className="text-white/15 text-[10px]">·</span>}
                    <span className="flex items-center gap-0.5 text-[10px] font-mono text-porcelain/35">
                      <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                      {cocktail.prep_time_minutes}min
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </article>
      </Link>
    </motion.div>
  )
}
