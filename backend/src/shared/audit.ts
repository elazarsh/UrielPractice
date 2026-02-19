import { prisma } from './prisma'

interface AuditParams {
  userId?: string
  clientId?: string
  action: string
  entityType: string
  entityId?: string
  before?: unknown
  after?: unknown
  source?: 'UI' | 'API' | 'SYSTEM'
  ipAddress?: string
  notes?: string
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     params.userId,
        clientId:   params.clientId,
        action:     params.action,
        entityType: params.entityType,
        entityId:   params.entityId,
        before:     params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
        after:      params.after  ? JSON.parse(JSON.stringify(params.after))  : undefined,
        source:     params.source ?? 'UI',
        ipAddress:  params.ipAddress,
        notes:      params.notes,
      },
    })
  } catch (err) {
    // לוג כישלון לא חייב להשבית את הפעולה הראשית
    console.error('[AuditLog] Failed to write audit entry:', err)
  }
}
