import { FileText, FilePen, CheckCircle2, CalendarRange } from 'lucide-react'
import type { DashboardStats as Stats } from '@/lib/data'

const CARDS = [
  { key: 'total', label: 'Total reports', icon: FileText, tone: 'text-text-primary' },
  { key: 'draft', label: 'Drafts', icon: FilePen, tone: 'text-attention' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, tone: 'text-pass' },
  { key: 'thisMonth', label: 'This month', icon: CalendarRange, tone: 'text-accent' },
] as const

export function DashboardStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {CARDS.map(({ key, label, icon: Icon, tone }) => (
        <div key={key} className="card-base p-4">
          <div className="flex items-center justify-between">
            <Icon size={18} className={tone} />
          </div>
          <p className="mt-3 text-3xl font-bold tabular-nums text-text-primary">{stats[key]}</p>
          <p className="mt-0.5 text-xs font-medium text-text-secondary">{label}</p>
        </div>
      ))}
    </div>
  )
}
