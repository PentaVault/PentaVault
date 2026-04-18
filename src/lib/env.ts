/**
 * Environment variable validation.
 * This file validates all environment variables at startup.
 * The app will throw a clear error if required vars are missing.
 *
 * Rules:
 * - NEXT_PUBLIC_* variables are safe to expose to the browser
 * - Never put secrets in NEXT_PUBLIC_* variables
 * - Never access process.env directly outside this file
 */

function requireEnv(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        'Add it to .env.local for development or your production environment config.\n' +
        'See .env.example for all required variables.'
    )
  }

  return value
}

function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback
}

export const env = {
  apiUrl: requireEnv('NEXT_PUBLIC_API_URL'),
  appUrl: requireEnv('NEXT_PUBLIC_APP_URL'),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
} as const

export type Env = typeof env
