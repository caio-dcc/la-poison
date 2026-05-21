'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getDrinkInteractiveState(cocktailId: string) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let isFavorited = false
  let userRating: { rating: number; comment: string | null } | null = null
  let allRatings: Array<{
    id: string
    rating: number
    comment: string | null
    created_at: string
    user_id: string
  }> = []

  try {
    // Fetch all ratings
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select('id, rating, comment, created_at, user_id')
      .eq('cocktail_id', cocktailId)
      .order('created_at', { ascending: false })

    if (ratingsError) {
      if (ratingsError.message.includes('relation "ratings" does not exist')) {
        return {
          dbNotMigrated: true,
          isFavorited: false,
          userRating: null,
          allRatings: [],
          averageRating: 0,
          isAuthenticated: false,
        }
      }
      throw ratingsError
    }

    allRatings = ratingsData || []

    if (session?.user?.id) {
      const userId = session.user.id

      // Check if user has rating
      const ownRating = allRatings.find(r => r.user_id === userId)
      if (ownRating) {
        userRating = { rating: ownRating.rating, comment: ownRating.comment }
      }

      // Check if favorited
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select('id')
        .eq('cocktail_id', cocktailId)
        .eq('user_id', userId)
        .maybeSingle()

      if (favError && !favError.message.includes('relation "favorites" does not exist')) {
        throw favError
      }
      isFavorited = !!favData
    }
  } catch (error) {
    console.error('Error fetching interactive state:', error)
  }

  const totalRating = allRatings.reduce((acc, r) => acc + r.rating, 0)
  const averageRating =
    allRatings.length > 0 ? Number((totalRating / allRatings.length).toFixed(1)) : 0

  return {
    dbNotMigrated: false,
    isFavorited,
    userRating,
    allRatings,
    averageRating,
    isAuthenticated: !!session,
  }
}

export async function toggleFavoriteAction(cocktailId: string, isCurrentlyFavorited: boolean) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Você precisa estar logado para favoritar.' }
  }

  const userId = session.user.id

  try {
    if (isCurrentlyFavorited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('cocktail_id', cocktailId)
        .eq('user_id', userId)

      if (error) throw error
    } else {
      const { error } = await supabase.from('favorites').insert({
        cocktail_id: cocktailId,
        user_id: userId,
      })

      if (error) throw error
    }

    revalidatePath('/[locale]/drinks/[slug]')
    return { success: true }
  } catch (err: unknown) {
    console.error('Error toggling favorite:', err)
    const error = err as { message?: string }
    if (error.message?.includes('relation "favorites" does not exist')) {
      return { success: false, error: 'MIGRATION_REQUIRED' }
    }
    return { success: false, error: 'Ocorreu um erro ao atualizar favoritos.' }
  }
}

export async function submitRatingAction(cocktailId: string, rating: number, comment: string) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Você precisa estar logado para avaliar.' }
  }

  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Avaliação deve ser entre 1 e 5 estrelas.' }
  }

  const userId = session.user.id

  try {
    const { error } = await supabase.from('ratings').upsert(
      {
        user_id: userId,
        cocktail_id: cocktailId,
        rating,
        comment: comment.trim() || null,
      },
      { onConflict: 'user_id,cocktail_id' }
    )

    if (error) throw error

    revalidatePath('/[locale]/drinks/[slug]')
    return { success: true }
  } catch (err: unknown) {
    console.error('Error submitting rating:', err)
    const error = err as { message?: string }
    if (error.message?.includes('relation "ratings" does not exist')) {
      return { success: false, error: 'MIGRATION_REQUIRED' }
    }
    return { success: false, error: 'Ocorreu um erro ao salvar sua avaliação.' }
  }
}
