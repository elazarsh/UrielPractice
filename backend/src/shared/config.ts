import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL:           z.string(),
  JWT_SECRET:             z.string().min(32),
  JWT_REFRESH_SECRET:     z.string().min(32),
  JWT_EXPIRES_IN:         z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PORT:                   z.coerce.number().default(3001),
  NODE_ENV:               z.enum(['development', 'production', 'test']).default('development'),
  UPLOAD_DIR:             z.string().default('./uploads'),
  MAX_FILE_SIZE_MB:       z.coerce.number().default(50),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
export type Config = typeof config
