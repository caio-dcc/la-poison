'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useLanguage } from '@/hooks/useLanguage'
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function SignupForm() {
  const { dict } = useLanguage()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const supabase = createClient()

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message || dict.signupError)
        setLoading(false)
        return
      }

      setConfirmationSent(true)
    } catch {
      setError(dict.signupError)
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      const origin = window.location.origin
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/api/auth/callback`,
        },
      })

      if (oauthError) {
        setError(oauthError.message || dict.signupError)
      }
    } catch {
      setError(dict.signupError)
    } finally {
      setGoogleLoading(false)
    }
  }

  if (confirmationSent) {
    return (
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-evergreen mb-4">{dict.checkEmail}</h1>
          <p className="text-shadow-grey mb-6">
            We&apos;ve sent a confirmation email to <strong>{email}</strong>. Click the link in the
            email to activate your account.
          </p>
          <Link
            href="/login"
            className="inline-block text-evergreen hover:text-hunter-green font-semibold transition-colors"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-evergreen mb-2">{dict.signup}</h1>
        <p className="text-sm text-shadow-grey mb-8">
          {dict.alreadyHaveAccount}{' '}
          <Link
            href="/login"
            className="text-evergreen hover:text-hunter-green font-semibold transition-colors"
          >
            {dict.login}
          </Link>
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-4 mb-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-evergreen mb-2">
              {dict.email}
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-evergreen px-4 py-3 text-sm"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-evergreen mb-2">
              {dict.password}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-evergreen px-4 py-3 text-sm"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-evergreen mb-2"
            >
              {dict.confirmPassword}
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-evergreen px-4 py-3 text-sm"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-evergreen text-porcelain hover:bg-hunter-green transition-colors rounded-lg py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? dict.loading : dict.signup}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-shadow-grey">{dict.or}</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="w-full border border-gray-300 bg-white text-shadow-grey hover:bg-gray-50 transition-colors rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          {googleLoading ? dict.loading : dict.signupWithGoogle}
        </button>
      </div>
    </div>
  )
}
