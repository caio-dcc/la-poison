import { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Audit Logs | Admin | LaPoison',
  robots: { index: false, follow: false },
}

export default async function AuditPage() {
  const supabase = await createClient()

  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('id, actor_email, action, target_type, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Failed to fetch audit logs:', error)
  }

  const actionColors: Record<string, string> = {
    create_superadmin: 'bg-blue-900 text-blue-200',
    promote_admin: 'bg-purple-900 text-purple-200',
    delete_user: 'bg-red-900 text-red-200',
    ban_user: 'bg-red-900 text-red-200',
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Audit Logs</h1>

      {logs && logs.length > 0 ? (
        <div className="space-y-3">
          {logs.map(log => (
            <div
              key={log.id}
              className="bg-[#14281D] border border-[#355834] rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">{log.action}</p>
                <p className="text-sm text-[#355834]">
                  {log.actor_email} • {log.target_type ? `Target: ${log.target_type}` : ''}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded text-xs ${
                    actionColors[log.action] || 'bg-[#355834] text-[#14281D]'
                  }`}
                >
                  {log.action}
                </span>
                <p className="text-xs text-[#355834] mt-2">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#14281D] border border-[#355834] rounded-lg p-6 text-center text-[#355834]">
          No audit logs found
        </div>
      )}
    </div>
  )
}
