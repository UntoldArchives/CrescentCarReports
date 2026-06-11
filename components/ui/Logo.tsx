import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Crescent Car Check wordmark. `variant="light"` is for the white report
 * document; the default dark variant is for the app shell.
 */
export function Logo({
  className,
  variant = 'dark',
}: {
  className?: string
  variant?: 'dark' | 'light'
}) {
  return (
    <span
      className={cn(
        'relative block h-9 w-[132px]',
        variant === 'dark' && '[filter:drop-shadow(0_2px_8px_rgba(255,198,0,0.3))]',
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="Crescent Car Check"
        fill
        sizes="132px"
        priority
        className="object-contain object-left"
      />
    </span>
  )
}

/** Compact product lockup: wordmark + "Reports" tag. */
export function ProductLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo />
      <span className="rounded-tag border border-accent/30 bg-accent-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
        Reports
      </span>
    </div>
  )
}
