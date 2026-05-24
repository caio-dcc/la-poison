import { Clock, Gauge, Flame, Tag, Layers, Star, Zap } from 'lucide-react'
import { BentoGrid, type BentoItem } from '@/components/ui/bento-grid'

interface DrinkBentoProps {
  cocktail: {
    name: string
    abv_estimate?: number | null
    difficulty?: number | null
    prep_time_minutes?: number | null
    ingredients: Array<{ name: string; measure_text?: string }>
  }
  categoryName: string
  locale: string
  averageRating?: number
  totalRatings?: number
}

const labels = {
  pt: {
    abv: 'Teor Alcoólico',
    abvNone: 'Sem Álcool',
    difficulty: 'Dificuldade',
    difficultyLevel: (d: number) => (d <= 2 ? 'Fácil' : d <= 3 ? 'Moderado' : 'Avançado'),
    prepTime: 'Preparo',
    ingredients: 'Ingredientes',
    category: 'Categoria',
    rating: 'Avaliação',
    noRating: 'Sem Avaliações',
    ratingMeta: (avg: number, total: number) => `${avg}/5 (${total})`,
  },
  en: {
    abv: 'Alcohol',
    abvNone: 'Non-Alcoholic',
    difficulty: 'Difficulty',
    difficultyLevel: (d: number) => (d <= 2 ? 'Easy' : d <= 3 ? 'Moderate' : 'Advanced'),
    prepTime: 'Prep Time',
    ingredients: 'Ingredients',
    category: 'Category',
    rating: 'Rating',
    noRating: 'No Reviews',
    ratingMeta: (avg: number, total: number) => `${avg}/5 (${total})`,
  },
  es: {
    abv: 'Alcohol',
    abvNone: 'Sin Alcohol',
    difficulty: 'Dificultad',
    difficultyLevel: (d: number) => (d <= 2 ? 'Fácil' : d <= 3 ? 'Moderado' : 'Avanzado'),
    prepTime: 'Preparación',
    ingredients: 'Ingredientes',
    category: 'Categoría',
    rating: 'Calificación',
    noRating: 'Sin Reseñas',
    ratingMeta: (avg: number, total: number) => `${avg}/5 (${total})`,
  },
}

export function DrinkBento({
  cocktail,
  categoryName,
  locale,
  averageRating,
  totalRatings = 0,
}: DrinkBentoProps) {
  const t = labels[locale as keyof typeof labels] ?? labels.pt
  const ingCount = cocktail.ingredients.length
  const abv = cocktail.abv_estimate
  const diff = cocktail.difficulty
  const prep = cocktail.prep_time_minutes

  const items: BentoItem[] = []

  // 1. ABV — only show when drink has alcohol
  if (abv && abv > 0) {
    items.push({
      title: t.abv,
      meta: `${abv}% ABV`,
      description: '',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      status: abv >= 20 ? '🔥 Strong' : abv >= 10 ? '🥃 Medium' : '🍃 Light',
      tags: ['ABV'],
      hasPersistentHover: true,
    })
  }

  // 2. Difficulty
  if (diff) {
    items.push({
      title: t.difficulty,
      meta: t.difficultyLevel(diff),
      description: '',
      icon: <Gauge className="w-4 h-4 text-rose-400" />,
      tags: [`${diff}/5`],
    })
  }

  // 3. Prep Time
  if (prep) {
    items.push({
      title: t.prepTime,
      meta: `${prep} min`,
      description: '',
      icon: <Clock className="w-4 h-4 text-sky-400" />,
      tags: [prep <= 5 ? 'Rápido' : prep <= 15 ? 'Médio' : 'Longo'],
    })
  }

  // 4. Ingredients count
  items.push({
    title: t.ingredients,
    meta: `${ingCount}`,
    description: '',
    icon: <Layers className="w-4 h-4 text-violet-400" />,
    tags: cocktail.ingredients.slice(0, 2).map(i => i.name),
  })

  // 5. Category
  if (categoryName) {
    items.push({
      title: t.category,
      meta: categoryName,
      description: '',
      icon: <Tag className="w-4 h-4 text-teal-400" />,
    })
  }

  // 6. Rating
  if (averageRating && totalRatings > 0) {
    items.push({
      title: t.rating,
      meta: t.ratingMeta(averageRating, totalRatings),
      description: '',
      icon: <Star className="w-4 h-4 text-amber-400" />,
      tags: ['★'.repeat(Math.round(averageRating))],
    })
  } else {
    items.push({
      title: t.noRating,
      meta: '—',
      description: '',
      icon: <Zap className="w-4 h-4 text-porcelain/40" />,
    })
  }

  return <BentoGrid items={items} />
}
