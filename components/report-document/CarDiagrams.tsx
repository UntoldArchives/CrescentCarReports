import type { ChecklistStatus, PaintCondition } from '@/lib/report-types'
import { PAINT_LABEL, PAINT_OPTIONS } from '@/lib/issues'

/**
 * Pure-SVG schematic car diagrams for the printed report. No external assets so
 * they render identically on screen and in the PDF. The wheel layout is tinted
 * by checklist status; the body map is tinted by per-panel paint condition.
 */

const FILL: Record<ChecklistStatus, { fill: string; stroke: string; text: string }> = {
  pass: { fill: 'rgba(34,197,94,0.16)', stroke: '#22C55E', text: '#15803D' },
  minor: { fill: 'rgba(245,158,11,0.18)', stroke: '#F59E0B', text: '#B45309' },
  major: { fill: 'rgba(239,68,68,0.16)', stroke: '#EF4444', text: '#B91C1C' },
  na: { fill: 'rgba(107,114,128,0.12)', stroke: '#9CA3AF', text: '#4B5563' },
}
const NEUTRAL = { fill: '#F4F4F2', stroke: '#E0E0DC', text: '#9CA3AF' }
function zone(status?: ChecklistStatus) {
  return status ? FILL[status] : NEUTRAL
}

// ─── Wheel-position layout (tyres) ─────────────────────────────────────────
export type CornerStatuses = {
  fl?: ChecklistStatus
  fr?: ChecklistStatus
  rl?: ChecklistStatus
  rr?: ChecklistStatus
}

