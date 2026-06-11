import type { ChecklistStatus, PaintCondition } from './report-types'

// ════════════════════════════════════════════════════════════════════════
// Common faults, auto-comment generation and exterior paint config.
//
// Drives the brief's guided issue workflow: when the inspector marks an item
// Minor / Major, a list of common faults appears as tick-boxes, and a clean
// customer-facing comment is generated automatically from the selection.
// ════════════════════════════════════════════════════════════════════════

/** Common fault tick-boxes per scored section (brief sections A–H). */
export const COMMON_ISSUES: Record<string, string[]> = {
  'accident-history': [
    'Minor accident record found',
    'Major accident record found',
    'Salvage / total loss history',
    'Flood history',
    'Airbag deployment history',
    'Structural / chassis repair reported',
    'Source data limited or unavailable',
  ],
  exterior: [
    'Scratches',
    'Dents',
    'Stone chips',
    'Panel gap / alignment issue',
    'Cosmetic paint',
    'Repainted panel',
    'Faded paint',
    'Previous repair signs',
  ],
  interior: [
    'Seat wear',
    'Trim damage',
    'Roof lining damage',
    'Dashboard wear',
    'Door card / armrest damage',
    'Floor mat wear',
    'Broken AC vent',
    'Infotainment / control issue',
    'Weak AC cooling',
    'AC not cooling properly',
    'Possible AC compressor concern',
    'Water damage / mould / moisture smell',
  ],
  'tyres-brakes': [
    'Low tread',
    'Tyre too old (date code)',
    'Tyre sidewall damage',
    'Tyre cracking',
    'Uneven wear',
    'Minor rim curb rash',
    'Bent / cracked rim',
    'Brake pads low',
    'Brake discs worn',
    'Brake vibration',
    'Brake safety concern',
  ],
  'engine-bay': [
    'Minor oil seepage',
    'Active oil leak',
    'Coolant leak',
    'Coolant residue',
    'Valve cover leak',
    'Timing cover leak',
    'Oil filter housing leak',
    'Worn hose / belt',
    'Engine cover / shield damaged',
    'Engine mount wear',
    'Engine mount failure',
    'Abnormal engine noise',
    'Overheating concern',
    'Previous engine repair signs',
  ],
  'underbody-transmission': [
    'Underbody scraping',
    'Surface rust',
    'Heavy underbody rust / corrosion',
    'Underbody impact damage',
    'Undertray loose / damaged',
    'Transmission fluid leak',
    'Gear shift delay',
    'Jerky gear change',
    'Gear slipping',
    'Transmission noise',
    'Drivetrain vibration',
    'Previous underbody repair signs',
    'Exhaust underside damage',
  ],
  'suspension-steering': [
    'Bushing wear',
    'Worn bushes (replacement due)',
    'Leaking shock absorber',
    'Damaged suspension boot',
    'Steering vibration',
    'Pulling to one side',
    'Suspension noise',
    'Steering noise',
    'Suspension damage',
  ],
  'electrical-obd': [
    'Stored fault code',
    'Pending fault code',
    'Check engine light',
    'ABS fault',
    'Airbag / SRS fault',
    'Readiness incomplete / codes recently cleared',
    'Battery health low',
    'Battery replacement recommended',
    'Charging system concern',
    'Bulb / light not working',
    'Multiple lights not working',
    'Horn / wiper / electrical function issue',
  ],
}

/** Common faults available for a section (empty array if none configured). */
export function commonIssuesForSection(sectionId: string): string[] {
  return COMMON_ISSUES[sectionId] ?? []
}

// ─── Auto-comment generation ───────────────────────────────────────────────

