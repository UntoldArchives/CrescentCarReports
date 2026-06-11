import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { requireAdmin } from '@/lib/auth'
import { getDaySchedule, dubaiToday, addDaysISO } from '@/lib/bookings-data'
import { DaySchedule } from '@/components/bookings/DaySchedule'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Day schedule' }
export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await requireAdmin()
  const sp = await searchParams
  const today = dubaiToday()
  const date = sp.date && DATE_RE.test(sp.date) ? sp.date : today
  const slots = await getDaySchedule(date)

  const prev = addDaysISO(date, -1)
  const next = addDaysISO(date, 1)
  const strip = Array.from({ length: 7 }, (_, i) => addDaysISO(today, i))
  const d = new Date(`${date}T00:00:00`)

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={16} /> Bookings
        </Link>
        <h1 className="mt-2 text-display-sm text-text-primary">Day schedule</h1>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/bookings/schedule?date=${prev}`}
          className="btn-secondary h-10 w-10 p-0"
          aria-label="Previous day"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="text-center">
          <p className="text-base font-semibold text-text-primary">{format(d, 'EEEE')}</p>
          <p className="text-sm text-text-secondary">{format(d, 'd MMMM yyyy')}</p>
        </div>
        <Link
          href={`/bookings/schedule?date=${next}`}
          className="btn-secondary h-10 w-10 p-0"
          aria-label="Next day"
        >
          <ChevronRight size={18} />
        </Link>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {strip.map((iso) => {
          const sd = new Date(`${iso}T00:00:00`)
          const active = iso === date
          return (
            <Link
              key={iso}
              href={`/bookings/schedule?date=${iso}`}
              className={cn(
                'flex min-w-[3.25rem] flex-col items-center rounded-input border px-2 py-1.5 text-center transition-colors',
                active
                  ? 'border-accent bg-accent-muted text-accent'
                  : 'border-border bg-card text-text-secondary hover:border-border-hover',
              )}
            >
              <span className="text-xs font-medium">{format(sd, 'EEE')}</span>
              <span className="text-sm font-bold">{format(sd, 'd')}</span>
            </Link>
          )
        })}
      </div>

      {date !== today && (
        <Link
          href={`/bookings/schedule?date=${today}`}
          className="inline-block text-sm font-medium text-accent hover:text-accent-hover"
        >
          Jump to today
        </Link>
      )}

      <DaySchedule date={date} slots={slots} />
    </div>
  )
}
