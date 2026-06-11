import { cn } from '@/lib/utils'

/**
 * Label/value pair for the booking detail page. Renders an em dash when empty
 * and an anchor (tel/mailto/maps) when an href is supplied. Server-safe.
 */
export function BookingDetailField({
  label,
  value,
  href,
  mono,
}: {
  label: string
  value?: string | null
  href?: string
  mono?: boolean
}) {
  const hasValue = Boolean(value && value.trim())
  const display = hasValue ? (value as string) : '—'
  const external = href?.startsWith('http')

  return (
    <div>
      <dt className="label-base">{label}</dt>
      <dd className={cn('mt-0.5 text-sm text-text-primary', mono && 'font-mono')}>
        {href && hasValue ? (
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="break-words text-accent hover:text-accent-hover"
          >
            {display}
          </a>
        ) : (
          <span className="break-words">{display}</span>
        )}
      </dd>
    </div>
  )
}
