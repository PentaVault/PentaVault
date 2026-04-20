import { AuthPanel } from '@/components/auth/auth-panel'
import { RegisterForm } from '@/components/auth/register-form'
import { redirectAuthenticatedToDashboard } from '@/lib/auth/server-session'

export default async function RegisterPage() {
  await redirectAuthenticatedToDashboard()

  return (
    <AuthPanel
      eyebrow="Create Account"
      title="Set up your account"
      description="Create your PentaVault account to begin managing secrets and project access safely."
    >
      <RegisterForm />
    </AuthPanel>
  )
}
