export interface Cocktail {
  id: string
  name: string
  slug: string
  category: string
  alcoholic: boolean
  instructions: string
  thumb: string
  description_pt?: string
  description_en?: string
  description_es?: string
  history_pt?: string
  history_en?: string
  history_es?: string
  fun_fact_pt?: string
  fun_fact_en?: string
  fun_fact_es?: string
  abv_estimate?: number
  difficulty?: number
  prep_time_minutes?: number
  created_at: string
  updated_at: string
}

export interface CocktailWithIngredients extends Cocktail {
  ingredients: Array<{
    ingredient_id: string
    name: string
    type: string
    measure_text: string
    amount_ml?: number
  }>
}

export interface Ingredient {
  id: string
  name: string
  name_i18n?: Record<string, string>
  type: string
  description?: string
  image?: string
  created_at: string
  updated_at: string
}

export interface IngredientWithCocktails extends Ingredient {
  cocktails: Array<{
    cocktail_id: string
    measure: string
    measure_ml?: number
  }>
}

export interface Bar {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface BarWithDetails extends Bar {
  inventory?: InventoryItem[]
  shared_with?: Array<{ user_id: string; username?: string }>
}

export interface InventoryItem {
  id: string
  bar_id: string
  ingredient_id?: string
  custom_name?: string
  category: 'ingredient' | 'food' | 'drink'
  quantity: number
  unit: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  username: string
  email: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  country?: string
  phone_number?: string
  display_name?: string
  is_admin: boolean
  role: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: 'active' | 'canceled' | 'past_due' | 'incomplete'
  plan: 'free' | 'pro_monthly' | 'pro_yearly'
  plan_type?: 'free' | 'pro_monthly' | 'pro_yearly' // DB column name
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
}

export interface ApiErrorResponse {
  error: string
  details?: string
}

export interface ApiSuccessResponse<T> {
  data: T
  success: true
}
