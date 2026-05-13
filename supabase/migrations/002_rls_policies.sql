-- =============================================================
-- LaPoison — Row Level Security Policies
-- Run AFTER 001_initial_schema.sql
-- =============================================================

-- =====================
-- cocktails (public read, admin write)
-- =====================
ALTER TABLE cocktails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cocktails"
  ON cocktails FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert cocktails"
  ON cocktails FOR INSERT
  WITH CHECK (false); -- handled via service key in scripts/edge functions

CREATE POLICY "Only service role can update cocktails"
  ON cocktails FOR UPDATE
  USING (false);

-- =====================
-- ingredients (public read, admin write)
-- =====================
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ingredients"
  ON ingredients FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert ingredients"
  ON ingredients FOR INSERT
  WITH CHECK (false);

-- =====================
-- cocktail_ingredients (public read, admin write)
-- =====================
ALTER TABLE cocktail_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cocktail_ingredients"
  ON cocktail_ingredients FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert cocktail_ingredients"
  ON cocktail_ingredients FOR INSERT
  WITH CHECK (false);

-- =====================
-- bars (owner-only CRUD)
-- =====================
ALTER TABLE bars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bars"
  ON bars FOR SELECT
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can create bars"
  ON bars FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid());

CREATE POLICY "Users can update own bars"
  ON bars FOR UPDATE
  USING (created_by_user_id = auth.uid());

CREATE POLICY "Users can delete own bars"
  ON bars FOR DELETE
  USING (created_by_user_id = auth.uid());

-- =====================
-- inventory_items (bar owner only)
-- =====================
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read inventory of own bars"
  ON inventory_items FOR SELECT
  USING (
    bar_id IN (SELECT id FROM bars WHERE created_by_user_id = auth.uid())
  );

CREATE POLICY "Users can insert into own bars"
  ON inventory_items FOR INSERT
  WITH CHECK (
    bar_id IN (SELECT id FROM bars WHERE created_by_user_id = auth.uid())
  );

CREATE POLICY "Users can update own bar inventory"
  ON inventory_items FOR UPDATE
  USING (
    bar_id IN (SELECT id FROM bars WHERE created_by_user_id = auth.uid())
  );

CREATE POLICY "Users can delete from own bar inventory"
  ON inventory_items FOR DELETE
  USING (
    bar_id IN (SELECT id FROM bars WHERE created_by_user_id = auth.uid())
  );

-- =====================
-- subscriptions (user reads own, service writes)
-- =====================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Only service role can manage subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (false); -- Stripe webhook via service key

CREATE POLICY "Only service role can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (false);

-- =====================
-- user_drinks (owner CRUD, public read approved)
-- =====================
ALTER TABLE user_drinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved drinks"
  ON user_drinks FOR SELECT
  USING (approved = true OR user_id = auth.uid());

CREATE POLICY "Authenticated users can submit drinks"
  ON user_drinks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own drinks"
  ON user_drinks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own drinks"
  ON user_drinks FOR DELETE
  USING (user_id = auth.uid());

-- =====================
-- comments (public read approved, auth insert)
-- =====================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved comments"
  ON comments FOR SELECT
  USING (approved = true OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());

-- =====================
-- chatbot_usage (user reads own, service writes)
-- =====================
ALTER TABLE chatbot_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chatbot usage"
  ON chatbot_usage FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Only service role can insert usage"
  ON chatbot_usage FOR INSERT
  WITH CHECK (false); -- written by edge function with service key
