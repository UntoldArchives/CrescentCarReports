'use client'

import { useState } from 'react'
import { Copy, Check, UserPlus } from 'lucide-react'
import { createInvite } from '@/app/(app)/settings/actions'
import { Spinner } from '@/components/ui/Spinner'

export function InviteForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invite, setInvite] = useState<{ url: string; email: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInvite(null)
    const result = await createInvite(new FormData(e.currentTarget))
    setLoading(false)
    if (!result.ok) {
      setError(result.error || 'Could not create invite.')
      return
    }
    setInvite({ url: result.url || '', email: result.email || '' })
    e.currentTarget.reset()
  }

  async function copy() {
    if (!invite) return
    await navigator.clipboard.writeText(invite.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <input name="email" type="email" required placeholder="inspector@email.com" className="input-base" />
          <select name="role" defaultValue="inspector" className="input-base sm:w-40" aria-label="Role">
            <option value="inspector">Inspector</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="text-sm text-fail">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <Spinner /> : <UserPlus size={18} />}
          Create invite link
        </button>
      </form>

      {invite && (
        <div className="rounded-input border border-pass/30 bg-pass-muted p-3">
          <p className="text-sm font-medium text-text-primary">
            Invite link for <span className="text-pass">{invite.email}</span> — share it securely. Expires in 7 days.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input readOnly value={invite.url} className="input-base h-10 flex-1 text-xs" />
            <button onClick={copy} className="btn-secondary h-10 text-sm">
              {copied ? <Check size={15} className="text-pass" /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
