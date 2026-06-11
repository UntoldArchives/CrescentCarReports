import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { InviteSignupForm } from '@/components/auth/InviteSignupForm'
import { createServiceClient, isServiceConfigured } from '@/lib/supabase/server'
import { isPast } from '@/lib/utils'

export const metadata = { title: 'Accept invite' }

function InviteError({ message }: { message: string }) {
  return (
    <AuthShell title="Invite unavailable">
      <p className="text-sm text-text-secondary">{message}</p>
      <Link href="/login" className="btn-secondary mt-5 w-full">
        Go to sign in
      </Link>
    </AuthShell>
  )
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!isServiceConfigured()) {
    return <InviteError message="Sign-up is not configured yet. Contact an administrator." />
  }

  const service = createServiceClient()
  const { data: invite } = await service
    .from('inspector_invites')
    .select('email, used_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return <InviteError message="This invite link is invalid or no longer exists." />
  if (invite.used_at) return <InviteError message="This invite has already been used. Try signing in instead." />
  if (isPast(invite.expires_at)) {
    return <InviteError message="This invite link has expired. Ask an administrator for a new one." />
  }

  return (
    <AuthShell title="Set up your account" subtitle="Join the Crescent inspector team">
      <InviteSignupForm token={token} email={invite.email} />
    </AuthShell>
  )
}
