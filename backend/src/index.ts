import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import path from 'path'
import fs from 'fs'
import { config } from './shared/config'
import { AppError } from './shared/errors'
import { authenticate } from './auth/auth.middleware'
import { authRoutes } from './auth/auth.routes'
import { userRoutes } from './auth/user.routes'
import { clientRoutes } from './clients/client.routes'
import { processTemplateRoutes } from './processes/template.routes'
import { processInstanceRoutes } from './processes/instance.routes'
import { taskRoutes } from './tasks/task.routes'
import { documentRoutes } from './documents/document.routes'
import { dashboardRoutes } from './dashboard/dashboard.routes'

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: config.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

async function bootstrap() {
  // Security
  await app.register(helmet, { global: true })
  await app.register(cors, {
    origin: config.NODE_ENV === 'production'
      ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false)
      : ['http://localhost:3000'],
    credentials: true,
  })

  // JWT
  await app.register(jwt, {
    secret: config.JWT_SECRET,
  })

  // File uploads
  await app.register(multipart, {
    limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024 },
  })

  // Serve uploaded files
  const uploadDir = path.resolve(config.UPLOAD_DIR)
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

  await app.register(fastifyStatic, {
    root:   uploadDir,
    prefix: '/uploads/',
  })

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error:   error.code ?? 'APP_ERROR',
        message: error.message,
      })
    }
    // Validation errors from Fastify/Zod
    if (error.statusCode === 400) {
      return reply.status(400).send({
        error:   'VALIDATION_ERROR',
        message: error.message,
      })
    }
    app.log.error(error)
    return reply.status(500).send({
      error:   'INTERNAL_SERVER_ERROR',
      message: 'שגיאה פנימית. נסה שוב מאוחר יותר.',
    })
  })

  // Auth decorator – used in all protected routes
  app.decorate('authenticate', authenticate)

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Routes
  await app.register(authRoutes,            { prefix: '/api/auth' })
  await app.register(userRoutes,            { prefix: '/api/users' })
  await app.register(clientRoutes,          { prefix: '/api/clients' })
  await app.register(processTemplateRoutes, { prefix: '/api/process-templates' })
  await app.register(processInstanceRoutes, { prefix: '/api/process-instances' })
  await app.register(taskRoutes,            { prefix: '/api/tasks' })
  await app.register(documentRoutes,        { prefix: '/api/documents' })
  await app.register(dashboardRoutes,       { prefix: '/api/dashboard' })

  // הגש את ה-frontend כ-SPA (בproduction בלבד)
  const frontendDist = path.resolve(__dirname, '../frontend/dist')
  if (config.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
      decorateReply: false,
      wildcard: false,
    })
    // SPA fallback: כל route שאינו API → index.html
    app.setNotFoundHandler(async (_request, reply) => {
      return reply.status(200).sendFile('index.html', frontendDist)
    })
  }

  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  console.log(`🚀 Server running on http://localhost:${config.PORT}`)
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
