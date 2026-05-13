'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useLanguage } from '@/hooks/useLanguage'
import { Mail } from 'lucide-react'

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
          <Mail className="w-5 h-5" />
          {googleLoading ? dict.loading : dict.signupWithGoogle}
        </button>
      </div>
    </div>
  )
}
