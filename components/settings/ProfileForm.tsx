'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { updateMyProfile } from '@/app/(app)/settings/actions'
import { Spinner } from '@/components/ui/Spinner'
import type { InspectorProfile } from '@/lib/report-types'

export function ProfileForm({ profile }: { profile: InspectorProfile }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)
    const result = await updateMyProfile(new FormData(e.currentTarget))
    setLoading(false)
    if (!result.ok) {
      setError(result.error || 'Could not save.')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="label-base">Full name</span>
        <input name="full_name" defaultValue={profile.full_name} required className="input-base" />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label-base">Phone</span>
          <input name="phone" type="tel" defaultValue={profile.phone ?? ''} className="input-base" />
        </label>
        <label className="block">
          <span className="label-base">Email</span>
          <input value={profile.email} disabled className="input-base cursor-not-allowed opacity-70" />
        </label>
      </div>
      {error && <p className="text-sm text-fail">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? <Spinner /> : saved ? <Check size={18} /> : null}
        {saved ? 'Saved' : 'Save changes'}
      </button>
    </form>
  )
}
