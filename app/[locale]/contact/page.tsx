'use client'

import { LiquidAurora } from '@/components/ui/liquid-aurora'

export default function ContactPage() {
  return (
    <main className="min-h-screen pt-12 pb-24 relative px-4 flex items-center justify-center">
      <LiquidAurora />

      <div className="max-w-2xl w-full relative z-10">
        <div className="bg-evergreen/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl p-8 sm:p-10 flex flex-col gap-6 text-porcelain">
          <h1 className="text-3xl font-extrabold tracking-tight">Contato</h1>

          <p className="text-sm sm:text-base text-porcelain/90 leading-relaxed">
            Dúvidas, sugestões, feedbacks ou propostas comerciais? Nós adoraríamos ouvir você. Entre
            em contato conosco através dos canais oficiais abaixo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <a
              href="mailto:dev.caio.marques@gmail.com"
              className="bg-white/5 border border-white/10 p-5 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all flex flex-col gap-1 cursor-pointer"
            >
              <span className="text-xs uppercase font-semibold text-porcelain/60">E-mail</span>
              <span className="font-bold text-sm sm:text-base">dev.caio.marques@gmail.com</span>
            </a>

            <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex flex-col gap-1">
              <span className="text-xs uppercase font-semibold text-porcelain/60">
                Suporte Técnico
              </span>
              <span className="font-bold text-sm sm:text-base">Segunda a Sexta, 9h às 18h</span>
            </div>
          </div>

          <div className="border-t border-white/15 pt-6 text-center text-xs text-porcelain/50">
            La Poison © {new Date().getFullYear()} — Todos os direitos reservados.
          </div>
        </div>
      </div>
    </main>
  )
}
