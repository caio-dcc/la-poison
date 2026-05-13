'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useLanguage } from '@/hooks/useLanguage'
import { Mail } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { dict } = useLanguage()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  const supabase = createClient()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message || dict.loginError)
        setLoading(false)
        return
      }

      router.push(redirect)
    } catch {
      setError(dict.loginError)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      const origin = window.location.origin
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/api/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      })

      if (oauthError) {
        setError(oauthError.message || dict.loginError)
      }
    } catch {
      setError(dict.loginError)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-evergreen mb-2">{dict.login}</h1>
        <p className="text-sm text-shadow-grey mb-8">
          {dict.dontHaveAccount}{' '}
          <Link
            href="/signup"
            className="text-evergreen hover:text-hunter-green font-semibold transition-colors"
          >
            {dict.signup}
          </Link>
        </p>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
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
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-sm font-semibold text-evergreen">
                {dict.password}
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-shadow-grey hover:text-evergreen transition-colors"
              >
                {dict.forgotPassword}
              </Link>
            </div>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-evergreen text-porcelain hover:bg-hunter-green transition-colors rounded-lg py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? dict.loading : dict.login}
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
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full border border-gray-300 bg-white text-shadow-grey hover:bg-gray-50 transition-colors rounded-lg py-3 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="w-5 h-5" />
          {googleLoading ? dict.loading : dict.loginWithGoogle}
        </button>
      </div>
    </div>
  )
}
