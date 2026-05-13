-- Add i18n and SEO columns to ingredients table
alter table ingredients
add column if not exists slug text unique,
add column if not exists name_i18n jsonb default '{"pt":"","en":"","es":""}',
add column if not exists description_i18n jsonb default '{"pt":"","en":"","es":""}',
add column if not exists aliases_i18n jsonb default '{"pt":[],"en":[],"es":[]}',
add column if not exists updated_at timestamp default now();

-- Add i18n and SEO columns to categories table (if it doesn't exist, create it)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_i18n jsonb default '{"pt":"","en":"","es":""}',
  slug text unique not null,
  description_pt text,
  description_en text,
  description_es text,
  search_doc_pt tsvector,
  search_doc_en tsvector,
  search_doc_es tsvector,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Update cocktails table to have more i18n fields
alter table cocktails
rename column instructions to instructions_en;

alter table cocktails
add column if not exists instructions_pt text,
add column if not exists instructions_es text,
add column if not exists category_id uuid references categories(id),
add column if not exists abv_estimate decimal(5,2),
add column if not exists difficulty int check (difficulty >= 1 and difficulty <= 5),
add column if not exists prep_time_minutes int,
add column if not exists flavor_tags text[] default '{}',
add column if not exists occasion_tags text[] default '{}',
add column if not exists rating_avg decimal(2,1),
add column if not exists rating_count int default 0,
add column if not exists search_doc_pt tsvector,
add column if not exists search_doc_en tsvector,
add column if not exists search_doc_es tsvector;

-- Create cocktail_ingredients table if it doesn't exist with proper columns
create table if not exists cocktail_ingredients (
  id uuid primary key default gen_random_uuid(),
  cocktail_id uuid not null references cocktails(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  measure_text text,
  amount_ml decimal(10,2),
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(cocktail_id, ingredient_id)
);

-- Create indexes for i18n search
create index if not exists idx_categories_slug on categories(slug);
create index if not exists idx_ingredients_slug on ingredients(slug);
create index if not exists idx_cocktails_category_id on cocktails(category_id);
create index if not exists idx_cocktails_difficulty on cocktails(difficulty);
create index if not exists idx_cocktails_abv on cocktails(abv_estimate);
create index if not exists idx_cocktail_ingredients_cocktail on cocktail_ingredients(cocktail_id);
create index if not exists idx_cocktail_ingredients_ingredient on cocktail_ingredients(ingredient_id);
