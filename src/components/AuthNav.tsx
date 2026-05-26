import Link from 'next/link'
import { createClient as createServerClient } from '@/utils/supabase/server'

const labels = {
  pt: { account: 'Conta', bars: 'Bares', auth: 'Login / Registro' },
  en: { account: 'Account', bars: 'Bars', auth: 'Log in / Sign up' },
  es: { account: 'Cuenta', bars: 'Bares', auth: 'Login / Registro' },
}

export async function AuthNav({ locale }: { locale: string }) {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const label = labels[locale as keyof typeof labels] || labels.pt

  if (!session) {
    return (
      <Link
        href={`/${locale}/login`}
        className="flex h-10 w-40 cursor-pointer items-center justify-center rounded-lg border border-white/15 px-3 text-sm font-medium text-porcelain transition-colors hover:border-white/25 hover:bg-white/10"
      >
        {label.auth}
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link
        href={`/${locale}/meus-bares`}
        className="cursor-pointer text-porcelain/80 transition-colors hover:text-porcelain"
      >
        {label.bars}
      </Link>
      <Link
        href={`/${locale}/conta`}
        className="cursor-pointer text-porcelain/80 transition-colors hover:text-porcelain"
      >
        {label.account}
      </Link>
    </div>
  )
}
