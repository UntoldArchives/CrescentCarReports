'use client'

import { ClipboardCheck, Info } from 'lucide-react'
import type { SectionDef } from '@/lib/report-templates'
import type { ChecklistItemState, ChecklistStatus, PaintCondition } from '@/lib/report-types'
import { itemStatus, sectionScore, paintDeductionsFor } from '@/lib/report-utils'
import { commonIssuesForSection } from '@/lib/issues'
import { SectionAccordion } from './SectionAccordion'
import { ChecklistItemCard } from './ChecklistItemCard'
import { ExteriorPaintEditor } from './ExteriorPaintEditor'

type SectionState = Record<string, ChecklistItemState>

const TYRE_IDS = new Set(['tyre-fl', 'tyre-fr', 'tyre-rl', 'tyre-rr'])

/** Mini status tally + section score rendered in the accordion header. */
function SectionHeaderBadge({
  state,
  total,
  scored,
  paintDeduction = 0,
}: {
  state: SectionState
  total: number
  scored: boolean
  /** Exterior only: extra deduction from non-original paint panels. */
  paintDeduction?: number
}) {
  const tally: Record<ChecklistStatus, number> = { pass: 0, minor: 0, major: 0, na: 0 }
  let done = 0
  for (const s of Object.values(state)) {
    const st = itemStatus(s)
    if (st) {
      tally[st] += 1
      done += 1
    }
  }
  return (
    <span className="hidden items-center gap-2 text-xs font-medium xs:flex">
      {tally.major > 0 && <span className="text-fail">{tally.major} major</span>}
      {tally.minor > 0 && <span className="text-attention">{tally.minor} minor</span>}
      {scored && done > 0 && (
        <span className="font-semibold text-text-secondary">
          {Math.max(0, sectionScore(state) - paintDeduction)}/100
        </span>
      )}
      <span className="text-text-muted">
        {done}/{total}
      </span>
    </span>
  )
}

export function ChecklistSection({
  reportId,
  section,
  state,
  onItemChange,
  paintState,
  onPaintChange,
}: {
  reportId: string
  section: SectionDef
  state: SectionState
  onItemChange: (itemId: string, next: ChecklistItemState) => void
  /** Exterior only: per-panel paint conditions + setter. */
  paintState?: SectionState
  onPaintChange?: (panelId: string, condition: PaintCondition) => void
}) {
  const commonIssues = commonIssuesForSection(section.id)
  const isExterior = section.kind === 'exterior'
  const isTyres = section.kind === 'tyres'

  return (
    <SectionAccordion
      title={section.title}
      subtitle={section.description}
      icon={<ClipboardCheck size={18} />}
      badge={
        <SectionHeaderBadge
          state={state}
          total={section.items.length}
          scored={Boolean(section.scored)}
          paintDeduction={isExterior ? paintDeductionsFor(paintState) : 0}
        />
      }
    >
      <div className="space-y-3">
        {section.kind === 'accident' && (
          <p className="flex items-start gap-2 rounded-input border border-border bg-surface p-2.5 text-xs text-text-secondary">
            <Info size={14} className="mt-0.5 shrink-0 text-accent" />
            No accident record found does not guarantee the car has never been in an accident — it only means
            no record was found in the sources checked.
          </p>
        )}

        {isExterior && paintState && onPaintChange && (
          <div className="rounded-input border border-border bg-card p-3">
            <p className="mb-2 text-sm font-semibold text-text-primary">Paint &amp; panel condition</p>
            <ExteriorPaintEditor state={paintState} onChange={onPaintChange} />
          </div>
        )}

        <div className="space-y-2.5">
          {section.items.map((item) => (
            <ChecklistItemCard
              key={item.id}
              reportId={reportId}
              sectionId={section.id}
              item={item}
              state={state[item.id] ?? {}}
              onChange={(next) => onItemChange(item.id, next)}
              commonIssues={commonIssues}
              tyre={isTyres && TYRE_IDS.has(item.id)}
            />
          ))}
        </div>
      </div>
    </SectionAccordion>
  )
}
