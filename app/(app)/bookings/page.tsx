import Link from 'next/link'
import { Plus, CalendarDays, CalendarX } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getBookings, type BookingListFilters } from '@/lib/bookings-data'
import { BookingFilters } from '@/components/bookings/BookingFilters'
import { BookingCard } from '@/components/bookings/BookingCard'
import type { BookingStatus } from '@/lib/booking-types'

export const metadata = { title: 'Bookings' }
export const dynamic = 'force-dynamic'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  // Inspectors get a read-only view of their own assigned jobs (RLS scopes the
  // rows); admins see and manage everything.
  const { profile } = await requireUser()
  const isAdmin = profile.role === 'admin'
  const sp = await searchParams
  const filters: BookingListFilters = {
    status: (sp.status as BookingStatus | 'all') ?? 'all',
    fromDate: sp.from,
    toDate: sp.to,
  }
  const bookings = await getBookings(filters)
  const hasQuery = Boolean((sp.status && sp.status !== 'all') || sp.from || sp.to)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-display-sm text-text-primary">{isAdmin ? 'Bookings' : 'My Jobs'}</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Link href="/bookings/schedule" className="btn-secondary">
              <CalendarDays size={18} />
              <span className="hidden sm:inline">Schedule</span>
            </Link>
            <Link href="/bookings/new" className="btn-primary">
              <Plus size={18} />
              <span className="hidden sm:inline">Add booking</span>
            </Link>
          </div>
        )}
      </div>

      <BookingFilters />

      <p className="text-sm text-text-muted">
        {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
      </p>

      {bookings.length === 0 ? (
        <div className="card-base flex flex-col items-center justify-center px-6 py-16 text-center">
          <CalendarX size={28} className="text-text-muted" />
          <h3 className="mt-3 text-lg font-semibold text-text-primary">
            {hasQuery ? 'No matching bookings' : isAdmin ? 'No bookings yet' : 'No jobs assigned yet'}
          </h3>
          <p className="mt-1 max-w-xs text-sm text-text-secondary">
            {hasQuery
              ? 'Try a different status or date range.'
              : isAdmin
                ? 'Paid website bookings appear here automatically — or add a phone booking.'
                : 'Inspections assigned to you will show up here.'}
          </p>
          {!hasQuery && isAdmin && (
            <Link href="/bookings/new" className="btn-primary mt-5">
              <Plus size={18} />
              Add booking
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}
