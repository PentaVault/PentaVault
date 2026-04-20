import { AuthPanel } from '@/components/auth/auth-panel'
import { LoginForm } from '@/components/auth/login-form'
import { normalizeNextPath } from '@/lib/auth/paths'
import { redirectAuthenticatedToDashboard } from '@/lib/auth/server-session'

type LoginPageProps = {
  searchParams?: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectAuthenticatedToDashboard()

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const nextPath = normalizeNextPath(resolvedSearchParams?.next)

  return (
    <AuthPanel
      eyebrow="Sign In"
      title="Welcome back"
      description="Sign in with your account credentials to access project security controls."
    >
      <LoginForm nextPath={nextPath} />
    </AuthPanel>
  )
}
