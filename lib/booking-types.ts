import type { PackageType } from './report-types'

// ════════════════════════════════════════════════════════════════════════
// Booking domain types — mirror the `bookings` table in
// supabase/migrations/006_bookings.sql (the source of truth for the booking
// system shared with the public Crescent Car Checks website).
// ════════════════════════════════════════════════════════════════════════

/** The five fixed daily inspection slots (Asia/Dubai, DB values). */
export type SlotTime = '09:30' | '11:45' | '14:00' | '16:15' | '18:30'

/**
 * Simplified 4-stage pipeline (June 2026 follow-up):
 *   New → Confirmed → In Progress → Completed   (+ Cancelled / Refunded)
 * plus the internal `pending_payment` hold (pre-payment, never a managed stage).
 *
 * DB values are kept stable from migration 006 — only the labels changed and
 * the old `report_in_progress` was merged into `inspection_in_progress`
 * ("In Progress"). See STATUS_LABELS for the value→label mapping.
 * 'cancelled' covers Cancelled AND Refunded (payment_status says which).
 */
export type BookingStatus =
  | 'pending_payment'
  | 'paid_new'
  | 'time_confirmed'
  | 'inspection_in_progress'
  | 'report_sent'
  | 'cancelled'

/** 'manual' = added by an admin, paid outside Stripe (cash/transfer/WhatsApp). */
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'manual'

export type DistanceClass = 'normal' | 'long'

export type ParkingType = 'showroom' | 'outdoor' | 'home'

/** Row shape of public.bookings. The text `id` IS the customer-facing reference (CCB-7F3K2Q). */
export interface Booking {
  id: string
  created_at: string
  updated_at: string

  customer_name: string
  customer_phone: string
  customer_email: string | null

  emirate: string
  distance_class: DistanceClass
  address: string
  location_lat: number | null
  location_lng: number | null
  parking_type: ParkingType | null
  additional_notes: string | null

  car_make: string
  car_model: string
  car_year: string
  vin: string | null
  plate_number: string | null

  inspection_date: string // 'yyyy-MM-dd'
  slot_time: SlotTime

  package_id: PackageType
  package_name: string
  package_price: number
  travel_fee: number
  total_price: number

  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  payment_status: PaymentStatus
  booking_status: BookingStatus

  hold_expires_at: string | null
  paid_at: string | null
  cancelled_at: string | null

  assigned_inspector: string | null
  report_id: string | null
  admin_notes: string | null
  manual_booking: boolean
  created_by: string | null

  google_calendar_event_id: string | null
}

/** Booking joined with its assigned inspector (list/detail views). */
export interface BookingWithInspector extends Booking {
  inspector?: { id: string; full_name: string } | null
}

/** Slot DB value → display label. Insertion order is the daily slot order. */
export const SLOTS: Record<SlotTime, string> = {
  '09:30': '9:30 AM',
  '11:45': '11:45 AM',
  '14:00': '2:00 PM',
  '16:15': '4:15 PM',
  '18:30': '6:30 PM',
}

/** The five slots in day order. */
export const SLOT_TIMES = Object.keys(SLOTS) as SlotTime[]

/** Value→label for the 4-stage pipeline. The DB values are historical (006);
 *  the labels are what the admin sees. */
export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: 'Pending Payment',
  paid_new: 'New',
  time_confirmed: 'Confirmed',
  inspection_in_progress: 'In Progress',
  report_sent: 'Completed',
  cancelled: 'Cancelled / Refunded',
}

export const BOOKING_STATUSES = Object.keys(STATUS_LABELS) as BookingStatus[]

/** Statuses offered as list filters — excludes the internal `pending_payment`
 *  hold, which is transient and never managed from the list. */
export const FILTERABLE_STATUSES = BOOKING_STATUSES.filter(
  (s) => s !== 'pending_payment',
) as BookingStatus[]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  manual: 'Manual (offline)',
}

/** Long-distance emirates: AED 100 flat travel fee, 9:30 AM slot only (blocks 9:30 + 11:45). */
export const LONG_DISTANCE_EMIRATES = ['Abu Dhabi', 'Ras Al Khaimah', 'Fujairah', 'Al Ain'] as const

/** Flat travel fee for long-distance emirates (kept per the client brief). */
export const TRAVEL_FEE_AED = 100

export function isLongDistance(emirate: string): boolean {
  return (LONG_DISTANCE_EMIRATES as readonly string[]).includes(emirate)
}

/**
 * Google Maps link for a booking location: exact pin when coordinates were
 * captured by the website, otherwise a search on "address, emirate".
 */
export function googleMapsUrl(
  b: Pick<Booking, 'location_lat' | 'location_lng' | 'address' | 'emirate'>,
): string {
  if (b.location_lat != null && b.location_lng != null) {
    return `https://www.google.com/maps?q=${b.location_lat},${b.location_lng}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.address}, ${b.emirate}`)}`
}

/** True for a live (unexpired) 30-minute payment hold from the public website. */
export function isLiveHold(b: Pick<Booking, 'booking_status' | 'hold_expires_at'>): boolean {
  return (
    b.booking_status === 'pending_payment' &&
    Boolean(b.hold_expires_at) &&
    new Date(b.hold_expires_at as string).getTime() > Date.now()
  )
}
