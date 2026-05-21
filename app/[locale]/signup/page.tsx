import { Metadata } from 'next'
import { Suspense } from 'react'
import { generateSEOMetadata } from '@/lib/seo/metadata'
import SignupForm from '@/components/auth/SignupForm'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

const pageLabels = {
  pt: { title: 'Criar Conta', description: 'Crie uma nova conta' },
  en: { title: 'Sign Up', description: 'Create a new account' },
  es: { title: 'Registrarse', description: 'Crear una nueva cuenta' },
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
      pathname: `/${locale}/signup`,
    },
    baseUrl
  )
}

function SignupFormWrapper() {
  return <SignupForm />
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-porcelain flex items-center justify-center py-12 px-4">
      <div className="w-full">
        <Suspense fallback={<div />}>
          <SignupFormWrapper />
        </Suspense>
      </div>
    </main>
  )
}
