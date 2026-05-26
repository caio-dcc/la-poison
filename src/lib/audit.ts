import { createClient } from '@/utils/supabase/server'

export interface AuditEventParams {
  actorId: string
  actorEmail: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}

export async function logAuditEvent({
  actorId,
  actorEmail,
  action,
  targetType,
  targetId,
  metadata,
}: AuditEventParams) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata,
    })

    if (error) {
      console.error('Audit log error:', error)
      // Non-fatal; continue without blocking
    }
  } catch (err) {
    console.error('Failed to log audit event:', err)
  }
}
