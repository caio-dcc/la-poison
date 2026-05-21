'use client'

import { useState } from 'react'
import { registerBartender } from './actions'
import { LiquidAurora } from '@/components/ui/liquid-aurora'

export default function BarmanPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await registerBartender(formData)

    setLoading(false)
    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Inscrição enviada com sucesso! Em breve entraremos em contato.',
      })
      e.currentTarget.reset()
    } else {
      setMessage({ type: 'error', text: result.error || 'Ocorreu um erro.' })
    }
  }

  return (
    <main className="min-h-screen pt-12 pb-24 relative px-4 flex items-center justify-center">
      <LiquidAurora />

      <div className="max-w-2xl w-full flex flex-col gap-8 relative z-10">
        {/* Banner Outdoor */}
        <div className="bg-gradient-to-r from-hunter-green/80 to-evergreen/80 backdrop-blur-md border border-white/20 rounded-3xl p-8 text-center shadow-2xl ring-1 ring-white/10">
          <span className="bg-porcelain/10 text-porcelain text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Novidade
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-porcelain mt-4 leading-tight">
            Você é Bartender ou Mixologista?
          </h1>
          <p className="text-porcelain/80 text-sm sm:text-base mt-2">
            Em breve teremos conteúdo para ti!
          </p>
        </div>

        {/* Formulário de Registro */}
        <div className="bg-evergreen/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-6 sm:p-8 max-w-md mx-auto w-full">
          <h2 className="text-xl font-bold text-porcelain text-center mb-6">
            Cadastre-se na lista de espera
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-porcelain/70 uppercase tracking-wider mb-1.5"
              >
                Nome completo
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-porcelain"
                placeholder="Seu nome"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label
                  htmlFor="age"
                  className="block text-xs font-semibold text-porcelain/70 uppercase tracking-wider mb-1.5"
                >
                  Idade
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  required
                  min="18"
                  max="120"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-porcelain"
                  placeholder="21"
                />
              </div>
              <div className="col-span-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-porcelain/70 uppercase tracking-wider mb-1.5"
                >
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/20 text-porcelain"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-porcelain text-evergreen font-bold py-3 rounded-xl hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-evergreen border-t-transparent rounded-full animate-spin" />
              ) : (
                'Quero me registrar'
              )}
            </button>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold text-center border mt-4 ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-300 border-red-500/20'
                }`}
              >
                {message.text}
              </div>
            )}
          </form>
        </div>
      </div>
    </main>
  )
}
