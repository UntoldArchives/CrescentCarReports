'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteReport } from '@/app/(app)/reports/actions'
import { cn } from '@/lib/utils'

/**
 * Delete control with a confirmation modal. `icon` variant is the compact trash
 * button on a report card; `editor` is the labelled button in the editor's
 * danger zone. On success the card list refreshes in place, while the editor
 * navigates back to the list (its report no longer exists).
 */
export function DeleteReportButton({
  id,
  reference,
  variant = 'icon',
  className,
}: {
  id: string
  reference: string
  variant?: 'icon' | 'editor'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function confirmDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteReport(id)
      if (!res.ok) {
        setError(res.error || 'Could not delete the report.')
        return
      }
      setOpen(false)
      if (variant === 'editor') router.push('/reports')
      else router.refresh()
    })
  }

  return (
    <>
      {variant === 'editor' ? (
        <button type="button" onClick={() => setOpen(true)} className={cn('btn-danger h-11 text-sm', className)}>
          <Trash2 size={16} /> Delete report
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Delete report ${reference}`}
          title="Delete report"
          onClick={() => setOpen(true)}
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-input border border-border text-text-muted transition-colors hover:border-fail/50 hover:text-fail',
            className,
          )}
        >
          <Trash2 size={16} />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !pending && setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete report"
            className="relative w-full max-w-sm animate-scale-in rounded-card border border-border bg-card p-5 shadow-glow"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fail-muted">
                <AlertTriangle size={20} className="text-fail" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-text-primary">Delete this report?</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  <span className="font-mono font-semibold text-accent">{reference}</span> will be permanently
                  deleted and the remaining reports renumbered to close the gap. This can’t be undone.
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-input border border-fail/30 bg-fail-muted px-3 py-2 text-sm text-fail">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="btn-secondary h-10 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending}
                className="btn-danger h-10 text-sm"
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
