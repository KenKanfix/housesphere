import { useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import { compressImage } from '../lib/db'
import { Button } from './ui'

export function PhotoInput({
  value,
  onChange,
  label = 'Photo',
  maxSize = 1200,
  quality = 0.78,
  archiveMaxSize,
  archiveQuality = 0.92,
  onArchive,
  hint,
}: {
  value?: string
  onChange: (value: string | undefined) => void
  label?: string
  maxSize?: number
  quality?: number
  archiveMaxSize?: number
  archiveQuality?: number
  onArchive?: (value: string | undefined) => void
  hint?: string
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const clear = () => {
    onChange(undefined)
    onArchive?.(undefined)
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      onChange(await compressImage(file, maxSize, quality))
      if (onArchive && archiveMaxSize) {
        onArchive(await compressImage(file, archiveMaxSize, archiveQuality))
      }
    } finally {
      setBusy(false)
      if (cameraRef.current) cameraRef.current.value = ''
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-line bg-black/5">
          <img src={value} alt="Selected" className="aspect-[4/3] w-full object-cover" />
          <button
            type="button"
            onClick={clear}
            aria-label="Remove photo"
            className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur transition-colors hover:bg-ink"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-surface/70 p-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <ImagePlus className="size-5" />
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<Camera className="size-4" />} onClick={() => cameraRef.current?.click()}>
              Take photo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => uploadRef.current?.click()}>
              Choose file
            </Button>
          </div>
          {busy ? <Loader2 className="size-4 animate-spin text-brand" /> : null}
        </div>
      )}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      {hint ? <p className="text-xs text-muted/80">{hint}</p> : null}
    </div>
  )
}
