import { AuthShell } from '@/components/auth/AuthShell'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata = { title: 'Set new password' }

export default function ResetPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account">
      <ResetPasswordForm />
    </AuthShell>
  )
}
