import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Subscriptions | Admin | LaPoison',
  robots: { index: false, follow: false },
}

export default async function SubscriptionsPage() {
  const supabase = await createClient()

  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_type, status, current_period_end, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Failed to fetch subscriptions:', error)
  }

  const statusColors: Record<string, string> = {
    active: 'text-green-400',
    past_due: 'text-yellow-400',
    canceled: 'text-red-400',
    trialing: 'text-blue-400',
    incomplete: 'text-gray-400',
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Subscriptions</h1>

      {subscriptions && subscriptions.length > 0 ? (
        <div className="overflow-x-auto bg-[#14281D] border border-[#355834] rounded-lg">
          <table className="w-full text-sm">
            <thead className="border-b border-[#355834]">
              <tr className="bg-[#0a0a0a]">
                <th className="text-left p-4 font-semibold">User ID</th>
                <th className="text-left p-4 font-semibold">Plan</th>
                <th className="text-left p-4 font-semibold">Status</th>
                <th className="text-left p-4 font-semibold">Period End</th>
                <th className="text-left p-4 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(sub => (
                <tr key={sub.id} className="border-b border-[#355834] hover:bg-[#1a3a2d]">
                  <td className="p-4 text-xs font-mono text-[#355834]">
                    {sub.user_id.slice(0, 8)}...
                  </td>
                  <td className="p-4">
                    <span className="inline-block px-2 py-1 rounded text-xs bg-[#355834] text-[#14281D]">
                      {sub.plan_type}
                    </span>
                  </td>
                  <td className={`p-4 ${statusColors[sub.status] || 'text-white'}`}>
                    {sub.status}
                  </td>
                  <td className="p-4 text-[#355834]">
                    {sub.current_period_end
                      ? new Date(sub.current_period_end).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="p-4 text-[#355834]">
                    {new Date(sub.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#14281D] border border-[#355834] rounded-lg p-6 text-center text-[#355834]">
          No subscriptions found
        </div>
      )}
    </div>
  )
}
