import { Beaker, Clock, Gauge, Flame, Tag, Layers, Star, Zap } from 'lucide-react'
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
    abvDesc: (v: number) => `Estimativa de ${v}% ABV para este drinque.`,
    abvNone: 'Sem álcool',
    abvNoneDesc: 'Este drinque não contém álcool.',
    difficulty: 'Dificuldade',
    difficultyDesc: (d: number) =>
      d <= 2
        ? 'Fácil de preparar, ideal para iniciantes.'
        : d <= 3
          ? 'Dificuldade moderada, requer alguma técnica.'
          : 'Drinque avançado, recomendado para experientes.',
    difficultyLevel: (d: number) => (d <= 2 ? 'Fácil' : d <= 3 ? 'Moderado' : 'Avançado'),
    prepTime: 'Tempo de Preparo',
    prepTimeDesc: (m: number) => `Leva aproximadamente ${m} minutos para preparar.`,
    ingredients: 'Ingredientes',
    ingredientsDesc: (n: number) => `Este drinque usa ${n} ingrediente${n > 1 ? 's' : ''}.`,
    category: 'Categoria',
    categoryDesc: (c: string) => `Classificado como ${c}.`,
    rating: 'Avaliação',
    ratingDesc: (avg: number, total: number) =>
      `${avg} de 5 estrelas com base em ${total} avaliação${total > 1 ? 'ões' : 'ão'}.`,
    noRating: 'Sem avaliações',
    noRatingDesc: 'Seja o primeiro a avaliar este drinque!',
    explore: 'Ver mais →',
  },
  en: {
    abv: 'Alcohol Content',
    abvDesc: (v: number) => `Estimated ${v}% ABV for this drink.`,
    abvNone: 'Non-Alcoholic',
    abvNoneDesc: 'This drink contains no alcohol.',
    difficulty: 'Difficulty',
    difficultyDesc: (d: number) =>
      d <= 2
        ? 'Easy to make, great for beginners.'
        : d <= 3
          ? 'Moderate difficulty, some technique required.'
          : 'Advanced drink, recommended for experienced bartenders.',
    difficultyLevel: (d: number) => (d <= 2 ? 'Easy' : d <= 3 ? 'Moderate' : 'Advanced'),
    prepTime: 'Prep Time',
    prepTimeDesc: (m: number) => `Takes approximately ${m} minutes to prepare.`,
    ingredients: 'Ingredients',
    ingredientsDesc: (n: number) => `This drink uses ${n} ingredient${n !== 1 ? 's' : ''}.`,
    category: 'Category',
    categoryDesc: (c: string) => `Classified as ${c}.`,
    rating: 'Rating',
    ratingDesc: (avg: number, total: number) =>
      `${avg} out of 5 stars based on ${total} review${total !== 1 ? 's' : ''}.`,
    noRating: 'No Reviews Yet',
    noRatingDesc: 'Be the first to rate this drink!',
    explore: 'Explore →',
  },
  es: {
    abv: 'Contenido Alcohólico',
    abvDesc: (v: number) => `Estimado ${v}% ABV para esta bebida.`,
    abvNone: 'Sin Alcohol',
    abvNoneDesc: 'Esta bebida no contiene alcohol.',
    difficulty: 'Dificultad',
    difficultyDesc: (d: number) =>
      d <= 2
        ? 'Fácil de preparar, ideal para principiantes.'
        : d <= 3
          ? 'Dificultad moderada, requiere algo de técnica.'
          : 'Bebida avanzada, recomendada para expertos.',
    difficultyLevel: (d: number) => (d <= 2 ? 'Fácil' : d <= 3 ? 'Moderado' : 'Avanzado'),
    prepTime: 'Tiempo de Preparación',
    prepTimeDesc: (m: number) => `Tarda aproximadamente ${m} minutos en prepararse.`,
    ingredients: 'Ingredientes',
    ingredientsDesc: (n: number) => `Esta bebida usa ${n} ingrediente${n !== 1 ? 's' : ''}.`,
    category: 'Categoría',
    categoryDesc: (c: string) => `Clasificado como ${c}.`,
    rating: 'Calificación',
    ratingDesc: (avg: number, total: number) =>
      `${avg} de 5 estrellas con base en ${total} reseña${total !== 1 ? 's' : ''}.`,
    noRating: 'Sin Reseñas',
    noRatingDesc: '¡Sé el primero en calificar esta bebida!',
    explore: 'Explorar →',
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

  // 1. ABV — wide card, always first
  if (abv && abv > 0) {
    items.push({
      title: t.abv,
      meta: `${abv}% ABV`,
      description: t.abvDesc(abv),
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      status: abv >= 20 ? '🔥 Strong' : abv >= 10 ? '🥃 Medium' : '🍃 Light',
      tags: ['ABV', 'Álcool'],
      colSpan: 2,
      hasPersistentHover: true,
      cta: t.explore,
    })
  } else {
    items.push({
      title: t.abvNone,
      meta: '0% ABV',
      description: t.abvNoneDesc,
      icon: <Beaker className="w-4 h-4 text-emerald-400" />,
      status: '🌿 Sem Álcool',
      tags: ['Zero Álcool'],
      colSpan: 2,
      hasPersistentHover: true,
      cta: t.explore,
    })
  }

  // 2. Difficulty
  if (diff) {
    items.push({
      title: t.difficulty,
      meta: t.difficultyLevel(diff),
      description: t.difficultyDesc(diff),
      icon: <Gauge className="w-4 h-4 text-rose-400" />,
      tags: [`${diff}/5`],
      cta: t.explore,
    })
  }

  // 3. Prep Time
  if (prep) {
    items.push({
      title: t.prepTime,
      meta: `${prep} min`,
      description: t.prepTimeDesc(prep),
      icon: <Clock className="w-4 h-4 text-sky-400" />,
      tags: [prep <= 5 ? 'Rápido' : prep <= 15 ? 'Médio' : 'Longo'],
      cta: t.explore,
    })
  }

  // 4. Ingredients count
  items.push({
    title: t.ingredients,
    meta: `${ingCount}x`,
    description: t.ingredientsDesc(ingCount),
    icon: <Layers className="w-4 h-4 text-violet-400" />,
    tags: cocktail.ingredients.slice(0, 3).map(i => i.name),
    cta: t.explore,
  })

  // 5. Category
  if (categoryName) {
    items.push({
      title: t.category,
      meta: categoryName,
      description: t.categoryDesc(categoryName),
      icon: <Tag className="w-4 h-4 text-teal-400" />,
      tags: [categoryName],
      cta: t.explore,
    })
  }

  // 6. Community rating
  if (averageRating && totalRatings > 0) {
    items.push({
      title: t.rating,
      meta: `${averageRating}/5 ★`,
      description: t.ratingDesc(averageRating, totalRatings),
      icon: <Star className="w-4 h-4 text-amber-400" />,
      tags: ['★'.repeat(Math.round(averageRating))],
      cta: t.explore,
    })
  } else {
    items.push({
      title: t.noRating,
      meta: '—',
      description: t.noRatingDesc,
      icon: <Zap className="w-4 h-4 text-porcelain/40" />,
      tags: [],
      cta: t.explore,
    })
  }

  return <BentoGrid items={items} />
}
