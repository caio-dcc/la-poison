import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 text-porcelain">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold mb-4 opacity-30">404</p>
        <h1 className="text-2xl font-bold mb-3">Page not found</h1>
        <p className="text-porcelain/70 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/pt/drinks"
          className="inline-block bg-hunter-green text-porcelain px-6 py-3 rounded-lg font-semibold hover:bg-porcelain hover:text-evergreen transition-colors"
        >
          Browse drinks
        </Link>
      </div>
    </main>
  )
}
