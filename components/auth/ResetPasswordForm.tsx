'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/Spinner'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    await supabase.auth.signOut()
    router.replace('/login?reason=reset')
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label-base" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-base"
          placeholder="At least 8 characters"
        />
      </div>
      {error && <p className="text-sm text-fail">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <Spinner /> : 'Update password'}
      </button>
    </form>
  )
}
