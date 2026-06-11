import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/auth'
import { getActiveInspectors } from '@/lib/bookings-data'
import { ManualBookingForm } from '@/components/bookings/ManualBookingForm'

export const metadata = { title: 'Add booking' }
export const dynamic = 'force-dynamic'

export default async function NewBookingPage() {
  await requireAdmin()
  const inspectors = await getActiveInspectors()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={16} /> Bookings
        </Link>
        <h1 className="mt-2 text-display-sm text-text-primary">Add a booking</h1>
        <p className="mt-1 text-sm text-text-secondary">
          For phone or WhatsApp customers paid offline. Slot rules are relaxed, but a slot can&apos;t
          be double-booked.
        </p>
      </div>

      <ManualBookingForm inspectors={inspectors} />
    </div>
  )
}
