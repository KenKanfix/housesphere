import { useEffect, useState } from 'react'
import { ScanLine } from 'lucide-react'
import { getAiStatus, scanImage, type ScanKind } from '../lib/ai'
import { useToast } from './toastContext'
import { Button, Tabs } from './ui'
import { PhotoInput } from './PhotoInput'

export interface ScanOption {
  value: ScanKind
  label: string
}

export function ScanCapture({
  options,
  onExtracted,
  defaultKind,
  description,
}: {
  options: ScanOption[]
  onExtracted: (data: Record<string, unknown>, kind: ScanKind) => void
  defaultKind?: ScanKind
  description?: string
}) {
  const toast = useToast()
  const [kind, setKind] = useState<ScanKind>(defaultKind ?? options[0].value)
  const [front, setFront] = useState<string | undefined>()
  const [back, setBack] = useState<string | undefined>()
  const [scanning, setScanning] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    void getAiStatus().then((status) => setConfigured(Boolean(status.configured)))
  }, [])

  const multi = kind === 'receipt' || kind === 'bill'
  const photos = multi ? [front, back].filter((photo): photo is string => Boolean(photo)) : front ? [front] : []

  const run = async () => {
    if (photos.length === 0 || scanning) return
    setScanning(true)
    try {
      const data = await scanImage(kind, photos)
      onExtracted(data, kind)
      setFront(undefined)
      setBack(undefined)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not read that photo.', 'error')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="rounded-xl border border-line bg-cream/60 p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <ScanLine className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Scan a photo to fill this in</p>
          <p className="text-xs text-muted">{description ?? 'Take a photo and the details are read for you.'}</p>
        </div>
      </div>

      <div className="mt-3">
        <Tabs
          value={kind}
          onChange={(value) => {
            setKind(value)
            setFront(undefined)
            setBack(undefined)
          }}
          tabs={options.map((option) => ({ value: option.value, label: option.label }))}
        />
      </div>

      <div className="mt-3 space-y-3">
        <PhotoInput
          value={front}
          onChange={setFront}
          label={multi ? 'Front of bill' : 'Photo'}
          maxSize={1400}
        />
        {multi ? <PhotoInput value={back} onChange={setBack} label="Back of bill (optional)" maxSize={1400} /> : null}
      </div>

      <Button
        className="mt-3 w-full"
        onClick={() => void run()}
        loading={scanning}
        disabled={photos.length === 0 || !configured}
        icon={<ScanLine className="size-4" />}
      >
        Scan {photos.length > 1 ? 'photos' : 'photo'}
      </Button>
      {configured === false ? <p className="mt-2 text-xs text-muted">Add an AI API key to enable scanning.</p> : null}
    </div>
  )
}
