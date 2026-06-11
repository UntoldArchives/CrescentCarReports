'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { saveBookingAdminNotes } from '@/app/(app)/bookings/actions'

/** Internal admin notes editor (not shown to the customer). */
export function BookingNotesEditor({
  bookingId,
  initial,
}: {
  bookingId: string
  initial: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const dirty = value !== initial

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await saveBookingAdminNotes(bookingId, value)
      if (!res.ok) {
        setError(res.error || 'Could not save notes.')
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setSaved(false)
        }}
        rows={4}
        placeholder="Internal notes (not shown to the customer)…"
        className="input-base min-h-[100px] resize-y"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        {saved && !dirty && !error ? (
          <span className="inline-flex items-center gap-1 text-xs text-pass">
            <Check size={12} /> Saved
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="btn-secondary h-9 text-sm"
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          Save notes
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-fail">{error}</p>}
    </div>
  )
}
