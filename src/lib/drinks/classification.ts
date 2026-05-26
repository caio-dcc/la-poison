export interface DrinkIngredient {
  name: string
  slug: string
  name_i18n?: Record<string, string> | null
}

export interface ClassifiableDrink {
  name: string
  slug: string
  thumb_url?: string | null
  category?: string | null
  abv_estimate?: number | null
  difficulty?: number | null
  prep_time_minutes?: number | null
  alcoholic?: boolean | null
  cocktail_ingredients?: Array<{ ingredient: DrinkIngredient | null }> | null
}

export type DrinkCategoryKey = 'alcoholic-cocktail' | 'non-alcoholic' | 'wine' | 'other'

export const DRINK_CATEGORY_KEYS: DrinkCategoryKey[] = [
  'alcoholic-cocktail',
  'non-alcoholic',
  'wine',
  'other',
]

export const DRINK_CATEGORY_LABELS: Record<string, Record<DrinkCategoryKey, string>> = {
  pt: {
    'alcoholic-cocktail': 'Coquetel Alcoólico',
    'non-alcoholic': 'Não alcoólico',
    wine: 'Vinho',
    other: 'Outros',
  },
  en: {
    'alcoholic-cocktail': 'Alcoholic Cocktail',
    'non-alcoholic': 'Non-alcoholic',
    wine: 'Wine',
    other: 'Other',
  },
  es: {
    'alcoholic-cocktail': 'Cóctel alcohólico',
    'non-alcoholic': 'Sin alcohol',
    wine: 'Vino',
    other: 'Otros',
  },
}

const ALCOHOL_KEYWORDS = [
  'absinthe',
  'amaretto',
  'aperol',
  'beer',
  'bourbon',
  'brandy',
  'cachaça',
  'cachaca',
  'campari',
  'champagne',
  'cognac',
  'cointreau',
  'gin',
  'liqueur',
  'mezcal',
  'prosecco',
  'rum',
  'sake',
  'scotch',
  'tequila',
  'triple sec',
  'vermouth',
  'vodka',
  'whiskey',
  'whisky',
  'wine',
]

const WINE_KEYWORDS = [
  'champagne',
  'cava',
  'espumante',
  'port',
  'prosecco',
  'red wine',
  'sangria',
  'sparkling',
  'vino',
  'vinho',
  'white wine',
  'wine',
]

const SPIRIT_AND_LIQUEUR_KEYWORDS = ALCOHOL_KEYWORDS.filter(
  keyword => !WINE_KEYWORDS.includes(keyword)
)

const COCKTAIL_CATEGORY_KEYWORDS = ['cocktail', 'ordinary drink', 'punch', 'shake', 'shot']

const OTHER_CATEGORY_KEYWORDS = ['beer', 'cocoa', 'coffee', 'homemade liqueur']

const NON_ALCOHOLIC_MIXER_KEYWORDS = [
  'ginger ale',
  'ginger beer',
  'root beer',
  'non alcoholic',
  'non-alcoholic',
  'sem alcool',
  'sin alcohol',
]

export function normalizeDrinkText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getIngredientText(drink: ClassifiableDrink) {
  return (
    drink.cocktail_ingredients
      ?.map(ci => {
        const ingredient = ci.ingredient
        if (!ingredient) return ''

        return [
          ingredient.name,
          ingredient.slug,
          ...(ingredient.name_i18n ? Object.values(ingredient.name_i18n) : []),
        ].join(' ')
      })
      .join(' ') ?? ''
  )
}

function getIngredientNames(drink: ClassifiableDrink) {
  return (
    drink.cocktail_ingredients
      ?.map(ci => ci.ingredient)
      .filter((ingredient): ingredient is DrinkIngredient => Boolean(ingredient))
      .map(ingredient =>
        [
          ingredient.name,
          ingredient.slug,
          ...(ingredient.name_i18n ? Object.values(ingredient.name_i18n) : []),
        ].join(' ')
      ) ?? []
  )
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasKeyword(value: string, keywords: string[]) {
  const normalizedValue = normalizeDrinkText(value)

  return keywords.some(keyword => {
    const normalizedKeyword = normalizeDrinkText(keyword)
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}($|[^a-z0-9])`)

    return pattern.test(normalizedValue)
  })
}

function hasAlcoholicIngredient(drink: ClassifiableDrink) {
  return getIngredientNames(drink).some(ingredientName => {
    if (hasKeyword(ingredientName, NON_ALCOHOLIC_MIXER_KEYWORDS)) return false

    return hasKeyword(ingredientName, ALCOHOL_KEYWORDS)
  })
}

export function isAlcoholicDrink(drink: ClassifiableDrink) {
  if (drink.alcoholic === false) return false
  if (drink.abv_estimate != null && drink.abv_estimate > 0) return true
  if (hasAlcoholicIngredient(drink)) return true
  if (hasKeyword(drink.category ?? '', ['beer', 'homemade liqueur'])) return true

  return drink.alcoholic === true
}

export function getDrinkCategoryKey(drink: ClassifiableDrink): DrinkCategoryKey {
  if (!isAlcoholicDrink(drink)) return 'non-alcoholic'

  const category = drink.category ?? ''
  const ingredientText = getIngredientText(drink)
  const isWineCategory = hasKeyword(category, ['wine'])
  const hasWineIngredient = hasKeyword(`${drink.name} ${ingredientText}`, WINE_KEYWORDS)
  const hasSpiritOrLiqueur = hasKeyword(ingredientText, SPIRIT_AND_LIQUEUR_KEYWORDS)

  if (isWineCategory || (hasWineIngredient && !hasSpiritOrLiqueur)) return 'wine'
  if (hasKeyword(category, OTHER_CATEGORY_KEYWORDS)) return 'other'
  if (hasKeyword(category, COCKTAIL_CATEGORY_KEYWORDS)) return 'alcoholic-cocktail'

  return 'alcoholic-cocktail'
}

export function getDrinkCategoryLabel(drink: ClassifiableDrink, locale: string) {
  const labels = DRINK_CATEGORY_LABELS[locale] ?? DRINK_CATEGORY_LABELS.pt

  return labels[getDrinkCategoryKey(drink)]
}

function getCompletenessScore(drink: ClassifiableDrink) {
  const ingredientsCount = drink.cocktail_ingredients?.filter(ci => ci.ingredient).length ?? 0
  const categoryKey = getDrinkCategoryKey(drink)

  return (
    ingredientsCount * 10 +
    (drink.thumb_url ? 4 : 0) +
    (drink.difficulty ? 2 : 0) +
    (drink.prep_time_minutes ? 2 : 0) +
    (drink.abv_estimate != null ? 1 : 0) +
    (categoryKey === 'alcoholic-cocktail' ? 4 : 0) +
    (categoryKey === 'other' ? -2 : 0)
  )
}

export function dedupeDrinksByName<T extends ClassifiableDrink>(drinks: T[]) {
  const byName = new Map<string, T>()

  for (const drink of drinks) {
    const key = normalizeDrinkText(drink.name)
    const current = byName.get(key)

    if (!current || getCompletenessScore(drink) > getCompletenessScore(current)) {
      byName.set(key, drink)
    }
  }

  return Array.from(byName.values())
}

export function drinkMatchesSearch(drink: ClassifiableDrink, query: string, locale: string) {
  const normalizedQuery = normalizeDrinkText(query.trim())
  if (!normalizedQuery) return true

  const searchableText = [
    drink.name,
    drink.category ?? '',
    getDrinkCategoryLabel(drink, locale),
    getIngredientText(drink),
  ].join(' ')

  return normalizeDrinkText(searchableText).includes(normalizedQuery)
}
