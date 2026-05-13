import { Metadata } from 'next'
import { Suspense } from 'react'
import { generateSEOMetadata } from '@/lib/seo/metadata'
import LoginForm from '@/components/auth/LoginForm'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

export const metadata: Metadata = generateSEOMetadata(
  {
    title: 'Login',
    description: 'Sign in to your account',
    pathname: '/login',
  },
  baseUrl
)

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