function joinList(items: string[]): string {
  const clean = items.map((s) => s.trim()).filter(Boolean)
  if (clean.length === 0) return ''
  if (clean.length === 1) return clean[0]
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`
}

/** Lower-case the first character of a fault label for mid-sentence use. */
function lower(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s
}

/** Rough plural/uncountable check on the last word ("scratches"→plural, "leak"→singular). */
function looksPlural(phrase: string): boolean {
  const last = phrase.trim().split(/\s+/).pop()?.toLowerCase() ?? ''
  return /s$/.test(last) && !/ss$/.test(last)
}

const MINOR_CLOSER =
  'This appears minor but may affect the vehicle’s value or warrant monitoring.'
const MAJOR_CLOSER =
  'This may require repair or further diagnosis and should be considered before purchase.'

/**
 * Build a clean, customer-facing comment from the selected common faults +
 * severity (+ optional affected area). Mirrors the brief's worked examples,
 * e.g. "Minor scratches were observed on the rear bumper. This appears …".
 * The inspector can always override the result.
 */
export function generateComment(input: {
  itemTitle: string
  status: ChecklistStatus
  issues?: string[]
  affectedArea?: string
}): string {
  const { itemTitle, status, issues = [], affectedArea } = input
  if (status === 'pass') {
    return `${itemTitle}: no visible issue found during the inspection.`
  }
  const sev = status === 'major' ? 'major' : 'minor'
  const closer = sev === 'major' ? MAJOR_CLOSER : MINOR_CLOSER

  const faults = joinList(issues)
  const where = affectedArea?.trim() ? ` on the ${lower(affectedArea.trim())}` : ''

  if (!faults) {
    const sevWord = sev === 'major' ? 'A major issue' : 'A minor issue'
    return `${sevWord} was noted for ${lower(itemTitle)}${where}. ${closer}`
  }

  const lead = sev === 'major' ? 'Significant' : 'Minor'
  const plural = issues.length > 1 || looksPlural(issues[0] ?? '')
  return `${lead} ${lower(faults)} ${plural ? 'were' : 'was'} observed${where}. ${closer}`
}

// ════════════════════════════════════════════════════════════════════════
// Exterior paint panels (brief section B)
// ════════════════════════════════════════════════════════════════════════

/** Reserved checklist key holding per-panel paint conditions (not scored). */
export const PAINT_SECTION_ID = 'exterior-paint'

export interface PaintPanelDef {
  id: string
  label: string
}

/** The selectable exterior panels for the paint map. */
export const PAINT_PANELS: PaintPanelDef[] = [
  { id: 'front-bumper', label: 'Front bumper' },
  { id: 'bonnet', label: 'Bonnet' },
  { id: 'roof', label: 'Roof' },
  { id: 'front-left-fender', label: 'Front-left fender' },
  { id: 'front-right-fender', label: 'Front-right fender' },
  { id: 'front-left-door', label: 'Front-left door' },
  { id: 'front-right-door', label: 'Front-right door' },
  { id: 'rear-left-door', label: 'Rear-left door' },
  { id: 'rear-right-door', label: 'Rear-right door' },
  { id: 'rear-left-quarter', label: 'Rear-left quarter' },
  { id: 'rear-right-quarter', label: 'Rear-right quarter' },
  { id: 'boot', label: 'Boot / tailgate' },
  { id: 'rear-bumper', label: 'Rear bumper' },
]

export const PAINT_OPTIONS: PaintCondition[] = ['original', 'cosmetic', 'repainted', 'faded']

export const PAINT_LABEL: Record<PaintCondition, string> = {
  original: 'Original Paint',
  cosmetic: 'Cosmetic Paint',
  repainted: 'Re-Painted',
  faded: 'Faded Paint',
}

/** Short label for tight chips / diagrams. */
export const PAINT_SHORT: Record<PaintCondition, string> = {
  original: 'Original',
  cosmetic: 'Cosmetic',
  repainted: 'Re-Painted',
  faded: 'Faded',
}

/** Diagram + chip colours. Original = neutral/green; others escalate. */
export const PAINT_HEX: Record<PaintCondition, string> = {
  original: '#22C55E',
  cosmetic: '#3B82F6',
  repainted: '#F59E0B',
  faded: '#A855F7',
}
