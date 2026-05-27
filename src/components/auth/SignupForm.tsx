'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useLanguage } from '@/hooks/useLanguage'

const COUNTRIES = [
  { code: 'BR', name: 'Brasil', phone_prefix: '+55' },
  { code: 'US', name: 'United States', phone_prefix: '+1' },
  { code: 'MX', name: 'México', phone_prefix: '+52' },
  { code: 'ES', name: 'España', phone_prefix: '+34' },
  { code: 'PT', name: 'Portugal', phone_prefix: '+351' },
  { code: 'AR', name: 'Argentina', phone_prefix: '+54' },
  { code: 'CL', name: 'Chile', phone_prefix: '+56' },
  { code: 'CO', name: 'Colombia', phone_prefix: '+57' },
  { code: 'PE', name: 'Perú', phone_prefix: '+51' },
]

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < 8) errors.push('Mínimo 8 caracteres')
  if (!/[A-Z]/.test(password)) errors.push('Pelo menos 1 letra maiúscula')
  if (!/[0-9]/.test(password)) errors.push('Pelo menos 1 número')
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
    errors.push('Pelo menos 1 caractere especial')
  return { valid: errors.length === 0, errors }
}

function validatePhone(phone: string, countryCode: string): { valid: boolean; error?: string } {
  if (!phone.trim()) return { valid: false, error: 'Telefone é obrigatório' }
  const cleanPhone = phone.replace(/[\s-]/g, '')
  if (!cleanPhone.startsWith('+')) return { valid: false, error: 'Telefone deve começar com +' }
  const country = COUNTRIES.find(c => c.code === countryCode)
  if (!country) return { valid: false, error: 'País inválido' }
  if (!cleanPhone.startsWith(country.phone_prefix)) {
    return { valid: false, error: `Telefone deve começar com ${country.phone_prefix}` }
  }
  const digitCount = cleanPhone.replace(/\D/g, '').length
  if (digitCount < 10) return { valid: false, error: 'Telefone incompleto' }
  return { valid: true }
}

export default function SignupForm({ isTabbed = false }: { isTabbed?: boolean }) {
  const { dict } = useLanguage()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('BR')
  const [phone, setPhone] = useState('+55 ')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [phoneError, setPhoneError] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)

  const supabase = createClient()

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setPasswordErrors(validatePassword(value).errors)
  }

  const handlePhoneChange = (value: string) => {
    setPhone(value)
    setPhoneError(validatePhone(value, country).error || '')
  }

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry)
    const countryData = COUNTRIES.find(c => c.code === newCountry)
    if (countryData) setPhone(countryData.phone_prefix + ' ')
    setPhoneError(validatePhone(phone, newCountry).error || '')
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('Nome completo é obrigatório')
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setError('Senha não atende aos requisitos')
      return
    }

    if (password !== confirmPassword) {
      setError('Senhas não coincidem')
      return
    }

    const phoneValidation = validatePhone(phone, country)
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || 'Telefone inválido')
      return
    }

    setLoading(true)

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message || dict.signupError)
        setLoading(false)
        return
      }

      if (authData.user) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName, country, phone_number: phone })
          .eq('id', authData.user.id)
          .then(({ error: profileError }) => {
            if (profileError) console.error('Profile update error:', profileError)
          })
      }

      setConfirmationSent(true)
    } catch {
      setError(dict.signupError)
      setLoading(false)
    }
  }

  if (confirmationSent) {
    const containerClass = isTabbed ? 'w-full' : 'max-w-md w-full mx-auto'
    const boxClass = isTabbed
      ? 'bg-transparent text-center'
      : 'bg-white rounded-xl shadow-md p-8 text-center'

    return (
      <div className={containerClass}>
        <div className={boxClass}>
          <h1 className="text-2xl font-bold text-evergreen mb-4">{dict.checkEmail}</h1>
          <p className="text-shadow-grey mb-6">
            Verifique seu email em <strong>{email}</strong> para confirmar sua conta.
          </p>
          {!isTabbed && (
            <Link
              href="/pt/login"
              className="inline-block text-evergreen hover:text-hunter-green font-semibold transition-colors cursor-pointer"
            >
              ← Voltar para Login
            </Link>
          )}
        </div>
      </div>
    )
  }

  const phoneValidation = validatePhone(phone, country)
  const containerClass = isTabbed ? 'w-full' : 'max-w-2xl w-full mx-auto'
  const boxClass = isTabbed ? 'bg-transparent' : 'bg-white rounded-xl shadow-md p-8'

  return (
    <div className={containerClass}>
      <div className={boxClass}>
        {!isTabbed && (
          <>
            <h1 className="text-2xl font-bold text-evergreen mb-2">Criar Conta</h1>
            <p className="text-sm text-shadow-grey mb-8">
              Já tem conta?{' '}
              <Link
                href="/pt/login"
                className="text-evergreen hover:text-hunter-green font-semibold transition-colors cursor-pointer"
              >
                Faça login
              </Link>
            </p>
          </>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailSignup} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-evergreen mb-2">
              Nome Completo *
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-evergreen px-4 py-3 text-sm"
              placeholder="Seu nome completo"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-evergreen mb-2">
              Email *
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-evergreen mb-2">
                País *
              </label>
              <select
                id="country"
                value={country}
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-evergreen px-4 py-3 text-sm cursor-pointer"
                disabled={loading}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.phone_prefix})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-evergreen mb-2">
                Telefone *
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                className={`w-full border rounded-lg focus:outline-none focus:ring-2 px-4 py-3 text-sm ${
                  phoneError
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-evergreen'
                }`}
                placeholder="+55 11 98765-4321"
                disabled={loading}
              />
              {phoneError && <p className="text-red-600 text-xs mt-1">{phoneError}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-evergreen mb-2">
              Senha *
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => handlePasswordChange(e.target.value)}
              className={`w-full border rounded-lg focus:outline-none focus:ring-2 px-4 py-3 text-sm ${
                passwordErrors.length > 0
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-evergreen'
              }`}
              placeholder="••••••••"
              disabled={loading}
            />
            {password && passwordErrors.length > 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-xs font-semibold mb-1">Requisitos não atendidos:</p>
                <ul className="text-red-600 text-xs space-y-1">
                  {passwordErrors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
            {password && passwordErrors.length === 0 && (
              <p className="text-green-600 text-xs mt-1">✓ Senha atende aos requisitos</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-evergreen mb-2"
            >
              Confirmar Senha *
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={`w-full border rounded-lg focus:outline-none focus:ring-2 px-4 py-3 text-sm ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-evergreen'
              }`}
              placeholder="••••••••"
              disabled={loading}
            />
            {confirmPassword && password === confirmPassword && password.length > 0 && (
              <p className="text-green-600 text-xs mt-1">✓ Senhas coincidem</p>
            )}
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-600 text-xs mt-1">✗ Senhas não coincidem</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || passwordErrors.length > 0 || !phoneValidation.valid}
            className="w-full bg-evergreen text-porcelain hover:bg-hunter-green transition-colors rounded-lg py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-6"
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
