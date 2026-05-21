'use client'

import { LiquidAurora } from '@/components/ui/liquid-aurora'

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-12 pb-24 relative px-4 flex items-center justify-center">
      <LiquidAurora />

      <div className="max-w-3xl w-full relative z-10 flex flex-col gap-6">
        <div className="bg-evergreen/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-8 sm:p-10 flex flex-col gap-6 text-porcelain">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Sobre o La Poison</h1>

          <div className="space-y-4 text-sm sm:text-base text-porcelain/90 leading-relaxed">
            <p>
              O <strong>La Poison</strong> é uma plataforma dedicada à arte da coquetelaria e
              mixologia. Combinando tecnologia e paixão por drinks, nós oferecemos receitas
              detalhadas, técnicas de preparo e inspiração tanto para bartenders profissionais
              quanto para entusiastas em casa.
            </p>

            <p>
              Nossa missão é descomplicar a coquetelaria clássica e moderna. Através de recursos
              práticos como o<strong> Barman IA</strong>, gerenciamento de bares, e fichas técnicas
              completas para impressão e compartilhamento via QR Code, ajudamos você a descobrir e
              criar o coquetel perfeito.
            </p>

            <p>
              Acreditamos que todo drink conta uma história. Desde o equilíbrio clássico do Negroni
              até as inovações tropicais contemporâneas, o La Poison é o seu guia definitivo de
              sabores, ingredientes e experiências.
            </p>
          </div>

          <div className="mt-4 border-t border-white/15 pt-6 flex flex-wrap gap-4 text-xs font-semibold text-porcelain/70">
            <span className="bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              🍹 +500 Coquetéis
            </span>
            <span className="bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              🤖 Inteligência Artificial
            </span>
            <span className="bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              📐 Conversor oz / ml
            </span>
            <span className="bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              📄 Exportação PDF
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
