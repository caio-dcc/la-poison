import { Metadata } from 'next'
import { Suspense } from 'react'
import { generateSEOMetadata } from '@/lib/seo/metadata'
import SignupForm from '@/components/auth/SignupForm'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lapoison.com'

export const metadata: Metadata = generateSEOMetadata(
  {
    title: 'Sign Up',
    description: 'Create a new account',
    pathname: '/signup',
  },
  baseUrl
)

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
