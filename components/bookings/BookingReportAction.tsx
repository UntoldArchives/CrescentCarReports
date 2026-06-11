'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { FilePlus2, FileText, Loader2 } from 'lucide-react'
import { createReportFromBooking } from '@/app/(app)/bookings/actions'

/**
 * Bridges a booking to the report engine. If a report is already linked, opens
 * it; otherwise creates a draft prefilled from the booking (the action redirects
 * to the editor on success, so a returned value always means failure).
 */
export function BookingReportAction({
  bookingId,
  reportId,
}: {
  bookingId: string
  reportId: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (reportId) {
    return (
      <Link href={`/reports/${reportId}/edit`} className="btn-primary">
        <FileText size={18} />
        Open linked report
      </Link>
    )
  }

  function create() {
    setError(null)
    startTransition(async () => {
      const res = await createReportFromBooking(bookingId)
      if (res && !res.ok) setError(res.error || 'Could not create report.')
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={create} disabled={pending} className="btn-primary">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <FilePlus2 size={18} />}
        Create report
      </button>
      {error && <p className="text-xs text-fail">{error}</p>}
    </div>
  )
}
