'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, Crop, Loader2, Maximize2, RotateCcw, RotateCw, Trash2, X } from 'lucide-react'
import { rotatePhoto } from '@/lib/photo-client'
import type { PhotoRef } from '@/lib/report-types'
import { cn } from '@/lib/utils'

interface Props {
  photo: PhotoRef
  /** Receives the updated PhotoRef (rotation swaps url/path; fit/caption edits keep them). */
  onChange: (next: PhotoRef) => void
  onRemove?: () => void
  onClose: () => void
  /** Fill/Show-all toggle — off for the main vehicle photo (always a cover hero). */
  allowFit?: boolean
  /** Caption field — off for the main vehicle photo. */
  allowCaption?: boolean
}

/**
 * Lightbox for adjusting an uploaded photo: rotate (baked into the stored file,
 * so the PDF sees it too), choose how it sits in its report frame (crop to fill
 * vs show the whole image), edit the caption, or remove it.
 */
export function PhotoAdjuster({
  photo,
  onChange,
  onRemove,
  onClose,
  allowFit = true,
  allowCaption = true,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function rotate(deg: 90 | -90) {
    setBusy(true)
    setError(null)
    try {
      onChange(await rotatePhoto(photo, deg))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rotate the photo.')
    } finally {
      setBusy(false)
    }
  }

  const contain = photo.fit === 'contain'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-card border border-border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">Adjust photo</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-text-secondary hover:bg-surface hover:text-text-primary"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Preview — framed like the report frames it. */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-input border border-border bg-surface">
          <Image
            src={photo.url}
            alt={photo.caption || 'Photo'}
            fill
            sizes="512px"
            className={contain ? 'object-contain' : 'object-cover'}
          />
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 size={26} className="animate-spin text-accent" />
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-text-muted">
          {contain
            ? 'The whole photo is shown inside its frame in the report.'
            : 'The photo is cropped to fill its frame in the report.'}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => rotate(-90)} disabled={busy} className="btn-secondary h-9 text-xs">
            <RotateCcw size={14} /> Rotate left
          </button>
          <button type="button" onClick={() => rotate(90)} disabled={busy} className="btn-secondary h-9 text-xs">
            <RotateCw size={14} /> Rotate right
          </button>

          {allowFit && (
            <div className="ml-auto flex rounded-input border border-border p-0.5">
              <button
                type="button"
                onClick={() => onChange({ ...photo, fit: 'cover' })}
                disabled={busy}
                className={cn(
                  'inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-xs font-medium transition-colors',
                  !contain ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <Crop size={13} /> Fill
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...photo, fit: 'contain' })}
                disabled={busy}
                className={cn(
                  'inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-xs font-medium transition-colors',
                  contain ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <Maximize2 size={13} /> Show all
              </button>
            </div>
          )}
        </div>

        {allowCaption && (
          <label className="mt-3 block">
            <span className="label-base">Caption (optional)</span>
            <input
              value={photo.caption ?? ''}
              onChange={(e) => onChange({ ...photo, caption: e.target.value || null })}
              disabled={busy}
              placeholder="Shown under the photo in the report"
              className="input-base text-sm"
            />
          </label>
        )}

        {error && <p className="mt-2 text-xs text-fail">{error}</p>}

        <div className="mt-4 flex items-center justify-between">
          {onRemove ? (
            <button
              type="button"
              onClick={() => {
                onRemove()
                onClose()
              }}
              disabled={busy}
              className="btn-danger h-9 text-xs"
            >
              <Trash2 size={14} /> Remove
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} disabled={busy} className="btn-primary h-9 text-xs">
            <Check size={14} /> Done
          </button>
        </div>
      </div>
    </div>
  )
}
