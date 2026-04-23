import { AuthPanel } from '@/components/auth/auth-panel'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { redirectAuthenticatedToDashboard } from '@/lib/auth/server-session'

export default async function ForgotPasswordPage() {
  await redirectAuthenticatedToDashboard()

  return (
    <AuthPanel
      description="Use a one-time code sent to your email to set a new password."
      eyebrow="Password Reset"
      title="Reset your password"
    >
      <ForgotPasswordForm />
    </AuthPanel>
  )
}
