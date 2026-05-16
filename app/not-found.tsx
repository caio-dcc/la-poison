import Link from 'next/link'

export default function NotFound() {
  return (
    <html lang="pt">
      <body
        style={{ margin: 0, background: '#14281D', color: '#F1F5F2', fontFamily: 'sans-serif' }}
      >
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <div>
            <p style={{ fontSize: '6rem', fontWeight: 'bold', opacity: 0.3, margin: 0 }}>404</p>
            <h1 style={{ fontSize: '1.5rem', margin: '1rem 0' }}>Page not found</h1>
            <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
              The page you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link
              href="/pt"
              style={{
                display: 'inline-block',
                background: '#355834',
                color: '#F1F5F2',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
