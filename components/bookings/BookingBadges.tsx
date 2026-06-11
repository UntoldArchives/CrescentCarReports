import { cn } from '@/lib/utils'
import {
  PAYMENT_STATUS_LABELS,
  STATUS_LABELS,
  type BookingStatus,
  type PaymentStatus,
} from '@/lib/booking-types'

/** Distinct colour per pipeline stage so the list scans at a glance. */
const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  pending_payment: 'bg-na-muted text-na border-na/30',
  paid_new: 'bg-accent-muted text-accent border-accent/30',
  time_confirmed: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  inspection_in_progress: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  report_sent: 'bg-pass-muted text-pass border-pass/30',
  cancelled: 'bg-fail-muted text-fail border-fail/30',
}

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-tag border px-2 py-0.5 text-xs font-semibold',
        BOOKING_STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-attention-muted text-attention border-attention/30',
  paid: 'bg-pass-muted text-pass border-pass/30',
  failed: 'bg-fail-muted text-fail border-fail/30',
  refunded: 'bg-na-muted text-na border-na/30',
  manual: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-tag border px-2 py-0.5 text-xs font-semibold',
        PAYMENT_STATUS_STYLES[status],
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  )
}

/** Small marker for admin-added bookings (paid offline, bypassed slot rules). */
export function ManualBookingTag() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-tag border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary">
      Manual booking
    </span>
  )
}

/** Hint that an emirate carries the AED 100 travel fee / 9:30 AM-only rule. */
export function LongDistanceTag() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-tag border border-attention/30 bg-attention-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-attention">
      Long distance
    </span>
  )
}
