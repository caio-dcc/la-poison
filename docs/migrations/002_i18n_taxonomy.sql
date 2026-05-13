-- 002_i18n_taxonomy.sql
-- Reorganiza schema para suportar i18n em ingredientes/categorias
-- e enriquecimento de coquetéis com metadata de SEO/chatbot

-- 1. Criar ENUM para tipos de ingrediente (taxonomia controlada)
CREATE TYPE ingredient_type AS ENUM (
  'spirit',
  'liqueur',
  'juice',
  'mixer',
  'herb',
  'spice',
  'syrup',
  'bitters',
  'cordial',
  'wine',
  'vermouth',
  'other'
);

-- 2. Recriar tabela 'ingredients' com i18n JSONB
DROP TABLE IF EXISTS cocktail_ingredients CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- Nome em EN (chave primária legível)
  name_i18n JSONB NOT NULL DEFAULT '{"pt": "", "en": "", "es": ""}',  -- {pt: "limão", en: "lemon", es: "limón"}
  slug TEXT UNIQUE NOT NULL,  -- Para `/drinks/ingrediente/[slug]`
  type ingredient_type NOT NULL DEFAULT 'other',  -- Taxonomia fechada
  description_pt TEXT,
  description_en TEXT,
  description_es TEXT,
  -- Sinônimos por idioma (ex: ["cachaça", "pinga"] em PT)
  aliases_i18n JSONB DEFAULT '{"pt": [], "en": [], "es": []}',
  -- Full-text search tsvector por idioma
  search_doc_pt tsvector,
  search_doc_en tsvector,
  search_doc_es tsvector,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(slug)
);

CREATE INDEX idx_ingredients_name_i18n_pt ON ingredients USING GIN ((name_i18n -> 'pt'));
CREATE INDEX idx_ingredients_name_i18n_en ON ingredients USING GIN ((name_i18n -> 'en'));
CREATE INDEX idx_ingredients_name_i18n_es ON ingredients USING GIN ((name_i18n -> 'es'));
CREATE INDEX idx_ingredients_type ON ingredients(type);
CREATE INDEX idx_ingredients_search_doc_pt ON ingredients USING GIN(search_doc_pt);
CREATE INDEX idx_ingredients_search_doc_en ON ingredients USING GIN(search_doc_en);
CREATE INDEX idx_ingredients_search_doc_es ON ingredients USING GIN(search_doc_es);
CREATE INDEX idx_ingredients_aliases_pt ON ingredients USING GIN ((aliases_i18n -> 'pt'));

-- 3. Criar tabela 'categories' (antes era TEXT livre em cocktails.category)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,  -- Nome em EN
  name_i18n JSONB NOT NULL DEFAULT '{"pt": "", "en": "", "es": ""}',  -- {pt: "Tequila", en: "Tequila", es: "Tequila"}
  slug TEXT UNIQUE NOT NULL,  -- Para `/drinks/categoria/[slug]`
  description_pt TEXT,
  description_en TEXT,
  description_es TEXT,
  search_doc_pt tsvector,
  search_doc_en tsvector,
  search_doc_es tsvector,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(slug)
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_search_doc_pt ON categories USING GIN(search_doc_pt);
CREATE INDEX idx_categories_search_doc_en ON categories USING GIN(search_doc_en);
CREATE INDEX idx_categories_search_doc_es ON categories USING GIN(search_doc_es);

-- 4. Atualizar tabela 'cocktails' com novos campos
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS abv_estimate FLOAT;
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS difficulty INT CHECK (difficulty BETWEEN 1 AND 5);
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS prep_time_minutes INT;
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS flavor_tags TEXT[];
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS occasion_tags TEXT[];
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS search_doc_pt tsvector;
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS search_doc_en tsvector;
ALTER TABLE cocktails ADD COLUMN IF NOT EXISTS search_doc_es tsvector;

CREATE INDEX IF NOT EXISTS idx_cocktails_category_id ON cocktails(category_id);
CREATE INDEX IF NOT EXISTS idx_cocktails_flavor_tags ON cocktails USING GIN(flavor_tags);
CREATE INDEX IF NOT EXISTS idx_cocktails_occasion_tags ON cocktails USING GIN(occasion_tags);
CREATE INDEX IF NOT EXISTS idx_cocktails_search_doc_pt ON cocktails USING GIN(search_doc_pt);
CREATE INDEX IF NOT EXISTS idx_cocktails_search_doc_en ON cocktails USING GIN(search_doc_en);
CREATE INDEX IF NOT EXISTS idx_cocktails_search_doc_es ON cocktails USING GIN(search_doc_es);

-- 5. Recriar tabela 'cocktail_ingredients' com medidas normalizadas
DROP TABLE IF EXISTS cocktail_ingredients CASCADE;

CREATE TABLE cocktail_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cocktail_id UUID NOT NULL REFERENCES cocktails(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  amount_ml DECIMAL(10, 2),  -- Valor em ml para filtros numéricos
  unit_original TEXT,  -- Original da API ("1 oz", "30ml", "dash", etc)
  measure_text TEXT,  -- Display text (ex: "30 ml ou 1 oz")
  order_index INT DEFAULT 0,  -- Ordem de exibição
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(cocktail_id, ingredient_id),
  CONSTRAINT valid_amount CHECK (amount_ml > 0 OR amount_ml IS NULL)
);

CREATE INDEX idx_cocktail_ingredients_cocktail ON cocktail_ingredients(cocktail_id);
CREATE INDEX idx_cocktail_ingredients_ingredient ON cocktail_ingredients(ingredient_id);
CREATE INDEX idx_cocktail_ingredients_amount ON cocktail_ingredients(amount_ml);

-- 6. Função trigger para atualizar 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cocktails_updated_at BEFORE UPDATE ON cocktails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Migração: Popular categorias a partir de cocktails.category (TEXT antigo)
-- Este passo requer que você tenha a tabela 'cocktails' com dados
-- Após executar, você pode fazer a limpeza manual ou via script

-- Exemplo de inserção manual de categorias comuns (fazer via script de seed):
-- INSERT INTO categories (name, name_i18n, slug, description_pt, description_en, description_es)
-- VALUES
--   ('Martini', '{"pt": "Martini", "en": "Martini", "es": "Martini"}', 'martini', NULL, NULL, NULL),
--   ('Margarita', '{"pt": "Margarita", "en": "Margarita", "es": "Margarita"}', 'margarita', NULL, NULL, NULL),
--   ...
-- ON CONFLICT (slug) DO NOTHING;

COMMIT;
