import { Metadata } from 'next'
import { Suspense } from 'react'
import AuthTabs from '@/components/auth/AuthTabs'

export const metadata: Metadata = {
  title: 'Login — LaPoison',
  description: 'Faça login na sua conta para acessar o chatbot e mais funcionalidades.',
  robots: {
    index: false,
  },
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] py-12 px-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">
        <div className="hidden lg:flex items-center justify-center bg-[#0a0a0a] p-12 min-h-96">
          <div className="text-center">
            <div className="w-full h-64 bg-[#262121] rounded-xl" />
            <p className="text-porcelain text-sm mt-6 opacity-60">Placeholder para vídeo</p>
          </div>
        </div>

        <div className="bg-white p-8 lg:p-12 flex flex-col justify-center">
          <Suspense fallback={<div className="text-evergreen">Carregando...</div>}>
            <AuthTabs />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
