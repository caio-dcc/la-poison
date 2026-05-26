import { Metadata } from 'next'
import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Login — LaPoison',
  description: 'Faça login na sua conta para acessar o chatbot e mais funcionalidades.',
  robots: {
    index: false,
  },
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-porcelain py-12 px-4">
      <Suspense fallback={<div className="text-evergreen">Carregando...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
