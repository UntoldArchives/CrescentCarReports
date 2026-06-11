'use server'

import { createServiceClient, isServiceConfigured } from '@/lib/supabase/server'
import { isValidEmail, isValidPhone } from '@/lib/report-validation'

export interface RedeemResult {
  ok: boolean
  error?: string
  email?: string
}

/**
 * Redeem an invite: create the auth user, the inspector profile, and mark the
 * invite used — all with the service-role key (server-only). The client form
 * then signs the new inspector in with the same credentials.
 */
export async function redeemInvite(token: string, formData: FormData): Promise<RedeemResult> {
  if (!isServiceConfigured()) {
    return { ok: false, error: 'Server is not configured. Contact an administrator.' }
  }

  const fullName = String(formData.get('full_name') || '').trim()
  const password = String(formData.get('password') || '')
  const phone = String(formData.get('phone') || '').trim()

  if (fullName.length < 2) return { ok: false, error: 'Please enter your full name.' }
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' }
  if (phone && !isValidPhone(phone)) return { ok: false, error: 'Please enter a valid phone number.' }

  const service = createServiceClient()

  // Look up + validate the invite.
  const { data: invite } = await service
    .from('inspector_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return { ok: false, error: 'This invite link is invalid.' }
  if (invite.used_at) return { ok: false, error: 'This invite has already been used.' }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'This invite link has expired.' }
  }
  if (!isValidEmail(invite.email)) return { ok: false, error: 'Invite email is invalid.' }

  // Create the confirmed auth user.
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createErr || !created.user) {
    const msg = createErr?.message || 'Could not create the account.'
    return { ok: false, error: msg.includes('already') ? 'An account already exists for this email.' : msg }
  }

  // Create the profile row.
  const { error: profileErr } = await service.from('inspector_profiles').insert({
    id: created.user.id,
    full_name: fullName,
    email: invite.email,
    phone: phone || null,
    role: invite.role,
    status: 'active',
    last_activity_at: new Date().toISOString(),
  })

  if (profileErr) {
    // Roll back the auth user so the invite can be retried cleanly.
    await service.auth.admin.deleteUser(created.user.id)
    return { ok: false, error: 'Could not finish setting up your profile. Try again.' }
  }

  // Burn the invite.
  await service.from('inspector_invites').update({ used_at: new Date().toISOString() }).eq('id', invite.id)

  return { ok: true, email: invite.email }
}
