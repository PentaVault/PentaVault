import { z } from 'zod'

const DEFAULT_DEV_API_URL = 'http://localhost:3001/api'
const DEFAULT_DEV_APP_URL = 'http://localhost:3000'

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().trim().min(1).url(),
  NEXT_PUBLIC_APP_URL: z.string().trim().min(1).url(),
  NEXT_PUBLIC_MOCK_AUTH_ENABLED: z
    .string()
    .trim()
    .optional()
    .transform((value) => value === 'true'),
  NEXT_PUBLIC_MOCK_AUTH_EMAIL: z.string().trim().optional(),
  NEXT_PUBLIC_MOCK_AUTH_PASSWORD: z.string().trim().optional(),
  NEXT_PUBLIC_MOCK_AUTH_NAME: z.string().trim().optional(),
  NEXT_PUBLIC_MOCK_AUTH_USER_ID: z.string().trim().optional(),
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
    NEXT_PUBLIC_MOCK_AUTH_ENABLED: input.NEXT_PUBLIC_MOCK_AUTH_ENABLED,
    NEXT_PUBLIC_MOCK_AUTH_EMAIL: input.NEXT_PUBLIC_MOCK_AUTH_EMAIL,
    NEXT_PUBLIC_MOCK_AUTH_PASSWORD: input.NEXT_PUBLIC_MOCK_AUTH_PASSWORD,
    NEXT_PUBLIC_MOCK_AUTH_NAME: input.NEXT_PUBLIC_MOCK_AUTH_NAME,
    NEXT_PUBLIC_MOCK_AUTH_USER_ID: input.NEXT_PUBLIC_MOCK_AUTH_USER_ID,
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
  mockAuthEnabled: parsedEnv.NEXT_PUBLIC_MOCK_AUTH_ENABLED,
  mockAuthEmail: parsedEnv.NEXT_PUBLIC_MOCK_AUTH_EMAIL ?? 'demo@pentavault.local',
  mockAuthPassword: parsedEnv.NEXT_PUBLIC_MOCK_AUTH_PASSWORD ?? 'demo-password-123',
  mockAuthName: parsedEnv.NEXT_PUBLIC_MOCK_AUTH_NAME ?? 'Demo User',
  mockAuthUserId: parsedEnv.NEXT_PUBLIC_MOCK_AUTH_USER_ID ?? 'mock-user-1',
} as const

export type Env = typeof env
