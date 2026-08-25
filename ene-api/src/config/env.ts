import { z } from 'zod'

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3011),
  TZ: z.string().default('America/Santiago'),
  DATABASE_URL: z.string(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string(),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('Extremo Norte <no-reply@extremonorte.com>'),
  DTE_PROVIDER: z.enum(['mock', 'chilesystems', 'simplefactura']).default('mock'),
  DTE_API_URL: z.string().optional(),
  DTE_API_KEY: z.string().optional(),
  DTE_RUT_EMISOR: z.string().optional(),
  DTE_AMBIENTE: z.enum(['certificacion', 'produccion']).default('certificacion'),
  PDF_BROWSER_WS: z.string().optional(),
  ADJUNTOS_PATH: z.string().default('/data/adjuntos'),
  ADJUNTOS_MAX_MB: z.coerce.number().default(25),
  TC_REFERENCIA_USD: z.coerce.number().default(950),
  CORS_ORIGIN: z.string().default('http://localhost:3010'),
})

const parsed = esquema.safeParse(process.env)
if (!parsed.success) {
  console.error('Variables de entorno inválidas:', z.treeifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
