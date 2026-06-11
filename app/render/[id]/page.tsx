import { notFound } from 'next/navigation'
import { getReportWithInspectorAdmin } from '@/lib/data'
import { verifyPdfToken } from '@/lib/pdf-token'
import { ReportDocument } from '@/components/report-document/ReportDocument'

// Node runtime (verifies the HMAC token); never cache.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Report', robots: { index: false, follow: false } }

/**
 * Bare print surface used ONLY by the server-side PDF generator. It lives
 * outside the (app) auth layout and renders nothing but the report document,
 * gated by a short-lived signed token (so headless Chrome — which has no auth
 * cookie — can load it). Any request without a valid token 404s, so it is not a
 * public way to view reports.
 */
export default async function RenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pdf?: string }>
}) {
  const { id } = await params
  const { pdf } = await searchParams
  if (!verifyPdfToken(pdf, id)) notFound()

  const result = await getReportWithInspectorAdmin(id)
  if (!result) notFound()

  return <ReportDocument report={result.report} inspectorName={result.inspectorName} />
}