export function WheelLayout({ corners, size = 190 }: { corners: CornerStatuses; size?: number }) {
  const wheels: { key: keyof CornerStatuses; x: number; y: number; label: string }[] = [
    { key: 'fl', x: 26, y: 56, label: 'FL' },
    { key: 'fr', x: 152, y: 56, label: 'FR' },
    { key: 'rl', x: 26, y: 214, label: 'RL' },
    { key: 'rr', x: 152, y: 214, label: 'RR' },
  ]
  return (
    <svg width={size} height={size * 1.6} viewBox="0 0 200 320" className="shrink-0">
      {/* body */}
      <rect x="56" y="34" width="88" height="252" rx="34" fill="#F7F7F5" stroke="#E4E4E0" strokeWidth="2" />
      {/* windscreen + roof hints */}
      <rect x="66" y="70" width="68" height="34" rx="8" fill="#EDEDEA" />
      <rect x="64" y="150" width="72" height="86" rx="10" fill="#FFFFFF" stroke="#EDEDEA" strokeWidth="1.5" />
      <text x="100" y="26" textAnchor="middle" fontSize="9" fontWeight="700" fill="#9CA3AF" letterSpacing="1">
        FRONT
      </text>
      <text x="100" y="305" textAnchor="middle" fontSize="9" fontWeight="700" fill="#9CA3AF" letterSpacing="1">
        REAR
      </text>
      {wheels.map((w) => {
        const z = zone(corners[w.key])
        return (
          <g key={w.key}>
            <rect x={w.x} y={w.y} width="22" height="50" rx="7" fill={z.fill} stroke={z.stroke} strokeWidth="2" />
            <text x={w.x + 11} y={w.y + 30} textAnchor="middle" fontSize="11" fontWeight="800" fill={z.text}>
              {w.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Top-down body / paint map ─────────────────────────────────────────────
/** Per-panel paint conditions keyed by PAINT_PANELS ids. */
export type PaintMap = Record<string, PaintCondition | undefined>

const PAINT_FILL: Record<PaintCondition, { fill: string; stroke: string }> = {
  original: { fill: 'rgba(34,197,94,0.18)', stroke: '#22C55E' },
  cosmetic: { fill: 'rgba(59,130,246,0.18)', stroke: '#3B82F6' },
  repainted: { fill: 'rgba(245,158,11,0.20)', stroke: '#F59E0B' },
  faded: { fill: 'rgba(168,85,247,0.18)', stroke: '#A855F7' },
}
// An unmarked panel is treated as original paint (matches the report copy
// "recorded as original / not separately marked" and the paint legend, which has
// no neutral entry) so the whole body is always depicted rather than left blank.
function paintZone(c?: PaintCondition) {
  return PAINT_FILL[c ?? 'original']
}

export function BodyPaintView({ paint, width = 184 }: { paint: PaintMap; width?: number }) {
  const panel = (x: number, y: number, w: number, h: number, id: string, rx = 4) => {
    const z = paintZone(paint[id])
    return <rect x={x} y={y} width={w} height={h} rx={rx} fill={z.fill} stroke={z.stroke} strokeWidth="1.4" />
  }

  return (
    <svg width={width} height={width * 1.62} viewBox="0 0 200 324" className="shrink-0">
      {/* wheels — drawn first so the body overlaps their inner edge */}
      {[
        [33, 58],
        [149, 58],
        [33, 232],
        [149, 232],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="18" height="42" rx="6" fill="#34322B" />
      ))}

      {/* car body silhouette */}
      <path
        d="M70,18 H130 Q150,18 150,46 V278 Q150,306 130,306 H70 Q50,306 50,278 V46 Q50,18 70,18 Z"
        fill="#F4F4F1"
        stroke="#D6D3CB"
        strokeWidth="2"
      />

      {/* left side, front→rear: fender, front door, rear door, quarter */}
      {panel(53, 44, 12, 40, 'front-left-fender')}
      {panel(53, 88, 11, 46, 'front-left-door')}
      {panel(53, 136, 11, 44, 'rear-left-door')}
      {panel(53, 184, 12, 52, 'rear-left-quarter')}
      {/* right side */}
      {panel(135, 44, 12, 40, 'front-right-fender')}
      {panel(136, 88, 11, 46, 'front-right-door')}
      {panel(136, 136, 11, 44, 'rear-right-door')}
      {panel(135, 184, 12, 52, 'rear-right-quarter')}

      {/* front: bumper + bonnet */}
      {panel(62, 24, 76, 13, 'front-bumper', 6)}
      {panel(64, 41, 72, 42, 'bonnet', 5)}

      {/* glass + roof greenhouse (glass neutral; roof + boot tinted) */}
      <path d="M68,88 H132 L124,108 H76 Z" fill="#CBD8E0" />
      {panel(64, 112, 72, 62, 'roof', 5)}
      <path d="M76,190 H124 L132,210 H68 Z" fill="#CBD8E0" />
      {panel(64, 214, 72, 28, 'boot', 5)}

      {/* rear: bumper */}
      {panel(62, 288, 76, 13, 'rear-bumper', 6)}

      {/* side mirrors */}
      <rect x="46" y="92" width="6" height="10" rx="2" fill="#D6D3CB" />
      <rect x="148" y="92" width="6" height="10" rx="2" fill="#D6D3CB" />

      <text x="100" y="11" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#9CA3AF" letterSpacing="1.5">
        FRONT
      </text>
      <text x="100" y="320" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#9CA3AF" letterSpacing="1.5">
        REAR
      </text>
    </svg>
  )
}

/** Status legend for the wheel diagram. */
export function DiagramLegend() {
  const rows: { label: string; color: string }[] = [
    { label: 'Pass', color: '#22C55E' },
    { label: 'Minor', color: '#F59E0B' },
    { label: 'Major', color: '#EF4444' },
    { label: 'Not checked', color: '#D4D4D0' },
  ]
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
      {rows.map((r) => (
        <span key={r.label} className="flex items-center gap-1.5 text-[11px] text-doc-muted">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: r.color }} />
          {r.label}
        </span>
      ))}
    </div>
  )
}

/** Paint-condition legend for the body map. */
export function PaintLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
      {PAINT_OPTIONS.map((opt) => (
        <span key={opt} className="flex items-center gap-1.5 text-[11px] text-doc-muted">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PAINT_FILL[opt].stroke }} />
          {PAINT_LABEL[opt]}
        </span>
      ))}
    </div>
  )
}
