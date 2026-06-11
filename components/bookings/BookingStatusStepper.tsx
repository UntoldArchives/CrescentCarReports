'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateBookingStatus } from '@/app/(app)/bookings/actions'
import { STATUS_LABELS, type BookingStatus } from '@/lib/booking-types'

/** Forward pipeline (New → Confirmed → In Progress → Completed). `pending_payment`
 *  precedes it; `cancelled` is terminal. */
const STAGES: BookingStatus[] = [
  'paid_new',
  'time_confirmed',
  'inspection_in_progress',
  'report_sent',
]

/**
 * The §9 pipeline as a connected, click-to-advance stepper. Clicking any stage
 * moves the booking there via updateBookingStatus. A cancelled booking collapses
 * to a banner with a "reopen" action; an unpaid hold shows an "awaiting payment"
 * hint with the stepper still navigable for manual overrides.
 */
export function BookingStatusStepper({
  bookingId,
  current,
}: {
  bookingId: string
  current: BookingStatus
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [target, setTarget] = useState<BookingStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  function go(status: BookingStatus) {
    if (status === current || pending) return
    setError(null)
    setTarget(status)
    startTransition(async () => {
      const res = await updateBookingStatus(bookingId, status)
      if (!res.ok) {
        setError(res.error || 'Could not update status.')
        setTarget(null)
        return
      }
      setTarget(null)
      router.refresh()
    })
  }

  if (current === 'cancelled') {
    return (
      <section className="card-base p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              Pipeline
            </h2>
            <span className="mt-2 inline-flex items-center rounded-tag border border-fail/30 bg-fail-muted px-2 py-0.5 text-sm font-semibold text-fail">
              Cancelled / Refunded
            </span>
          </div>
          <button
            type="button"
            onClick={() => go('paid_new')}
            disabled={pending}
            className="btn-secondary h-10 text-sm"
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
            Reopen as Paid (new)
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-input border border-fail/30 bg-fail-muted px-3 py-2 text-sm text-fail">
            {error}
          </p>
        )}
      </section>
    )
  }

  const currentIndex = STAGES.indexOf(current) // -1 while pending_payment

  return (
    <section className="card-base p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Pipeline</h2>
        {current === 'pending_payment' && (
          <span className="text-xs font-medium text-attention">Awaiting payment</span>
        )}
      </div>

      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
        {STAGES.map((s, i) => {
          const done = i < currentIndex
          const isCurrent = i === currentIndex
          const isTarget = target === s
          return (
            <li key={s} className="flex items-center gap-3 sm:flex-1">
              <button
                type="button"
                onClick={() => go(s)}
                disabled={pending}
                title={`Move to “${STATUS_LABELS[s]}”`}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                  done
                    ? 'border-accent bg-accent text-black'
                    : isCurrent
                      ? 'border-accent bg-accent-muted text-accent'
                      : 'border-border bg-card text-text-muted hover:border-border-hover hover:text-text-secondary',
                )}
              >
                {isTarget && pending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : done ? (
                  <Check size={14} />
                ) : (
                  i + 1
                )}
              </button>
              <span
                className={cn(
                  'text-sm',
                  isCurrent ? 'font-semibold text-text-primary' : 'text-text-secondary',
                )}
              >
                {STATUS_LABELS[s]}
              </span>
              {i < STAGES.length - 1 && (
                <span className="hidden h-px flex-1 bg-border sm:mx-2 sm:block" />
              )}
            </li>
          )
        })}
      </ol>

      {error && (
        <p className="mt-3 rounded-input border border-fail/30 bg-fail-muted px-3 py-2 text-sm text-fail">
          {error}
        </p>
      )}
      <p className="mt-3 text-xs text-text-muted">
        Tap a stage to move this booking. Use “Cancel / refund” to close it.
      </p>
    </section>
  )
}
