import { Metadata } from 'next'
import { Suspense } from 'react'
import { generateSEOMetadata } from '@/lib/seo/metadata'
import LoginForm from '@/components/auth/LoginForm'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

const pageLabels = {
  pt: { title: 'Login', description: 'Acesse sua conta' },
  en: { title: 'Login', description: 'Sign in to your account' },
  es: { title: 'Iniciar sesión', description: 'Inicia sesión en tu cuenta' },
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const labels = pageLabels[locale as keyof typeof pageLabels] || pageLabels.pt

  return generateSEOMetadata(
    {
      title: labels.title,
      description: labels.description,
      pathname: `/${locale}/login`,
    },
    baseUrl
  )
}

function LoginFormWrapper() {
  return <LoginForm />
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-porcelain flex items-center justify-center py-12 px-4">
      <div className="w-full">
        <Suspense fallback={<div />}>
          <LoginFormWrapper />
        </Suspense>
      </div>
    </main>
  )
}
