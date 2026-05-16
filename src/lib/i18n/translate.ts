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
  return i18nObj[locale] || i18nObj.pt || i18nObj.en || fallback
}

/**
 * Get instructions in the specified locale from cocktail columns
 */
export function getInstructions(cocktail: { instructions?: string | null }): string {
  return cocktail.instructions || ''
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
  if (category.name_i18n) {
    return getI18nValue(category.name_i18n, locale, category.name || '')
  }
  return category.name || ''
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
