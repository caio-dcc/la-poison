/**
 * Upserts PT/ES translations for all known cocktail categories.
 * Run once: npx tsx scripts/translate-categories.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env manually — no dotenv dependency needed
const envPath = resolve(process.cwd(), '.env')
const envLines = readFileSync(envPath, 'utf8').split('\n')
for (const line of envLines) {
  const m = line.match(/^([^#=\s]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim()
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Hand-curated translations for all 31 categories
const translations: Record<string, { pt: string; es: string; en: string }> = {
  Beer: { en: 'Beer', pt: 'Cerveja', es: 'Cerveza' },
  Bellini: { en: 'Bellini', pt: 'Bellini', es: 'Bellini' },
  'Bloody Mary': { en: 'Bloody Mary', pt: 'Bloody Mary', es: 'Bloody Mary' },
  Caipirinha: { en: 'Caipirinha', pt: 'Caipirinha', es: 'Caipiriña' },
  Cocktail: { en: 'Cocktail', pt: 'Coquetel', es: 'Cóctel' },
  Cocoa: { en: 'Cocoa', pt: 'Cacau', es: 'Cacao' },
  'Coffee / Tea': { en: 'Coffee / Tea', pt: 'Café / Chá', es: 'Café / Té' },
  Cosmopolitan: { en: 'Cosmopolitan', pt: 'Cosmopolitan', es: 'Cosmopolitan' },
  Daiquiri: { en: 'Daiquiri', pt: 'Daiquiri', es: 'Daiquirí' },
  'Homemade Liqueur': { en: 'Homemade Liqueur', pt: 'Licor Artesanal', es: 'Licor Casero' },
  Hurricane: { en: 'Hurricane', pt: 'Hurricane', es: 'Huracán' },
  'Long Island Iced Tea': {
    en: 'Long Island Iced Tea',
    pt: 'Long Island Iced Tea',
    es: 'Long Island Iced Tea',
  },
  Longdrink: { en: 'Long Drink', pt: 'Drink Longo', es: 'Bebida Larga' },
  'Mai Tai': { en: 'Mai Tai', pt: 'Mai Tai', es: 'Mai Tai' },
  Manhattan: { en: 'Manhattan', pt: 'Manhattan', es: 'Manhattan' },
  Margarita: { en: 'Margarita', pt: 'Margarita', es: 'Margarita' },
  Martini: { en: 'Martini', pt: 'Martini', es: 'Martini' },
  Mimosa: { en: 'Mimosa', pt: 'Mimosa', es: 'Mimosa' },
  Mojito: { en: 'Mojito', pt: 'Mojito', es: 'Mojito' },
  'Old Fashioned': { en: 'Old Fashioned', pt: 'Old Fashioned', es: 'Old Fashioned' },
  'Ordinary Drink': { en: 'Ordinary Drink', pt: 'Drink Simples', es: 'Bebida Común' },
  'Other / Unknown': {
    en: 'Other / Unknown',
    pt: 'Outro / Desconhecido',
    es: 'Otro / Desconocido',
  },
  'Pina Colada': { en: 'Piña Colada', pt: 'Piña Colada', es: 'Piña Colada' },
  'Punch / Party Drink': {
    en: 'Punch / Party Drink',
    pt: 'Ponche / Drink de Festa',
    es: 'Ponche / Bebida de Fiesta',
  },
  Sangria: { en: 'Sangria', pt: 'Sangria', es: 'Sangría' },
  Sazerac: { en: 'Sazerac', pt: 'Sazerac', es: 'Sazerac' },
  Screwdriver: { en: 'Screwdriver', pt: 'Chave de Fenda', es: 'Destornillador' },
  Shake: { en: 'Shake', pt: 'Milk-shake', es: 'Batido' },
  Shot: { en: 'Shot', pt: 'Shot', es: 'Chupito' },
  'Soft Drink': { en: 'Soft Drink', pt: 'Refrigerante', es: 'Refresco' },
  TestCat: { en: 'Test', pt: 'Teste', es: 'Prueba' },
}

async function main() {
  const { data: categories, error } = await supabase.from('categories').select('id, name')

  if (error) {
    console.error('Failed to fetch categories:', error.message)
    process.exit(1)
  }

  let updated = 0
  let skipped = 0

  for (const cat of categories ?? []) {
    const t = translations[cat.name]
    if (!t) {
      console.warn(`No translation for: "${cat.name}" — skipping`)
      skipped++
      continue
    }

    const { error: updateErr } = await supabase
      .from('categories')
      .update({ name_i18n: t })
      .eq('id', cat.id)

    if (updateErr) {
      console.error(`Failed to update "${cat.name}":`, updateErr.message)
    } else {
      console.log(`Updated: ${cat.name} → pt:"${t.pt}" / es:"${t.es}"`)
      updated++
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`)
}

main()
