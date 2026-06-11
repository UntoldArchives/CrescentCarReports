'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { redeemInvite } from '@/app/invite/[token]/actions'
import { Spinner } from '@/components/ui/Spinner'

export function InviteSignupForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const password = String(formData.get('password') || '')

    const result = await redeemInvite(token, formData)
    if (!result.ok) {
      setError(result.error || 'Something went wrong.')
      setLoading(false)
      return
    }

    // Account created — sign in with the same credentials.
    const supabase = createClient()
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: result.email || email,
      password,
    })
    if (signInErr) {
      // Account exists; send them to login to finish.
      router.replace('/login')
      return
    }
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label-base">Email</label>
        <input value={email} disabled className="input-base cursor-not-allowed opacity-70" />
      </div>
      <div>
        <label className="label-base" htmlFor="full_name">
          Full name
        </label>
        <input id="full_name" name="full_name" required className="input-base" placeholder="Ahmed Khan" />
      </div>
      <div>
        <label className="label-base" htmlFor="phone">
          Phone <span className="font-normal normal-case text-text-muted">(optional)</span>
        </label>
        <input id="phone" name="phone" type="tel" className="input-base" placeholder="+971 50 123 4567" />
      </div>
      <div>
        <label className="label-base" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            required
            minLength={8}
            className="input-base pr-11"
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-fail">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <Spinner /> : 'Create account'}
      </button>
    </form>
  )
}
