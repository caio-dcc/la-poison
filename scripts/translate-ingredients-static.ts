/**
 * Translates ingredient names using a hardcoded dictionary.
 * No API credits required.
 * Brand names keep the original. Generic ingredients get PT/ES translations.
 * Run: npx tsx scripts/translate-ingredients-static.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envLines = readFileSync(resolve(process.cwd(), '.env'), 'utf8').split('\n')
for (const line of envLines) {
  const m = line.match(/^([^#=\s]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '').trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// Dictionary: English name (lowercase) → { pt, es }
// Brand names map to themselves. Generic ingredients get real translations.
const TRANSLATIONS: Record<string, { pt: string; es: string }> = {
  // Spirits - brands (keep as-is)
  rum: { pt: 'Rum', es: 'Ron' },
  vodka: { pt: 'Vodka', es: 'Vodka' },
  gin: { pt: 'Gin', es: 'Gin' },
  tequila: { pt: 'Tequila', es: 'Tequila' },
  whisky: { pt: 'Whisky', es: 'Whisky' },
  whiskey: { pt: 'Whiskey', es: 'Whiskey' },
  bourbon: { pt: 'Bourbon', es: 'Bourbon' },
  cognac: { pt: 'Conhaque', es: 'Coñac' },
  brandy: { pt: 'Brandy', es: 'Brandy' },
  champagne: { pt: 'Champagne', es: 'Champán' },
  prosecco: { pt: 'Prosecco', es: 'Prosecco' },
  port: { pt: 'Vinho do Porto', es: 'Oporto' },
  'ruby port': { pt: 'Porto Rubi', es: 'Oporto Ruby' },
  sherry: { pt: 'Xerez', es: 'Jerez' },
  sake: { pt: 'Saquê', es: 'Sake' },
  mezcal: { pt: 'Mezcal', es: 'Mezcal' },
  pisco: { pt: 'Pisco', es: 'Pisco' },
  ouzo: { pt: 'Ouzo', es: 'Ouzo' },
  absinthe: { pt: 'Absinto', es: 'Absenta' },

  // Rum variations
  'light rum': { pt: 'Rum Branco', es: 'Ron Blanco' },
  'gold rum': { pt: 'Rum Dourado', es: 'Ron Dorado' },
  'dark rum': { pt: 'Rum Escuro', es: 'Ron Oscuro' },
  'spiced rum': { pt: 'Rum Temperado', es: 'Ron Especiado' },
  'coconut rum': { pt: 'Rum de Coco', es: 'Ron de Coco' },
  'añejo rum': { pt: 'Rum Añejo', es: 'Ron Añejo' },
  'blackstrap rum': { pt: 'Rum Blackstrap', es: 'Ron Blackstrap' },
  '151 proof rum': { pt: 'Rum 151', es: 'Ron 151' },

  // Whiskey variations
  scotch: { pt: 'Scotch', es: 'Scotch' },
  'blended scotch': { pt: 'Scotch Blended', es: 'Scotch Blended' },
  'blended whiskey': { pt: 'Whiskey Blended', es: 'Whiskey Blended' },
  'irish whiskey': { pt: 'Whiskey Irlandês', es: 'Whiskey Irlandés' },
  'rye whiskey': { pt: 'Whiskey de Centeio', es: 'Whiskey de Centeno' },
  'tennessee whiskey': { pt: 'Whiskey Tennessee', es: 'Whiskey Tennessee' },
  'islay single malt scotch': { pt: 'Scotch Single Malt Islay', es: 'Scotch Single Malt Islay' },

  // Gin variations
  'gin dry': { pt: 'Gin Seco', es: 'Gin Seco' },

  // Vodka variations
  'lime vodka': { pt: 'Vodka de Limão', es: 'Vodka de Lima' },
  'raspberry vodka': { pt: 'Vodka de Framboesa', es: 'Vodka de Frambuesa' },
  'cranberry vodka': { pt: 'Vodka de Cranberry', es: 'Vodka de Arándano' },
  'peach vodka': { pt: 'Vodka de Pêssego', es: 'Vodka de Durazno' },
  'vodka flavored': { pt: 'Vodka Aromatizada', es: 'Vodka Aromatizada' },

  // Brandy variations
  'apple brandy': { pt: 'Brandy de Maçã', es: 'Brandy de Manzana' },
  'apricot brandy': { pt: 'Brandy de Damasco', es: 'Brandy de Albaricoque' },
  'cherry brandy': { pt: 'Brandy de Cereja', es: 'Brandy de Cereza' },
  'blackberry brandy': { pt: 'Brandy de Amora', es: 'Brandy de Zarzamora' },
  'peach brandy': { pt: 'Brandy de Pêssego', es: 'Brandy de Durazno' },
  'coffee brandy': { pt: 'Brandy de Café', es: 'Brandy de Café' },
  applejack: { pt: 'Applejack', es: 'Applejack' },

  // Liqueurs & brand liqueurs
  amaretto: { pt: 'Amaretto', es: 'Amaretto' },
  aperol: { pt: 'Aperol', es: 'Aperol' },
  campari: { pt: 'Campari', es: 'Campari' },
  'baileys irish cream': { pt: 'Baileys', es: 'Baileys' },
  'irish cream': { pt: 'Creme Irlandês', es: 'Crema Irlandesa' },
  kahlua: { pt: 'Kahlúa', es: 'Kahlúa' },
  'tia maria': { pt: 'Tia Maria', es: 'Tia Maria' },
  'coffee liqueur': { pt: 'Licor de Café', es: 'Licor de Café' },
  'chocolate liqueur': { pt: 'Licor de Chocolate', es: 'Licor de Chocolate' },
  'banana liqueur': { pt: 'Licor de Banana', es: 'Licor de Banana' },
  'coconut liqueur': { pt: 'Licor de Coco', es: 'Licor de Coco' },
  'raspberry liqueur': { pt: 'Licor de Framboesa', es: 'Licor de Frambuesa' },
  'melon liqueur': { pt: 'Licor de Melão', es: 'Licor de Melón' },
  'kiwi liqueur': { pt: 'Licor de Kiwi', es: 'Licor de Kiwi' },
  'cherry liqueur': { pt: 'Licor de Cereja', es: 'Licor de Cereza' },
  'blue curacao': { pt: 'Blue Curaçao', es: 'Blue Curaçao' },
  'orange curacao': { pt: 'Curaçao de Laranja', es: 'Curaçao de Naranja' },
  'triple sec': { pt: 'Triple Sec', es: 'Triple Sec' },
  cointreau: { pt: 'Cointreau', es: 'Cointreau' },
  'grand marnier': { pt: 'Grand Marnier', es: 'Grand Marnier' },
  'chambord raspberry liqueur': { pt: 'Chambord', es: 'Chambord' },
  chambord: { pt: 'Chambord', es: 'Chambord' },
  'peach schnapps': { pt: 'Schnaps de Pêssego', es: 'Schnapps de Durazno' },
  'peachtree schnapps': { pt: 'Peachtree Schnapps', es: 'Peachtree Schnapps' },
  'butterscotch schnapps': { pt: 'Schnaps de Butterscotch', es: 'Schnapps de Butterscotch' },
  'peppermint schnapps': { pt: 'Schnaps de Hortelã', es: 'Schnapps de Menta' },
  'strawberry schnapps': { pt: 'Schnaps de Morango', es: 'Schnapps de Fresa' },
  galliano: { pt: 'Galliano', es: 'Galliano' },
  benedictine: { pt: 'Bénédictine', es: 'Benedictine' },
  drambuie: { pt: 'Drambuie', es: 'Drambuie' },
  frangelico: { pt: 'Frangelico', es: 'Frangelico' },
  'godiva liqueur': { pt: 'Licor Godiva', es: 'Licor Godiva' },
  goldschlager: { pt: 'Goldschläger', es: 'Goldschläger' },
  'southern comfort': { pt: 'Southern Comfort', es: 'Southern Comfort' },
  'midori melon liqueur': { pt: 'Midori', es: 'Midori' },
  'pisang ambon': { pt: 'Pisang Ambon', es: 'Pisang Ambon' },
  passoa: { pt: 'Passoa', es: 'Passoa' },
  'creme de cacao': { pt: 'Crème de Cacao', es: 'Crème de Cacao' },
  'creme de cassis': { pt: 'Crème de Cassis', es: 'Crème de Cassis' },
  'creme de mure': { pt: 'Crème de Mûre', es: 'Crème de Mûre' },
  'creme de banane': { pt: 'Crème de Banane', es: 'Crème de Banane' },
  'green creme de menthe': { pt: 'Crème de Menthe Verde', es: 'Crème de Menthe Verde' },
  'white creme de menthe': { pt: 'Crème de Menthe Branco', es: 'Crème de Menthe Blanco' },
  'sloe gin': { pt: 'Sloe Gin', es: 'Sloe Gin' },
  lillet: { pt: 'Lillet', es: 'Lillet' },
  'lillet blanc': { pt: 'Lillet Blanc', es: 'Lillet Blanc' },
  advocaat: { pt: 'Advocaat', es: 'Advocaat' },
  anisette: { pt: 'Anisete', es: 'Anisette' },
  anis: { pt: 'Anis', es: 'Anís' },
  ouzo: { pt: 'Ouzo', es: 'Ouzo' },
  sambuca: { pt: 'Sambuca', es: 'Sambuca' },
  'black sambuca': { pt: 'Sambuca Negra', es: 'Sambuca Negra' },
  pernod: { pt: 'Pernod', es: 'Pernod' },
  ricard: { pt: 'Ricard', es: 'Ricard' },
  'amaro montenegro': { pt: 'Amaro Montenegro', es: 'Amaro Montenegro' },
  'st. germain': { pt: 'St-Germain', es: 'St-Germain' },
  apfelkorn: { pt: 'Apfelkorn', es: 'Apfelkorn' },
  everclear: { pt: 'Everclear', es: 'Everclear' },
  'grain alcohol': { pt: 'Álcool de Cereais', es: 'Alcohol de Cereales' },

  // Vermouth & Wine-based
  'dry vermouth': { pt: 'Vermute Seco', es: 'Vermut Seco' },
  'sweet vermouth': { pt: 'Vermute Doce', es: 'Vermut Dulce' },
  'rosso vermouth': { pt: 'Vermute Rosso', es: 'Vermut Rosso' },
  'dubonnet rouge': { pt: 'Dubonnet Rouge', es: 'Dubonnet Rouge' },
  'red wine': { pt: 'Vinho Tinto', es: 'Vino Tinto' },
  'white wine': { pt: 'Vinho Branco', es: 'Vino Blanco' },
  rose: { pt: 'Vinho Rosé', es: 'Vino Rosado' },
  cider: { pt: 'Sidra', es: 'Sidra' },
  beer: { pt: 'Cerveja', es: 'Cerveza' },
  lager: { pt: 'Cerveja Lager', es: 'Cerveza Lager' },
  'lager beer': { pt: 'Cerveja Lager', es: 'Cerveza Lager' },

  // Bitters
  'angostura bitters': { pt: 'Angostura', es: 'Angostura' },
  'orange bitters': { pt: 'Bitter de Laranja', es: 'Bitter de Naranja' },
  'peach bitters': { pt: 'Bitter de Pêssego', es: 'Bitter de Durazno' },
  'peychaud bitters': { pt: "Peychaud's Bitters", es: "Peychaud's Bitters" },

  // Non-alcoholic liquids
  water: { pt: 'Água', es: 'Agua' },
  'club soda': { pt: 'Água com Gás', es: 'Agua con Gas' },
  'soda water': { pt: 'Água com Gás', es: 'Agua Carbonatada' },
  'carbonated water': { pt: 'Água Carbonatada', es: 'Agua Carbonatada' },
  'carbonated soft drink': { pt: 'Refrigerante', es: 'Refresco' },
  'sparkling wine': { pt: 'Vinho Espumante', es: 'Vino Espumoso' },
  'ginger ale': { pt: 'Ginger Ale', es: 'Ginger Ale' },
  'coca-cola': { pt: 'Coca-Cola', es: 'Coca-Cola' },
  cola: { pt: 'Cola', es: 'Cola' },
  'pepsi cola': { pt: 'Pepsi', es: 'Pepsi' },
  sprite: { pt: 'Sprite', es: 'Sprite' },
  '7-up': { pt: '7-Up', es: '7-Up' },
  'dr. pepper': { pt: 'Dr. Pepper', es: 'Dr. Pepper' },
  'mountain dew': { pt: 'Mountain Dew', es: 'Mountain Dew' },
  fresca: { pt: 'Fresca', es: 'Fresca' },
  surge: { pt: 'Surge', es: 'Surge' },
  zima: { pt: 'Zima', es: 'Zima' },
  'kool-aid': { pt: 'Kool-Aid', es: 'Kool-Aid' },
  'iced tea': { pt: 'Chá Gelado', es: 'Té Helado' },
  'lemon-lime soda': { pt: 'Refrigerante Limão', es: 'Refresco de Limón' },
  'bitter lemon': { pt: 'Bitter Lemon', es: 'Bitter Limón' },
  'schweppes russchian': { pt: 'Schweppes Russchian', es: 'Schweppes Russchian' },

  // Juices
  'apple juice': { pt: 'Suco de Maçã', es: 'Jugo de Manzana' },
  'orange juice': { pt: 'Suco de Laranja', es: 'Jugo de Naranja' },
  'lemon juice': { pt: 'Suco de Limão', es: 'Jugo de Limón' },
  'lime juice': { pt: 'Suco de Lima', es: 'Jugo de Lima' },
  'fresh lemon juice': { pt: 'Suco de Limão Fresco', es: 'Jugo de Limón Fresco' },
  'fresh lime juice': { pt: 'Suco de Lima Fresco', es: 'Jugo de Lima Fresco' },
  'cranberry juice': { pt: 'Suco de Cranberry', es: 'Jugo de Arándano' },
  'pineapple juice': { pt: 'Suco de Abacaxi', es: 'Jugo de Piña' },
  'grapefruit juice': { pt: 'Suco de Toranja', es: 'Jugo de Pomelo' },
  'tomato juice': { pt: 'Suco de Tomate', es: 'Jugo de Tomate' },
  'grape juice': { pt: 'Suco de Uva', es: 'Jugo de Uva' },
  'peach nectar': { pt: 'Néctar de Pêssego', es: 'Néctar de Durazno' },
  'apricot nectar': { pt: 'Néctar de Damasco', es: 'Néctar de Albaricoque' },
  'cherry juice': { pt: 'Suco de Cereja', es: 'Jugo de Cereza' },
  'passion fruit juice': { pt: 'Suco de Maracujá', es: 'Jugo de Maracuyá' },
  'pomegranate juice': { pt: 'Suco de Romã', es: 'Jugo de Granada' },
  lemonade: { pt: 'Limonada', es: 'Limonada' },
  limeade: { pt: 'Limonada de Lima', es: 'Limonada de Lima' },
  'pink lemonade': { pt: 'Limonada Rosa', es: 'Limonada Rosa' },
  'fruit juice': { pt: 'Suco de Fruta', es: 'Jugo de Fruta' },
  'papaya juice': { pt: 'Suco de Mamão', es: 'Jugo de Papaya' },

  // Dairy & Cream
  milk: { pt: 'Leite', es: 'Leche' },
  cream: { pt: 'Creme de Leite', es: 'Crema' },
  'heavy cream': { pt: 'Creme de Leite', es: 'Crema de Leche' },
  'light cream': { pt: 'Creme de Leite Light', es: 'Crema Light' },
  'whipped cream': { pt: 'Chantilly', es: 'Crema Batida' },
  'whipping cream': { pt: 'Creme para Chantilly', es: 'Crema para Batir' },
  'half-and-half': { pt: 'Meio a Meio', es: 'Mitad y Mitad' },
  'condensed milk': { pt: 'Leite Condensado', es: 'Leche Condensada' },
  'cream of coconut': { pt: 'Creme de Coco', es: 'Crema de Coco' },
  'coconut milk': { pt: 'Leite de Coco', es: 'Leche de Coco' },
  yoghurt: { pt: 'Iogurte', es: 'Yogur' },

  // Eggs
  egg: { pt: 'Ovo', es: 'Huevo' },
  'egg yolk': { pt: 'Gema de Ovo', es: 'Yema de Huevo' },
  'egg white': { pt: 'Clara de Ovo', es: 'Clara de Huevo' },

  // Sweeteners & Syrups
  sugar: { pt: 'Açúcar', es: 'Azúcar' },
  'sugar syrup': { pt: 'Xarope de Açúcar', es: 'Jarabe de Azúcar' },
  'simple syrup': { pt: 'Xarope Simples', es: 'Jarabe Simple' },
  'brown sugar': { pt: 'Açúcar Mascavo', es: 'Azúcar Moreno' },
  'powdered sugar': { pt: 'Açúcar de Confeiteiro', es: 'Azúcar en Polvo' },
  'demerara sugar': { pt: 'Açúcar Demerara', es: 'Azúcar Demerara' },
  honey: { pt: 'Mel', es: 'Miel' },
  'honey syrup': { pt: 'Xarope de Mel', es: 'Jarabe de Miel' },
  'maple syrup': { pt: 'Xarope de Bordo', es: 'Jarabe de Arce' },
  'corn syrup': { pt: 'Xarope de Milho', es: 'Jarabe de Maíz' },
  'chocolate syrup': { pt: 'Calda de Chocolate', es: 'Jarabe de Chocolate' },
  grenadine: { pt: 'Granadina', es: 'Granadina' },
  'raspberry syrup': { pt: 'Xarope de Framboesa', es: 'Jarabe de Frambuesa' },
  'strawberry syrup': { pt: 'Xarope de Morango', es: 'Jarabe de Fresa' },
  'passion fruit syrup': { pt: 'Xarope de Maracujá', es: 'Jarabe de Maracuyá' },
  'pineapple syrup': { pt: 'Xarope de Abacaxi', es: 'Jarabe de Piña' },
  'mint syrup': { pt: 'Xarope de Hortelã', es: 'Jarabe de Menta' },
  'ginger syrup': { pt: 'Xarope de Gengibre', es: 'Jarabe de Jengibre' },
  'orgeat syrup': { pt: 'Orgeat', es: 'Orgeat' },
  'coconut syrup': { pt: 'Xarope de Coco', es: 'Jarabe de Coco' },
  'vanilla syrup': { pt: 'Xarope de Baunilha', es: 'Jarabe de Vainilla' },
  'rosemary syrup': { pt: 'Xarope de Alecrim', es: 'Jarabe de Romero' },
  'sirup of roses': { pt: 'Xarope de Rosas', es: 'Jarabe de Rosas' },
  'caramel coloring': { pt: 'Corante de Caramelo', es: 'Colorante de Caramelo' },
  falernum: { pt: 'Falernum', es: 'Falernum' },
  'blackcurrant cordial': { pt: 'Cordial de Groselha Negra', es: 'Cordial de Grosella Negra' },
  'lime cordial': { pt: 'Cordial de Lima', es: 'Cordial de Lima' },
  'elderflower cordial': { pt: 'Cordial de Sabugueiro', es: 'Cordial de Flor de Saúco' },
  'sour mix': { pt: 'Mix Azedo', es: 'Mezcla Agria' },
  'sweet and sour': { pt: 'Agridoce', es: 'Agridulce' },
  'daiquiri mix': { pt: 'Mix de Daiquiri', es: 'Mezcla de Daiquiri' },
  'pina colada mix': { pt: 'Mix de Piña Colada', es: 'Mezcla de Piña Colada' },
  'fruit punch': { pt: 'Ponche de Frutas', es: 'Ponche de Frutas' },

  // Fruits & Garnishes
  apple: { pt: 'Maçã', es: 'Manzana' },
  banana: { pt: 'Banana', es: 'Plátano' },
  cherry: { pt: 'Cereja', es: 'Cereza' },
  cherries: { pt: 'Cerejas', es: 'Cerezas' },
  'maraschino cherry': { pt: 'Cereja Maraschino', es: 'Cereza Maraschino' },
  lime: { pt: 'Lima', es: 'Lima' },
  lemon: { pt: 'Limão Siciliano', es: 'Limón' },
  orange: { pt: 'Laranja', es: 'Naranja' },
  pineapple: { pt: 'Abacaxi', es: 'Piña' },
  strawberries: { pt: 'Morangos', es: 'Fresas' },
  blackberries: { pt: 'Amoras', es: 'Zarzamoras' },
  mango: { pt: 'Manga', es: 'Mango' },
  papaya: { pt: 'Mamão', es: 'Papaya' },
  kiwi: { pt: 'Kiwi', es: 'Kiwi' },
  figs: { pt: 'Figos', es: 'Higos' },
  'blood orange': { pt: 'Laranja Sanguínea', es: 'Naranja Sanguina' },
  fruit: { pt: 'Fruta', es: 'Fruta' },
  olive: { pt: 'Azeitona', es: 'Aceituna' },
  cucumber: { pt: 'Pepino', es: 'Pepino' },
  'lemon peel': { pt: 'Casca de Limão Siciliano', es: 'Cáscara de Limón' },
  'lime peel': { pt: 'Casca de Lima', es: 'Cáscara de Lima' },
  'orange peel': { pt: 'Casca de Laranja', es: 'Cáscara de Naranja' },
  'orange spiral': { pt: 'Espiral de Laranja', es: 'Espiral de Naranja' },
  'grape soda': { pt: 'Refrigerante de Uva', es: 'Refresco de Uva' },

  // Herbs & Spices
  mint: { pt: 'Hortelã', es: 'Menta' },
  basil: { pt: 'Manjericão', es: 'Albahaca' },
  rosemary: { pt: 'Alecrim', es: 'Romero' },
  lavender: { pt: 'Lavanda', es: 'Lavanda' },
  ginger: { pt: 'Gengibre', es: 'Jengibre' },
  cinnamon: { pt: 'Canela', es: 'Canela' },
  clove: { pt: 'Cravo', es: 'Clavo' },
  cloves: { pt: 'Cravos', es: 'Clavos' },
  allspice: { pt: 'Pimenta da Jamaica', es: 'Pimienta de Jamaica' },
  cardamom: { pt: 'Cardamomo', es: 'Cardamomo' },
  vanilla: { pt: 'Baunilha', es: 'Vainilla' },
  'vanilla extract': { pt: 'Extrato de Baunilha', es: 'Extracto de Vainilla' },
  pepper: { pt: 'Pimenta', es: 'Pimienta' },
  'black pepper': { pt: 'Pimenta Preta', es: 'Pimienta Negra' },
  'cayenne pepper': { pt: 'Pimenta Cayenne', es: 'Pimienta de Cayena' },
  'red chili flakes': { pt: 'Pimenta em Flocos', es: 'Hojuelas de Chile' },
  coriander: { pt: 'Coentro', es: 'Cilantro' },
  'cumin seed': { pt: 'Semente de Cominho', es: 'Semilla de Comino' },
  asafoetida: { pt: 'Assafétida', es: 'Asafétida' },
  wormwood: { pt: 'Absinto', es: 'Ajenjo' },
  tea: { pt: 'Chá', es: 'Té' },
  coffee: { pt: 'Café', es: 'Café' },
  espresso: { pt: 'Espresso', es: 'Espresso' },
  'hot chocolate': { pt: 'Chocolate Quente', es: 'Chocolate Caliente' },
  'cocoa powder': { pt: 'Cacau em Pó', es: 'Cacao en Polvo' },
  chocolate: { pt: 'Chocolate', es: 'Chocolate' },

  // Condiments & Other
  salt: { pt: 'Sal', es: 'Sal' },
  'celery salt': { pt: 'Sal de Aipo', es: 'Sal de Apio' },
  'tabasco sauce': { pt: 'Molho Tabasco', es: 'Salsa Tabasco' },
  'hot sauce': { pt: 'Molho Picante', es: 'Salsa Picante' },
  'worcestershire sauce': { pt: 'Molho Inglês', es: 'Salsa Inglesa' },
  'soy sauce': { pt: 'Molho de Soja', es: 'Salsa de Soja' },
  'olive brine': { pt: 'Salmoura de Azeitona', es: 'Salmuera de Aceitunas' },
  'almond flavoring': { pt: 'Essência de Amêndoa', es: 'Esencia de Almendra' },

  // Misc
  ice: { pt: 'Gelo', es: 'Hielo' },
  butter: { pt: 'Manteiga', es: 'Mantequilla' },
  marshmallows: { pt: 'Marshmallows', es: 'Malvaviscos' },
  jello: { pt: 'Gelatina', es: 'Gelatina' },
  'oreo cookie': { pt: 'Biscoito Oreo', es: 'Galleta Oreo' },
  'vanilla ice-cream': { pt: 'Sorvete de Baunilha', es: 'Helado de Vainilla' },
  sarsaparilla: { pt: 'Salsaparrilha', es: 'Zarzaparrilla' },
  'root beer': { pt: 'Root Beer', es: 'Cerveza de Raíz' },
  sherbet: { pt: 'Sorvete', es: 'Sorbete' },
  'hot damn': { pt: 'Hot Damn', es: 'Hot Damn' },
  firewater: { pt: 'Firewater', es: 'Aguardiente' },
  'yukon jack': { pt: 'Yukon Jack', es: 'Yukon Jack' },
  'wild turkey': { pt: 'Wild Turkey', es: 'Wild Turkey' },
  'jack daniels': { pt: "Jack Daniel's", es: "Jack Daniel's" },
  'jim beam': { pt: 'Jim Beam', es: 'Jim Beam' },
  jagermeister: { pt: 'Jägermeister', es: 'Jägermeister' },
  jägermeister: { pt: 'Jägermeister', es: 'Jägermeister' },
  'crown royal': { pt: 'Crown Royal', es: 'Crown Royal' },
  'absolut vodka': { pt: 'Absolut Vodka', es: 'Absolut Vodka' },
  'absolut citron': { pt: 'Absolut Citron', es: 'Absolut Citron' },
  'absolut kurant': { pt: 'Absolut Kurant', es: 'Absolut Kurant' },
  'absolut peppar': { pt: 'Absolut Peppar', es: 'Absolut Peppar' },
  'bacardi limon': { pt: 'Bacardi Limón', es: 'Bacardi Limón' },
  'malibu rum': { pt: 'Malibu', es: 'Malibu' },
  corona: { pt: 'Corona', es: 'Corona' },
  'guinness stout': { pt: 'Guinness', es: 'Guinness' },
  cachaca: { pt: 'Cachaça', es: 'Cachaça' },
  cachaça: { pt: 'Cachaça', es: 'Cachaça' },
  'maraschino liqueur': { pt: 'Licor Maraschino', es: 'Licor Maraschino' },
  'cherry heering': { pt: 'Cherry Heering', es: 'Cherry Heering' },
  'green chartreuse': { pt: 'Chartreuse Verde', es: 'Chartreuse Verde' },
  'yellow chartreuse': { pt: 'Chartreuse Amarelo', es: 'Chartreuse Amarillo' },
  chartreuse: { pt: 'Chartreuse', es: 'Chartreuse' },
  'peach schnapps': { pt: 'Schnaps de Pêssego', es: 'Schnapps de Durazno' },
  'maraschino cherry': { pt: 'Cereja Maraschino', es: 'Cereza Maraschino' },
  'rum spiced': { pt: 'Rum Temperado', es: 'Ron Especiado' },
}

type Ingredient = {
  id: string
  name: string
  name_i18n: Record<string, string> | null
}

function getTranslation(name: string): { pt: string; es: string } | null {
  const key = name.toLowerCase().trim()
  return TRANSLATIONS[key] ?? null
}

async function main() {
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('id, name, name_i18n')

  if (error) {
    console.error('Failed to fetch:', error.message)
    process.exit(1)
  }

  const all = (ingredients ?? []) as Ingredient[]
  console.log(`Total ingredients: ${all.length}`)

  let updated = 0
  let alreadyOk = 0
  let notFound = 0
  const missing: string[] = []

  for (const ing of all) {
    const n = ing.name_i18n as Record<string, string> | null
    const enName = n?.en || ing.name
    const ptName = n?.pt || ''
    const esName = n?.es || ''

    // Skip if already properly translated (pt != en and es != en and both non-empty)
    const alreadyTranslated = ptName && esName && ptName !== enName && esName !== enName
    if (alreadyTranslated) {
      alreadyOk++
      continue
    }

    const t = getTranslation(ing.name)
    if (!t) {
      missing.push(ing.name)
      notFound++
      continue
    }

    const name_i18n = { en: enName, pt: t.pt, es: t.es }
    const { error: updateErr } = await supabase
      .from('ingredients')
      .update({ name_i18n })
      .eq('id', ing.id)

    if (updateErr) {
      console.error(`  [ERR] "${ing.name}": ${updateErr.message}`)
    } else {
      const changed = t.pt !== enName || t.es !== enName
      console.log(`  ${changed ? '✓' : '○'} ${ing.name} → pt:"${t.pt}" / es:"${t.es}"`)
      updated++
    }
  }

  console.log(`\n--- Done ---`)
  console.log(`Updated: ${updated}`)
  console.log(`Already translated: ${alreadyOk}`)
  console.log(`Not in dictionary: ${notFound}`)

  if (missing.length > 0) {
    console.log(`\nMissing from dictionary (${missing.length}):`)
    missing.forEach(m => console.log(`  - ${m}`))
  }
}

main()
