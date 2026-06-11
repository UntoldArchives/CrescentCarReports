'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/Spinner'

export function LoginForm({ redirectTo, notice }: { redirectTo: string; notice?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Cookie session is set; navigate to the intended page.
    router.replace(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {notice && (
        <div className="rounded-input border border-attention/30 bg-attention-muted px-3 py-2 text-sm text-attention">
          {notice}
        </div>
      )}
      <div>
        <label className="label-base" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-base"
          placeholder="inspector@crescentcarchecks.com"
        />
      </div>
      <div>
        <label className="label-base" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base pr-11"
            placeholder="••••••••"
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
        {loading ? <Spinner /> : 'Sign in'}
      </button>

      <div className="text-center">
        <Link href="/forgot-password" className="text-sm text-text-secondary hover:text-accent">
          Forgot password?
        </Link>
      </div>
    </form>
  )
}
