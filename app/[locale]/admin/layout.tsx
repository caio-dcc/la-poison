import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  // 1. Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login?redirect=/${locale}/admin`)
  }

  // 2. Check admin role via service key
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()

  if (error || !profile?.is_admin) {
    redirect(`/${locale}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#F1F5F2]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[#355834] bg-[#14281D] p-6">
          <div className="mb-8">
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <p className="text-sm text-[#355834]">{profile.role}</p>
          </div>

          <nav className="space-y-2">
            <Link
              href={`/${locale}/admin`}
              className="block rounded px-4 py-2 text-sm hover:bg-[#355834] cursor-pointer"
            >
              📊 Dashboard
            </Link>
            <Link
              href={`/${locale}/admin/users`}
              className="block rounded px-4 py-2 text-sm hover:bg-[#355834] cursor-pointer"
            >
              👥 Users
            </Link>
            <Link
              href={`/${locale}/admin/subscriptions`}
              className="block rounded px-4 py-2 text-sm hover:bg-[#355834] cursor-pointer"
            >
              💳 Subscriptions
            </Link>
            <Link
              href={`/${locale}/admin/audit`}
              className="block rounded px-4 py-2 text-sm hover:bg-[#355834] cursor-pointer"
            >
              📝 Audit Logs
            </Link>
          </nav>

          <div className="border-t border-[#355834] pt-6 mt-8">
            <Link
              href={`/${locale}/conta`}
              className="block text-sm text-[#355834] hover:text-[#F1F5F2] cursor-pointer"
            >
              ← Back to App
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
