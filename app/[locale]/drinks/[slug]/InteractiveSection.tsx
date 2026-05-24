'use client'

import { useState, useCallback, useEffect } from 'react'
import { Star, Heart, MessageSquare } from 'lucide-react'
import { getDrinkInteractiveState, toggleFavoriteAction, submitRatingAction } from './actions'

interface RatingItem {
  id: string
  rating: number
  comment: string | null
  created_at: string
  user_id: string
}

export function InteractiveSection({ cocktailId, locale }: { cocktailId: string; locale: string }) {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [state, setState] = useState<{
    dbNotMigrated: boolean
    isFavorited: boolean
    userRating: { rating: number; comment: string | null } | null
    allRatings: RatingItem[]
    averageRating: number
    isAuthenticated: boolean
  } | null>(null)

  const [ratingInput, setRatingInput] = useState(5)
  const [commentInput, setCommentInput] = useState('')
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadState = useCallback(async () => {
    try {
      const res = await getDrinkInteractiveState(cocktailId)
      setState(res)
      if (res.userRating) {
        setRatingInput(res.userRating.rating)
        setCommentInput(res.userRating.comment || '')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [cocktailId])

  useEffect(() => {
    loadState() // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadState])

  const handleFavoriteToggle = async () => {
    if (!state) return
    setActionLoading(true)
    setErrorMsg(null)
    const res = await toggleFavoriteAction(cocktailId, state.isFavorited)
    setActionLoading(false)

    if (res.success) {
      setState(s => (s ? { ...s, isFavorited: !s.isFavorited } : null))
    } else {
      if (res.error === 'MIGRATION_REQUIRED') {
        setErrorMsg(
          locale === 'pt'
            ? 'Funcionalidade indisponível. Por favor, execute a migration 007_ratings_and_favorites.sql no console do Supabase.'
            : 'Feature unavailable. Please apply migration 007_ratings_and_favorites.sql in Supabase console.'
        )
      } else {
        setErrorMsg(res.error || null)
      }
    }
  }

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state) return
    setActionLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const res = await submitRatingAction(cocktailId, ratingInput, commentInput)
    setActionLoading(false)

    if (res.success) {
      setSuccessMsg(locale === 'pt' ? 'Avaliação salva com sucesso!' : 'Rating saved successfully!')
      loadState()
    } else {
      if (res.error === 'MIGRATION_REQUIRED') {
        setErrorMsg(
          locale === 'pt'
            ? 'Funcionalidade indisponível. Por favor, execute a migration 007_ratings_and_favorites.sql no console do Supabase.'
            : 'Feature unavailable. Please apply migration 007_ratings_and_favorites.sql in Supabase console.'
        )
      } else {
        setErrorMsg(res.error || null)
      }
    }
  }

  if (loading) {
    return (
      <div className="bg-evergreen/60 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex items-center justify-center min-h-[150px]">
        <div className="w-6 h-6 border-2 border-porcelain border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!state) return null

  if (state.dbNotMigrated) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-amber-200 text-sm">
        <h3 className="font-bold mb-2">
          {locale === 'pt' ? 'Recurso em Manutenção' : 'Feature Under Maintenance'}
        </h3>
        <p>
          {locale === 'pt'
            ? 'Por favor, execute o script de migração (007_ratings_and_favorites.sql) no SQL Editor do Supabase para ativar avaliações e favoritos.'
            : 'Please apply the migration script (007_ratings_and_favorites.sql) inside Supabase SQL Editor to enable reviews and favorites.'}
        </p>
      </div>
    )
  }

  const translations = {
    pt: {
      title: 'Avaliações e Favoritos',
      average: 'Média de avaliações',
      noReviews: 'Nenhuma avaliação ainda. Seja o primeiro!',
      authRequired: 'Faça login para favoritar e avaliar este drink.',
      loginLink: 'Ir para o Login',
      commentLabel: 'Deixe um comentário (opcional)',
      submitBtn: 'Salvar Avaliação',
      favoriteBtnAdd: 'Adicionar aos Favoritos',
      favoriteBtnRemove: 'Remover dos Favoritos',
      reviewsHeader: 'Avaliações da Comunidade',
      stars: 'Estrelas',
    },
    en: {
      title: 'Reviews & Favorites',
      average: 'Average rating',
      noReviews: 'No reviews yet. Be the first to rate!',
      authRequired: 'Log in to favorite and rate this drink.',
      loginLink: 'Go to Login',
      commentLabel: 'Leave a comment (optional)',
      submitBtn: 'Save Review',
      favoriteBtnAdd: 'Add to Favorites',
      favoriteBtnRemove: 'Remove from Favorites',
      reviewsHeader: 'Community Reviews',
      stars: 'Stars',
    },
    es: {
      title: 'Reseñas y Favoritos',
      average: 'Calificación promedio',
      noReviews: 'Aún no hay opiniones. ¡Sé el primero!',
      authRequired: 'Inicia sesión para agregar a favoritos y calificar.',
      loginLink: 'Ir al Login',
      commentLabel: 'Deja un comentario (opcional)',
      submitBtn: 'Guardar Calificación',
      favoriteBtnAdd: 'Agregar a Favoritos',
      favoriteBtnRemove: 'Quitar de Favoritos',
      reviewsHeader: 'Opiniones de la Comunidad',
      stars: 'Estrellas',
    },
  }

  const t = translations[locale as keyof typeof translations] ?? translations.pt

  return (
    <div className="bg-evergreen/60 border border-white/10 rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-md text-porcelain flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-porcelain/80" />
            {t.title}
          </h2>
          {state.allRatings.length > 0 && (
            <p className="text-xs text-porcelain/60 mt-1">
              {t.average}:{' '}
              <strong className="text-amber-400 text-sm font-semibold">
                {state.averageRating}
              </strong>{' '}
              ★ ({state.allRatings.length})
            </p>
          )}
        </div>

        {state.isAuthenticated && (
          <button
            onClick={handleFavoriteToggle}
            disabled={actionLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              state.isFavorited
                ? 'bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30'
                : 'bg-white/5 border-white/10 text-porcelain/80 hover:bg-white/10'
            }`}
          >
            <Heart className={`w-4 h-4 ${state.isFavorited ? 'fill-current text-red-400' : ''}`} />
            {state.isFavorited ? t.favoriteBtnRemove : t.favoriteBtnAdd}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {/* Main Grid: Submit Form & Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Rating Form */}
        <div>
          {!state.isAuthenticated ? (
            <div className="bg-white/5 border border-white/5 rounded-xl p-5 text-center flex flex-col items-center justify-center gap-3">
              <p className="text-xs text-porcelain/70">{t.authRequired}</p>
              <a
                href={`/${locale}/login`}
                className="text-xs font-bold bg-porcelain text-evergreen px-4 py-2 rounded-lg hover:bg-white transition-all cursor-pointer"
              >
                {t.loginLink}
              </a>
            </div>
          ) : (
            <form onSubmit={handleRatingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-porcelain/70 uppercase tracking-wider mb-2">
                  {locale === 'pt' ? 'Sua Avaliação' : 'Your Rating'}
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map(star => {
                    const active = star <= (hoverRating ?? ratingInput)
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            active ? 'fill-amber-400 text-amber-400' : 'text-porcelain/30'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="comment"
                  className="block text-xs font-semibold text-porcelain/70 uppercase tracking-wider mb-1.5"
                >
                  {t.commentLabel}
                </label>
                <textarea
                  id="comment"
                  rows={3}
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  placeholder={
                    locale === 'pt'
                      ? 'O que achou deste coquetel?'
                      : 'What did you think of this cocktail?'
                  }
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-porcelain resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full sm:w-auto bg-porcelain text-evergreen font-bold px-6 py-2.5 rounded-xl hover:bg-white transition-all disabled:opacity-50 text-sm cursor-pointer shadow-md"
              >
                {actionLoading ? '...' : t.submitBtn}
              </button>
            </form>
          )}
        </div>

        {/* Reviews List */}
        <div>
          <h3 className="text-xs font-semibold text-porcelain/70 uppercase tracking-wider mb-3">
            {t.reviewsHeader}
          </h3>

          {state.allRatings.length === 0 ? (
            <p className="text-sm text-porcelain/50 italic">{t.noReviews}</p>
          ) : (
            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
              {state.allRatings.map(review => (
                <div
                  key={review.id}
                  className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-white/20'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-porcelain/40">
                      {new Date(review.created_at).toLocaleDateString(
                        locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US',
                        { day: '2-digit', month: 'short' }
                      )}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-porcelain/90 leading-relaxed font-medium">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
