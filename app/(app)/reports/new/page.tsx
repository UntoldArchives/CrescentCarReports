import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PackageSelector } from '@/components/reports/PackageSelector'

export const metadata = { title: 'New report' }

export default function NewReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={16} /> Reports
        </Link>
        <h1 className="mt-2 text-display-sm text-text-primary">Choose a package</h1>
        <p className="mt-1 text-sm text-text-secondary">
          The report builder adapts to the package — pick the inspection level to begin.
        </p>
      </div>

      <PackageSelector />
    </div>
  )
}
