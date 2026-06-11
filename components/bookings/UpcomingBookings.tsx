import Link from 'next/link'
import { CalendarCheck } from 'lucide-react'
import { format } from 'date-fns'
import { SLOTS, type BookingWithInspector } from '@/lib/booking-types'
import { BookingStatusBadge } from './BookingBadges'

/** Compact "next inspections" list for the dashboard. Server-safe. */
export function UpcomingBookings({ bookings }: { bookings: BookingWithInspector[] }) {
  if (bookings.length === 0) {
    return (
      <div className="card-base flex flex-col items-center justify-center px-6 py-10 text-center">
        <CalendarCheck size={24} className="text-text-muted" />
        <p className="mt-2 text-sm text-text-secondary">No upcoming inspections.</p>
      </div>
    )
  }

  return (
    <div className="card-base divide-y divide-border overflow-hidden p-0">
      {bookings.map((b) => (
        <Link
          key={b.id}
          href={`/bookings/${b.id}`}
          className="flex items-center gap-3 p-3 transition-colors hover:bg-card-hover"
        >
          <div className="flex w-16 shrink-0 flex-col items-center rounded-input border border-border bg-surface px-2 py-1.5 text-center">
            <span className="text-xs font-semibold text-text-primary">
              {format(new Date(`${b.inspection_date}T00:00:00`), 'd MMM')}
            </span>
            <span className="text-[11px] text-text-muted">{SLOTS[b.slot_time]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">
              {[b.car_year, b.car_make, b.car_model].filter(Boolean).join(' ')}
            </p>
            <p className="truncate text-xs text-text-secondary">
              {b.customer_name} · {b.emirate}
            </p>
          </div>
          <BookingStatusBadge status={b.booking_status} />
        </Link>
      ))}
    </div>
  )
}
