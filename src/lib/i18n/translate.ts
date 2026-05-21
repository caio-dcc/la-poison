/**
 * Extract translated value from i18n JSONB object
 * @param i18nObj JSONB object like {"pt":"...", "en":"...", "es":"..."}
 * @param locale Locale code: 'pt', 'en', 'es'
 * @param fallback Fallback value if locale not found
 */
export function getI18nValue(
  i18nObj: Record<string, string> | null | undefined,
  locale: string,
  fallback: string = ''
): string {
  if (!i18nObj || typeof i18nObj !== 'object') {
    return fallback
  }
  return i18nObj[locale] || i18nObj.en || i18nObj.pt || fallback
}

type LocalizableCocktail = {
  instructions?: string | null
  instructions_en?: string | null
  instructions_pt?: string | null
  instructions_es?: string | null
  description_en?: string | null
  description_pt?: string | null
  description_es?: string | null
  history_en?: string | null
  history_pt?: string | null
  history_es?: string | null
  fun_fact_en?: string | null
  fun_fact_pt?: string | null
  fun_fact_es?: string | null
}

function pickLocalized(
  cocktail: LocalizableCocktail,
  field: 'instructions' | 'description' | 'history' | 'fun_fact',
  locale: string
): string {
  const order =
    locale === 'pt' ? ['pt', 'en', 'es'] : locale === 'es' ? ['es', 'en', 'pt'] : ['en', 'pt', 'es']
  for (const loc of order) {
    const key = `${field}_${loc}` as keyof LocalizableCocktail
    const v = cocktail[key]
    if (typeof v === 'string' && v.trim().length > 0) return v
  }
  // Legacy single column (only exists for instructions)
  if (field === 'instructions' && cocktail.instructions) return cocktail.instructions
  return ''
}

export function getInstructions(cocktail: LocalizableCocktail, locale: string = 'en'): string {
  return pickLocalized(cocktail, 'instructions', locale)
}

export function getDescription(cocktail: LocalizableCocktail, locale: string = 'en'): string {
  return pickLocalized(cocktail, 'description', locale)
}

export function getHistory(cocktail: LocalizableCocktail, locale: string = 'en'): string {
  return pickLocalized(cocktail, 'history', locale)
}

export function getFunFact(cocktail: LocalizableCocktail, locale: string = 'en'): string {
  return pickLocalized(cocktail, 'fun_fact', locale)
}

const categoryTranslations: Record<string, Record<string, string>> = {
  'ordinary drink': {
    pt: 'Drink Comum',
    en: 'Ordinary Drink',
    es: 'Bebida Común',
  },
  cocktail: {
    pt: 'Coquetel',
    en: 'Cocktail',
    es: 'Cóctel',
  },
  shake: {
    pt: 'Shake',
    en: 'Shake',
    es: 'Batido',
  },
  'other / unknown': {
    pt: 'Outro / Desconhecido',
    en: 'Other / Unknown',
    es: 'Otro / Desconocido',
  },
  cocoa: {
    pt: 'Cacau',
    en: 'Cocoa',
    es: 'Cacao',
  },
  shot: {
    pt: 'Shot',
    en: 'Shot',
    es: 'Chupito',
  },
  'coffee / tea': {
    pt: 'Café / Chá',
    en: 'Coffee / Tea',
    es: 'Café / Té',
  },
  'homemade liqueur': {
    pt: 'Licor Caseiro',
    en: 'Homemade Liqueur',
    es: 'Licor Casero',
  },
  'punch / party drink': {
    pt: 'Punch / Drink de Festa',
    en: 'Punch / Party Drink',
    es: 'Ponche / Bebida de Fiesta',
  },
  beer: {
    pt: 'Cerveja',
    en: 'Beer',
    es: 'Cerveza',
  },
  'soft drink / soda': {
    pt: 'Refrigerante / Soda',
    en: 'Soft Drink / Soda',
    es: 'Refresco / Soda',
  },
}

/**
 * Get category name in the specified locale
 */
export function getCategoryName(
  category: {
    name?: string
    name_i18n?: Record<string, string> | null
  },
  locale: string
): string {
  const name = category.name || ''
  const lowerName = name.toLowerCase().trim()
  if (categoryTranslations[lowerName]) {
    return categoryTranslations[lowerName][locale] || categoryTranslations[lowerName].en || name
  }
  if (category.name_i18n) {
    return getI18nValue(category.name_i18n, locale, name)
  }
  return name
}

/**
 * Get ingredient name in the specified locale
 */
export function getIngredientName(
  ingredient: {
    name?: string
    name_i18n?: Record<string, string> | null
  },
  locale: string
): string {
  if (ingredient.name_i18n) {
    return getI18nValue(ingredient.name_i18n, locale, ingredient.name || '')
  }
  return ingredient.name || ''
}
