import { useRef, useState } from 'react'
import { FileText, ImagePlus, Loader2, Upload, X } from 'lucide-react'
import { compressImage, fileToDataUrl, formatBytes } from '../lib/db'
import { Button } from './ui'

export function FileInput({
  data,
  fileName,
  onChange,
  label = 'Attach a document or photo',
}: {
  data?: string
  fileName?: string
  onChange: (data: string | undefined, fileName: string | undefined) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [size, setSize] = useState<number | null>(null)

  const handleFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      const isImage = file.type.startsWith('image/')
      const result = isImage ? await compressImage(file, 1800, 0.82) : await fileToDataUrl(file)
      setSize(file.size)
      onChange(result, file.name)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {data ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          {data.startsWith('data:image') ? (
            <img src={data} alt={fileName ?? 'Attachment'} className="size-12 rounded-lg object-cover" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <FileText className="size-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{fileName ?? 'Attachment'}</p>
            <p className="text-xs text-muted">{size ? formatBytes(size) : data.startsWith('data:application/pdf') ? 'PDF document' : 'Stored'}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(undefined, undefined)
              setSize(null)
            }}
            aria-label="Remove attachment"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-black/5 hover:text-danger"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-surface/70 p-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <ImagePlus className="size-5" />
          </div>
          <div className="flex-1">
            <Button size="sm" variant="secondary" icon={<Upload className="size-4" />} onClick={() => inputRef.current?.click()}>
              Upload file
            </Button>
            <p className="mt-1 text-[11px] text-muted">Photos or PDFs, stored privately on this device.</p>
          </div>
          {busy ? <Loader2 className="size-4 animate-spin text-brand" /> : null}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  )
}
