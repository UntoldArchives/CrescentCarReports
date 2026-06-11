'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/Spinner'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-text-secondary">
          If an account exists for <span className="text-text-primary">{email}</span>, a password
          reset link is on its way.
        </p>
        <Link href="/login" className="btn-secondary w-full">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label-base" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base"
          placeholder="inspector@crescentcarchecks.com"
        />
      </div>
      {error && <p className="text-sm text-fail">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <Spinner /> : 'Send reset link'}
      </button>
      <div className="text-center">
        <Link href="/login" className="text-sm text-text-secondary hover:text-accent">
          Back to sign in
        </Link>
      </div>
    </form>
  )
}
