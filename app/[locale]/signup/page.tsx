import { Metadata } from 'next'
import { Suspense } from 'react'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Criar Conta — LaPoison',
  description: 'Crie uma conta para acessar todas as funcionalidades da LaPoison.',
  robots: {
    index: false,
  },
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-porcelain py-12 px-4">
      <Suspense fallback={<div className="text-evergreen">Carregando...</div>}>
        <SignupForm />
      </Suspense>
    </main>
  )
}
