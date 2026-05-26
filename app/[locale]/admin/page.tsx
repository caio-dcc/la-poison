import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Admin Dashboard | LaPoison',
  robots: { index: false, follow: false },
}

interface Stat {
  label: string
  value: string | number
  icon: string
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Get total users count (via profiles table as proxy for auth.users)
  const { count: totalUsersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // Get active subscriptions
  const { count: proUsersCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // Get queries today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count: queriesTodayCount } = await supabase
    .from('chatbot_usage')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  // Get total queries this month
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  await supabase
    .from('chatbot_usage')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString())

  const stats: Stat[] = [
    {
      label: 'Total Users',
      value: totalUsersCount ?? 0,
      icon: '👥',
    },
    {
      label: 'Pro Subscriptions',
      value: proUsersCount ?? 0,
      icon: '⭐',
    },
    {
      label: 'Queries Today',
      value: queriesTodayCount ?? 0,
      icon: '💬',
    },
    {
      label: 'Est. Monthly Revenue',
      value: `R$ ${((proUsersCount ?? 0) * 19.9).toFixed(2)}`,
      icon: '💰',
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map(stat => (
          <div key={stat.label} className="bg-[#14281D] border border-[#355834] rounded-lg p-6">
            <div className="text-4xl mb-2">{stat.icon}</div>
            <p className="text-[#355834] text-sm mb-2">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-[#14281D] border border-[#355834] rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
        <ul className="space-y-2 text-sm text-[#355834]">
          <li>• {proUsersCount ?? 0} users with active subscription</li>
          <li>• {queriesTodayCount ?? 0} chatbot queries today</li>
          <li>
            • {((proUsersCount ?? 0) * 19.9).toFixed(2)} estimated monthly recurring revenue (@
            R$19.90)
          </li>
          <li>• Monitor audit logs for admin actions in the sidebar</li>
        </ul>
      </div>
    </div>
  )
}
