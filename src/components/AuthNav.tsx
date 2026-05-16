import Link from 'next/link'
import { createClient as createServerClient } from '@/utils/supabase/server'

const labels = {
  pt: { account: 'Conta', bars: 'Bares' },
  en: { account: 'Account', bars: 'Bars' },
  es: { account: 'Cuenta', bars: 'Bares' },
}

export async function AuthNav({ locale }: { locale: string }) {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  const label = labels[locale as keyof typeof labels] || labels.pt

  return (
    <div className="flex items-center gap-4 text-sm">
      <Link
        href={`/${locale}/meus-bares`}
        className="text-porcelain/80 hover:text-porcelain transition-colors"
      >
        {label.bars}
      </Link>
      <Link
        href={`/${locale}/conta`}
        className="text-porcelain/80 hover:text-porcelain transition-colors"
      >
        {label.account}
      </Link>
    </div>
  )
}
