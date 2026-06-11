'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Collapsible section used for every block in the editor. */
export function SectionAccordion({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="card-base overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-card-hover"
      >
        {icon && <span className="text-accent">{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-text-primary">{title}</span>
          {subtitle && <span className="block text-xs text-text-secondary">{subtitle}</span>}
        </span>
        {badge}
        <ChevronDown
          size={18}
          className={cn('shrink-0 text-text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="border-t border-border p-4">{children}</div>}
    </section>
  )
}
