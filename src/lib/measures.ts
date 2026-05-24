/**
 * Helper to convert various recipe measurements (oz, cl, cup, tsp, tbsp) to ml.
 */
export function parseAmountToMl(measureText: string, amountMl?: number | null): number | null {
  if (amountMl) return amountMl

  const text = measureText.toLowerCase().trim()

  // If it's already in ml or contains ml, just return the number
  const mlMatch = text.match(/^(\d+(?:\.\d+)?)\s*ml/i)
  if (mlMatch) return parseFloat(mlMatch[1])

  // Centiliters: 1 cl = 10 ml
  const clMatch = text.match(/^(\d+(?:\.\d+)?)\s*cl/i)
  if (clMatch) return parseFloat(clMatch[1]) * 10

  // Ounces (oz): 1 oz = 29.5735 ml (approx 30 ml)
  if (text.includes('oz') || text.includes('ounce')) {
    // Matches fractions like "1 1/2", "1/2", "1.5"
    const fractionMatch = text.match(/(\d+)\s+(\d+)\/(\d+)/)
    if (fractionMatch) {
      const whole = parseFloat(fractionMatch[1])
      const num = parseFloat(fractionMatch[2])
      const den = parseFloat(fractionMatch[3])
      return (whole + num / den) * 29.5735
    }
    const simpleFractionMatch = text.match(/(\d+)\/(\d+)/)
    if (simpleFractionMatch) {
      const num = parseFloat(simpleFractionMatch[1])
      const den = parseFloat(simpleFractionMatch[2])
      return (num / den) * 29.5735
    }
    const decimalMatch = text.match(/(\d+(?:\.\d+)?)/)
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]) * 29.5735
    }
  }

  // Cups: 1 cup = 240 ml
  if (text.includes('cup')) {
    const fractionMatch = text.match(/(\d+)\s+(\d+)\/(\d+)/)
    if (fractionMatch) {
      const whole = parseFloat(fractionMatch[1])
      const num = parseFloat(fractionMatch[2])
      const den = parseFloat(fractionMatch[3])
      return (whole + num / den) * 240
    }
    const simpleFractionMatch = text.match(/(\d+)\/(\d+)/)
    if (simpleFractionMatch) {
      const num = parseFloat(simpleFractionMatch[1])
      const den = parseFloat(simpleFractionMatch[2])
      return (num / den) * 240
    }
    const decimalMatch = text.match(/(\d+(?:\.\d+)?)/)
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]) * 240
    }
  }

  // Tablespoons (tbsp): 1 tbsp = 15 ml
  if (text.includes('tbsp') || text.includes('tablespoon')) {
    const fractionMatch = text.match(/(\d+)\s+(\d+)\/(\d+)/)
    if (fractionMatch) {
      const whole = parseFloat(fractionMatch[1])
      const num = parseFloat(fractionMatch[2])
      const den = parseFloat(fractionMatch[3])
      return (whole + num / den) * 15
    }
    const simpleFractionMatch = text.match(/(\d+)\/(\d+)/)
    if (simpleFractionMatch) {
      const num = parseFloat(simpleFractionMatch[1])
      const den = parseFloat(simpleFractionMatch[2])
      return (num / den) * 15
    }
    const decimalMatch = text.match(/(\d+(?:\.\d+)?)/)
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]) * 15
    }
  }

  // Teaspoons (tsp): 1 tsp = 5 ml
  if (text.includes('tsp') || text.includes('teaspoon')) {
    const fractionMatch = text.match(/(\d+)\s+(\d+)\/(\d+)/)
    if (fractionMatch) {
      const whole = parseFloat(fractionMatch[1])
      const num = parseFloat(fractionMatch[2])
      const den = parseFloat(fractionMatch[3])
      return (whole + num / den) * 5
    }
    const simpleFractionMatch = text.match(/(\d+)\/(\d+)/)
    if (simpleFractionMatch) {
      const num = parseFloat(simpleFractionMatch[1])
      const den = parseFloat(simpleFractionMatch[2])
      return (num / den) * 5
    }
    const decimalMatch = text.match(/(\d+(?:\.\d+)?)/)
    if (decimalMatch) {
      return parseFloat(decimalMatch[1]) * 5
    }
  }

  // Standard fraction parsing without units (e.g. "1/2" vanilla)
  const plainFraction = text.match(/^(\d+)\/(\d+)$/)
  if (plainFraction) {
    const num = parseFloat(plainFraction[1])
    const den = parseFloat(plainFraction[2])
    return num / den
  }

  return null
}

export function convertToMl(
  measureText: string | undefined | null,
  amountMl?: number | null
): string {
  if (!measureText) return ''
  const ml = parseAmountToMl(measureText, amountMl)
  if (ml !== null) {
    // If it's a small unit fraction (like 1/2 vanilla) we probably don't want to say "0.5 ml" but keep it or make it look good.
    // However, if the parsed value is >= 1, round it.
    if (ml >= 1) {
      return `${Math.round(ml)} ml`
    } else {
      return `${ml} ml`
    }
  }
  return measureText
}
