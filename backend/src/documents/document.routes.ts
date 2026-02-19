import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../shared/prisma'
import { NotFoundError, ForbiddenError } from '../shared/errors'
import { STAFF_ROLES } from '../shared/types'
import { writeAuditLog } from '../shared/audit'
import { DocumentStatus, UserRole } from '@prisma/client'
import path from 'path'
import fs from 'fs'
import { config } from '../shared/config'
import { v4 as uuidv4 } from 'uuid'
import { addDays } from '../shared/dateUtils'

export async function documentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/documents
  app.get('/', async (req, reply) => {
    if (!STAFF_ROLES.includes((req.user as { role: UserRole }).role)) throw new ForbiddenError()
    const q = req.query as { clientId?: string; processId?: string; status?: DocumentStatus; documentType?: string; page?: string; limit?: string }
    const page  = parseInt(q.page  ?? '1')
    const limit = parseInt(q.limit ?? '25')
    const where: Record<string, unknown> = {}
    if (q.clientId)     where.clientId     = q.clientId
    if (q.processId)    where.processId    = q.processId
    if (q.status)       where.status       = q.status
    if (q.documentType) where.documentType = q.documentType
    const [docs, total] = await Promise.all([
      prisma.document.findMany({ where, skip: (page-1)*limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.document.count({ where }),
    ])
    return reply.send({ data: docs, total, page, limit })
  })

  // GET /api/documents/missing  – רשימת מסמכים חסרים לפי תהליך
  app.get('/missing', async (req, reply) => {
    if (!STAFF_ROLES.includes((req.user as { role: UserRole }).role)) throw new ForbiddenError()
    const { processId } = req.query as { processId?: string }
    if (!processId) return reply.send([])

    const instance = await prisma.processInstance.findUnique({
      where: { id: processId },
      include: {
        template: { include: { requiredDocs: true } },
        documents: { where: { status: { in: ['VALID', 'RECEIVED'] } } },
      },
    })
    if (!instance) throw new NotFoundError('תהליך', processId)

    const receivedTypes = new Set(instance.documents.map(d => d.documentType))
    const missing = instance.template.requiredDocs
      .filter(r => r.isRequired && !receivedTypes.has(r.documentType))
      .map(r => ({ documentType: r.documentType, description: r.description, notes: r.notes }))

    return reply.send(missing)
  })

  // POST /api/documents/upload
  app.post('/upload', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()

    const data = await req.file()
    if (!data) return reply.status(400).send({ error: 'לא נשלח קובץ' })

    const { clientId, processId, documentType, description, periodYear, periodMonth } =
      req.query as { clientId: string; processId?: string; documentType: string; description?: string; periodYear?: string; periodMonth?: string }

    const fileId   = uuidv4()
    const ext      = path.extname(data.filename)
    const fileName = `${fileId}${ext}`
    const uploadDir = path.resolve(config.UPLOAD_DIR, clientId)
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, fileName)

    const buffer = await data.toBuffer()
    fs.writeFileSync(filePath, buffer)

    const retentionUntil = addDays(new Date(), 365 * 7) // 7 שנות שמירה חובה

    const doc = await prisma.document.create({
      data: {
        clientId,
        processId:    processId || null,
        fileName:     data.filename,
        fileSize:     buffer.length,
        mimeType:     data.mimetype,
        storagePath:  `${clientId}/${fileName}`,
        documentType,
        description:  description || null,
        periodYear:   periodYear  ? parseInt(periodYear)  : null,
        periodMonth:  periodMonth ? parseInt(periodMonth) : null,
        status:       'RECEIVED',
        uploadedById: caller.sub,
        retentionUntil,
      },
    })
    await writeAuditLog({ userId: caller.sub, clientId, action: 'DOCUMENT_UPLOADED', entityType: 'Document', entityId: doc.id, after: { fileName: data.filename, documentType } })
    return reply.status(201).send(doc)
  })

  // PATCH /api/documents/:id/status  – בדיקת תקינות
  app.patch('/:id/status', async (req, reply) => {
    const caller = req.user as { sub: string; role: UserRole }
    if (!STAFF_ROLES.includes(caller.role)) throw new ForbiddenError()
    const { id } = req.params as { id: string }
    const body = z.object({
      status:        z.nativeEnum(DocumentStatus),
      invalidReason: z.string().optional(),
    }).parse(req.body)
    const doc = await prisma.document.update({
      where: { id },
      data: { status: body.status, invalidReason: body.invalidReason, reviewedById: caller.sub, reviewedAt: new Date() },
    })
    await writeAuditLog({ userId: caller.sub, clientId: doc.clientId, action: `DOCUMENT_${body.status}`, entityType: 'Document', entityId: id })
    return reply.send(doc)
  })
}
