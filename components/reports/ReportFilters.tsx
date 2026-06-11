'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
] as const

const PACKAGE_TABS = [
  { value: 'all', label: 'All packages' },
  { value: 'standard', label: 'Standard' },
  { value: 'comprehensive', label: 'Comprehensive' },
  { value: 'premium', label: 'Premium' },
] as const

const SORTS = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
] as const

export function ReportFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState(params.get('search') ?? '')

  const status = params.get('status') ?? 'all'
  const pkg = params.get('pkg') ?? 'all'
  const sort = params.get('sort') ?? 'updated'

  function update(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'all' || (k === 'sort' && v === 'updated')) sp.delete(k)
      else sp.set(k, v)
    }
    startTransition(() => router.replace(`/reports?${sp.toString()}`))
  }

  // Debounce the search box.
  useEffect(() => {
    const current = params.get('search') ?? ''
    if (search === current) return
    const t = setTimeout(() => update({ search }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reference, customer, phone, vehicle, plate, VIN…"
          className="input-base pl-11 pr-10"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {STATUS_TABS.map((t) => (
            <Chip key={t.value} active={status === t.value} onClick={() => update({ status: t.value })}>
              {t.label}
            </Chip>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={pkg}
            onChange={(e) => update({ pkg: e.target.value })}
            className="input-base h-10 w-auto min-h-0 py-1.5 text-sm"
            aria-label="Filter by package"
          >
            {PACKAGE_TABS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className="input-base h-10 w-auto min-h-0 py-1.5 text-sm"
            aria-label="Sort"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-input border px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-accent bg-accent-muted text-accent'
          : 'border-border bg-card text-text-secondary hover:border-border-hover hover:text-text-primary',
      )}
    >
      {children}
    </button>
  )
}
