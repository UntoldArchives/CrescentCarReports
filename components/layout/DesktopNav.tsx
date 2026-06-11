'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, CalendarDays, Settings, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Reports', icon: FileText },
  // Visible to inspectors too — they get a read-only view of their assigned jobs.
  { href: '/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function DesktopNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  return (
    <nav className="ml-2 hidden items-center gap-1 md:flex">
      {NAV.filter((n) => !n.adminOnly || isAdmin).map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex items-center gap-2 rounded-input px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-accent-muted text-accent'
                : 'text-text-secondary hover:bg-card hover:text-text-primary',
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
