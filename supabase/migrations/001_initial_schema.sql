-- =============================================================
-- LaPoison — Initial Schema
-- Created: 2026-05-13
-- =============================================================

-- Core tables (MVP original + extensions)
CREATE TABLE cocktails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  alcoholic BOOLEAN DEFAULT true,
  iba_drink BOOLEAN DEFAULT false,
  instructions TEXT,
  thumb_url TEXT,
  -- SEO extras
  slug TEXT UNIQUE NOT NULL,
  meta_title_pt TEXT, meta_title_en TEXT, meta_title_es TEXT,
  meta_desc_pt TEXT, meta_desc_en TEXT, meta_desc_es TEXT,
  description_pt TEXT, description_en TEXT, description_es TEXT,
  history_pt TEXT, history_en TEXT, history_es TEXT,
  fun_fact_pt TEXT, fun_fact_en TEXT, fun_fact_es TEXT,
  embedding_vector VECTOR(384), -- RAG embeddings
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT, -- spirit, liqueur, juice, etc
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE cocktail_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cocktail_id UUID REFERENCES cocktails(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  measure TEXT, -- "30ml", "1 oz", etc
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(cocktail_id, ingredient_id)
);

CREATE TABLE bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id UUID REFERENCES bars(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2),
  unit TEXT, -- ml, bottle, etc
  created_at TIMESTAMP DEFAULT now()
);

-- SaaS tables
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
  plan_type TEXT CHECK (plan_type IN ('free', 'pro_monthly', 'pro_yearly')),
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE user_drinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cocktail_id UUID REFERENCES cocktails(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  comment TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cocktail_id UUID REFERENCES cocktails(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE chatbot_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  query TEXT NOT NULL,
  tokens_in INT,
  tokens_out INT,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT now()
);

-- =============================================================
-- Indexes
-- =============================================================
CREATE INDEX idx_chatbot_usage_user ON chatbot_usage(user_id, created_at);
CREATE INDEX idx_chatbot_usage_ip ON chatbot_usage(ip_hash, created_at);
CREATE INDEX idx_cocktails_slug ON cocktails(slug);
CREATE INDEX idx_cocktails_category ON cocktails(category);
CREATE INDEX idx_bars_user ON bars(created_by_user_id);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_comments_cocktail ON comments(cocktail_id, created_at);
CREATE INDEX idx_user_drinks_user ON user_drinks(user_id);
