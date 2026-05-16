import { createClient as createServerClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function POST(req: Request) {
  const supabase = await createServerClient()
  await supabase.auth.signOut()

  const referer = req.headers.get('referer')
  const locale = referer?.includes('/pt') ? 'pt' : referer?.includes('/es') ? 'es' : 'en'

  redirect(`/${locale}`)
}
