import { cn } from '@/lib/utils'
import type { ChecklistStatus, PackageType, ReportStatus } from '@/lib/report-types'
import { STATUS_LABEL } from '@/lib/report-utils'
import { getPackage } from '@/lib/report-templates'

const STATUS_STYLES: Record<ChecklistStatus, string> = {
  pass: 'bg-pass-muted text-pass border-pass/30',
  minor: 'bg-attention-muted text-attention border-attention/30',
  major: 'bg-fail-muted text-fail border-fail/30',
  na: 'bg-na-muted text-na border-na/30',
}

export function StatusDot({ status, className }: { status: ChecklistStatus; className?: string }) {
  const colour: Record<ChecklistStatus, string> = {
    pass: 'bg-pass',
    minor: 'bg-attention',
    major: 'bg-fail',
    na: 'bg-na',
  }
  return <span className={cn('inline-block h-2 w-2 rounded-full', colour[status], className)} />
}

export function ChecklistStatusBadge({ status }: { status: ChecklistStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-tag border px-2 py-0.5 text-xs font-semibold',
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

const REPORT_STATUS_STYLES: Record<ReportStatus, string> = {
  draft: 'bg-attention-muted text-attention border-attention/30',
  completed: 'bg-pass-muted text-pass border-pass/30',
  archived: 'bg-na-muted text-na border-na/30',
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-tag border px-2 py-0.5 text-xs font-semibold capitalize',
        REPORT_STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  )
}

export function PackageBadge({ pkg }: { pkg: PackageType }) {
  const config = getPackage(pkg)
  return (
    <span className="inline-flex items-center rounded-tag border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary">
      {config.name}
    </span>
  )
}
