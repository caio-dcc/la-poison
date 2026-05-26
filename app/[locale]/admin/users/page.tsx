import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Users | Admin | LaPoison',
  robots: { index: false, follow: false },
}

export default async function UsersPage() {
  const supabase = await createClient()

  // Fetch profiles with multiple queries approach
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, role, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const userIds = profilesData?.map(p => p.id) || []

  const subscriptions: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('user_id, status')
      .in('user_id', userIds)

    subs?.forEach(sub => {
      subscriptions[sub.user_id] = sub.status
    })
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Users</h1>

      {profilesData && profilesData.length > 0 ? (
        <div className="overflow-x-auto bg-[#14281D] border border-[#355834] rounded-lg">
          <table className="w-full text-sm">
            <thead className="border-b border-[#355834]">
              <tr className="bg-[#0a0a0a]">
                <th className="text-left p-4 font-semibold">Email</th>
                <th className="text-left p-4 font-semibold">Role</th>
                <th className="text-left p-4 font-semibold">Subscription</th>
                <th className="text-left p-4 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {profilesData.map(profile => (
                <tr key={profile.id} className="border-b border-[#355834] hover:bg-[#1a3a2d]">
                  <td className="p-4 text-xs font-mono text-[#355834]">
                    {profile.id.slice(0, 8)}...
                  </td>
                  <td className="p-4">
                    <span className="inline-block px-2 py-1 rounded text-xs bg-[#355834] text-[#14281D]">
                      {profile.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {subscriptions[profile.id] ? (
                      <span className="text-green-400">{subscriptions[profile.id]}</span>
                    ) : (
                      <span className="text-[#355834]">free</span>
                    )}
                  </td>
                  <td className="p-4 text-[#355834]">
                    {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#14281D] border border-[#355834] rounded-lg p-6 text-center text-[#355834]">
          No users found
        </div>
      )}
    </div>
  )
}
