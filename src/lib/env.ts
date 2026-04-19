import { z } from 'zod'

const DEFAULT_DEV_API_URL = 'http://localhost:3001/api'
const DEFAULT_DEV_APP_URL = 'http://localhost:3000'

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().trim().min(1).url(),
  NEXT_PUBLIC_APP_URL: z.string().trim().min(1).url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

type ParsedEnv = z.infer<typeof envSchema>

function getRawEnv(input: NodeJS.ProcessEnv = process.env): ParsedEnv {
  const nodeEnv = input.NODE_ENV ?? 'development'

  const raw = {
    NEXT_PUBLIC_API_URL:
      input.NEXT_PUBLIC_API_URL ?? (nodeEnv === 'development' ? DEFAULT_DEV_API_URL : undefined),
    NEXT_PUBLIC_APP_URL:
      input.NEXT_PUBLIC_APP_URL ?? (nodeEnv === 'development' ? DEFAULT_DEV_APP_URL : undefined),
    NODE_ENV: nodeEnv,
  }

  const result = envSchema.safeParse(raw)

  if (result.success) {
    return result.data
  }

  const details = result.error.issues
    .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  throw new Error(
    [
      'Invalid frontend environment configuration.',
      'Fix your local environment and restart the dev server.',
      details,
      'See .env.example for the required variables.',
    ].join('\n')
  )
}

const parsedEnv = getRawEnv()

export const env = {
  apiUrl: parsedEnv.NEXT_PUBLIC_API_URL,
  appUrl: parsedEnv.NEXT_PUBLIC_APP_URL,
  nodeEnv: parsedEnv.NODE_ENV,
  isDev: parsedEnv.NODE_ENV === 'development',
  isProd: parsedEnv.NODE_ENV === 'production',
  isTest: parsedEnv.NODE_ENV === 'test',
} as const

export type Env = typeof env
