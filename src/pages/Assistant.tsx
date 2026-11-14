import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, FileText, KeyRound, Loader2, Package, ReceiptText, RefreshCw, ScanLine, Send, Sparkles, Trash2 } from 'lucide-react'
import {
  addDaysISO,
  BILL_FREQUENCIES,
  db,
  EXPENSE_CATEGORIES,
  frequencyToDays,
  ITEM_CATEGORIES,
  now,
  todayISO,
  uid,
  type BillPhoto,
  type DocumentType,
  type ExpenseCategory,
  type ItemCategory,
} from '../lib/db'
import { buildHouseholdContext } from '../lib/context'
import {
  askAi,
  getAiSetup,
  getAiStatus,
  getAiUsage,
  scanImage,
  type AiSetup,
  type AiStatus,
  type AiUsage,
  type ScanKind,
} from '../lib/ai'
import { useToast } from '../components/toastContext'
import { Badge, Button, Card, Field, IconButton, PageHeader, Select, Tabs } from '../components/ui'
import { PhotoInput } from '../components/PhotoInput'

const SUGGESTIONS = [
  'What maintenance is due soon?',
  'Which warranties are expiring?',
  'What should I service on my air conditioner?',
  'How much have I spent on my kitchen project?',
]

function asString(data: Record<string, unknown>, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? value : ''
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-medium text-ink">{value}</span>
    </div>
  )
}

export function Assistant() {
  const toast = useToast()
  const [tab, setTab] = useState<'chat' | 'scan'>('chat')
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [setup, setSetup] = useState<AiSetup | null>(null)
  const [usage, setUsage] = useState<AiUsage>(() => getAiUsage())

  const messages = useLiveQuery(() => db.aiMessages.orderBy('createdAt').toArray(), []) ?? []
  const rooms = useLiveQuery(() => db.rooms.toArray(), []) ?? []

  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [kind, setKind] = useState<ScanKind>('label')
  const [front, setFront] = useState<string | undefined>()
  const [back, setBack] = useState<string | undefined>()
  const [frontArchive, setFrontArchive] = useState<string | undefined>()
  const [backArchive, setBackArchive] = useState<string | undefined>()
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [billFrequency, setBillFrequency] = useState(30)
  const [saving, setSaving] = useState(false)

  const refreshStatus = () => {
    void getAiStatus().then(setStatus)
    void getAiSetup().then(setSetup)
    setUsage(getAiUsage())
  }

  useEffect(() => {
    void getAiStatus().then(setStatus)
    void getAiSetup().then(setSetup)
  }, [])

  useEffect(() => {
    const onFocus = () => {
      void getAiSetup().then(setSetup)
      setUsage(getAiUsage())
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages.length, thinking])

  const enabled = setup?.enabled ?? false
  const ownMode = setup?.mode === 'own'
  const needsKey = ownMode && !setup?.hasKey
  const outOfQuota = !ownMode && usage.remaining <= 0
  const serverReady = Boolean(status?.configured)
  const configured = Boolean(setup) && enabled && !needsKey && !outOfQuota && (ownMode || serverReady)

  const statusLabel = !setup
    ? 'Checking…'
    : !enabled
      ? 'AI off'
      : needsKey
        ? 'Add your key'
        : outOfQuota
          ? 'Daily limit reached'
          : ownMode
            ? `Your key · ${setup.provider === 'openai' ? 'OpenAI' : 'Gemini'}`
            : `App AI · ${usage.remaining}/${usage.limit}`
  const statusTone = !setup || !enabled || needsKey ? 'amber' : outOfQuota ? 'danger' : 'ok'

  const notice = !setup
    ? null
    : !enabled
      ? {
          title: 'AI is turned off',
          body: 'Turn it on in Settings to chat or scan photos. The rest of HouseSphere works fully offline without AI.',
        }
      : needsKey
        ? {
            title: 'Add your own API key',
            body: 'Paste a Google Gemini or OpenAI key in Settings, or switch back to the HouseSphere AI.',
          }
        : outOfQuota
          ? {
              title: "Today's free limit is used up",
              body: `You have used all ${usage.limit} free AI actions today. Try again tomorrow, or add your own key in Settings for unlimited use.`,
            }
          : !ownMode && !serverReady
            ? {
                title: 'Connect the AI assistant',
                body: 'Built-in AI is not configured on this deployment. Add your own key in Settings, or set GEMINI_API_KEY / OPENAI_API_KEY on the server.',
              }
            : null

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || thinking) return
    setInput('')
    setThinking(true)
    try {
      await db.aiMessages.put({ id: uid(), role: 'user', content, createdAt: now() })
      const context = await buildHouseholdContext()
      const history = [...messages.map((message) => ({ role: message.role, content: message.content })), { role: 'user' as const, content }]
      const answer = await askAi(history, context)
      setUsage(getAiUsage())
      await db.aiMessages.put({ id: uid(), role: 'assistant', content: answer, createdAt: now() })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The assistant could not answer right now.', 'error')
    } finally {
      setThinking(false)
    }
  }

  const clearChat = async () => {
    try {
      await db.aiMessages.clear()
      toast('Conversation cleared')
    } catch {
      toast('Could not clear the conversation', 'error')
    }
  }

  const photos =
    kind === 'receipt' || kind === 'bill'
      ? [front, back].filter((photo): photo is string => Boolean(photo))
      : front
        ? [front]
        : []

  const resetScan = () => {
    setResult(null)
    setFront(undefined)
    setBack(undefined)
    setFrontArchive(undefined)
    setBackArchive(undefined)
    setBillFrequency(30)
  }

  const analyse = async () => {
    if (photos.length === 0 || scanning) return
    setScanning(true)
    setResult(null)
    try {
      const data = await scanImage(kind, photos)
      setUsage(getAiUsage())
      setResult(data)
      if (kind === 'bill') setBillFrequency(frequencyToDays(asString(data, 'frequency')))
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not read that photo.', 'error')
    } finally {
      setScanning(false)
    }
  }

  const saveLabel = async () => {
    if (!result || !front) return
    const room = rooms.find((entry) => entry.name === 'Other') ?? rooms[0]
    if (!room) {
      toast('Add a room in Inventory first.', 'error')
      return
    }
    const categoryValue = asString(result, 'category')
    const category = ITEM_CATEGORIES.some((entry) => entry.value === categoryValue)
      ? (categoryValue as ItemCategory)
      : 'Other'
    setSaving(true)
    try {
      const timestamp = now()
      await db.items.put({
        id: uid(),
        name: asString(result, 'name') || 'Scanned item',
        roomId: room.id,
        category,
        brand: asString(result, 'brand') || undefined,
        model: asString(result, 'model') || undefined,
        serial: asString(result, 'serial') || undefined,
        notes: asString(result, 'notes') || undefined,
        photo: front,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      toast('Added to your inventory')
      resetScan()
    } catch {
      toast('Could not save this item', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveReceipt = async () => {
    if (!result) return
    const amount = Number(result.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast('The amount could not be read. Add it manually in Expenses.', 'error')
      return
    }
    const dateValue = asString(result, 'date')
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : todayISO()
    const categoryValue = asString(result, 'category')
    const category = EXPENSE_CATEGORIES.some((entry) => entry.value === categoryValue)
      ? (categoryValue as ExpenseCategory)
      : 'other'
    setSaving(true)
    try {
      const timestamp = now()
      await db.expenses.put({
        id: uid(),
        date,
        category,
        amount,
        vendor: asString(result, 'vendor') || undefined,
        description: asString(result, 'description') || undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      toast('Expense saved')
      resetScan()
    } catch {
      toast('Could not save this expense', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveRecurringBill = async () => {
    if (!result) return
    const vendor = asString(result, 'vendor')
    const description = asString(result, 'description')
    const amount = Number(result.amount)
    const categoryValue = asString(result, 'category')
    const category = EXPENSE_CATEGORIES.some((entry) => entry.value === categoryValue)
      ? (categoryValue as ExpenseCategory)
      : 'other'
    const frequencyDays = billFrequency
    const dueValue = asString(result, 'dueDate')
    const nextDue = /^\d{4}-\d{2}-\d{2}$/.test(dueValue) ? dueValue : addDaysISO(frequencyDays)
    const account = asString(result, 'accountNumber')
    setSaving(true)
    try {
      const timestamp = now()
      const billId = uid()
      await db.bills.put({
        id: billId,
        name: description || (vendor ? `${vendor} bill` : 'Recurring bill'),
        category,
        amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
        frequencyDays,
        nextDue,
        provider: vendor || undefined,
        notes: account ? `Account ${account}` : undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      const photos: BillPhoto[] = []
      if (front) photos.push({ id: uid(), billId, kind: 'front', data: frontArchive ?? front, createdAt: timestamp })
      if (back) photos.push({ id: uid(), billId, kind: 'back', data: backArchive ?? back, createdAt: timestamp })
      if (photos.length > 0) await db.billPhotos.bulkPut(photos)
      toast('Recurring bill saved')
      resetScan()
    } catch {
      toast('Could not save this bill', 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveManual = async () => {
    if (!result || !front) return
    const title = asString(result, 'title') || 'Appliance manual'
    const type: DocumentType = 'manual'
    setSaving(true)
    try {
      const timestamp = now()
      await db.documents.put({
        id: uid(),
        title,
        type,
        issuer: asString(result, 'brand') || undefined,
        reference: asString(result, 'model') || undefined,
        notes: asString(result, 'notes') || undefined,
        fileData: front,
        fileName: `${title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase()}.jpg`,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      toast('Manual saved to documents')
      resetScan()
    } catch {
      toast('Could not save this manual', 'error')
    } finally {
      setSaving(false)
    }
  }

  const items = Array.isArray(result?.items) ? (result.items as unknown[]).filter((item): item is string => typeof item === 'string') : []

  return (
    <div>
      <PageHeader
        title="AI home assistant"
        subtitle="Scan labels and receipts, or ask questions about the home information you have stored."
        action={
          <div className="flex items-center gap-2">
            <Badge tone={statusTone}>{statusLabel}</Badge>
            <IconButton label="Refresh AI status" onClick={refreshStatus}>
              <RefreshCw className="size-4" />
            </IconButton>
          </div>
        }
      />

      {notice ? (
        <Card className="mb-5 border-amber/30 bg-amber-soft/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber">
              <KeyRound className="size-4" />
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-ink">{notice.title}</p>
              <p className="mt-1 text-muted">{notice.body}</p>
              <Link to="/settings" className="mt-2 inline-flex text-xs font-semibold text-brand hover:text-brand-dark">
                Open Settings →
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-4 max-w-xs"
        tabs={[
          { value: 'chat', label: 'Chat' },
          { value: 'scan', label: 'Scan a photo' },
        ]}
      />

      {tab === 'chat' ? (
        <Card className="flex h-[64svh] min-h-[460px] flex-col overflow-hidden lg:h-[66svh]">
          <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">HouseSphere assistant</p>
                <p className="text-[11px] text-muted">Knows the information stored in this app</p>
              </div>
            </div>
            {messages.length > 0 ? (
              <Button size="sm" variant="ghost" onClick={clearChat} icon={<Trash2 className="size-3.5" />}>
                Clear
              </Button>
            ) : null}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-cream/50 px-4 py-4">
            {messages.length === 0 ? (
              <div className="mx-auto max-w-md py-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <Sparkles className="size-6" />
                </div>
                <p className="mt-3 text-base font-semibold text-ink">Ask anything about your home</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                  Your inventory, warranties, tasks and expenses are available as context. Try one of these:
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={thinking}
                      onClick={() => void send(suggestion)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-sm text-ink transition-colors hover:border-brand/40 hover:bg-brand-soft/30 disabled:opacity-60"
                    >
                      {suggestion}
                      <ArrowRight className="size-4 shrink-0 text-muted" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) =>
                message.role === 'user' ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-white">
                        {message.content}
                      </div>
                      <p className="mt-1 text-right text-[10px] text-muted">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex gap-2.5">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Sparkles className="size-3.5" />
                    </div>
                    <div className="max-w-[85%]">
                      <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-2.5 text-sm text-ink">
                        {message.content}
                      </div>
                      <p className="mt-1 text-[10px] text-muted">
                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ),
              )
            )}

            {thinking ? (
              <div className="flex gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Sparkles className="size-3.5" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin text-brand" />
                  Thinking about your home…
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-line bg-surface p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
                rows={1}
                placeholder="Ask about warranties, maintenance, expenses…"
                className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-cream/60 px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/15"
              />
              <Button
                onClick={() => void send()}
                disabled={!input.trim() || thinking || !configured}
                aria-label="Send message"
                className="size-11 shrink-0 px-0"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-muted">Enter to send · Shift+Enter for a new line</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <ScanLine className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">Scan a label, receipt, bill or manual</h2>
                <p className="text-xs text-muted">Point the camera at the important details.</p>
              </div>
            </div>

            <div className="mt-4">
              <Tabs
                value={kind}
                onChange={(value) => {
                  setKind(value)
                  resetScan()
                }}
                tabs={[
                  { value: 'label', label: 'Appliance label' },
                  { value: 'receipt', label: 'Receipt' },
                  { value: 'bill', label: 'Utility bill' },
                  { value: 'manual', label: 'Manual' },
                ]}
              />
            </div>

            <div className="mt-4 space-y-4">
              <PhotoInput
                value={front}
                onChange={(value) => {
                  setFront(value)
                  setResult(null)
                }}
                onArchive={kind === 'bill' ? setFrontArchive : undefined}
                archiveMaxSize={kind === 'bill' ? 2600 : undefined}
                label={kind === 'receipt' || kind === 'bill' ? 'Front of bill' : 'Photo'}
                maxSize={1400}
                hint={
                  kind === 'bill'
                    ? 'Keep the barcode and payment details sharp — you can show this at the post office to pay.'
                    : undefined
                }
              />
              {kind === 'receipt' || kind === 'bill' ? (
                <PhotoInput
                  value={back}
                  onChange={(value) => {
                    setBack(value)
                    setResult(null)
                  }}
                  onArchive={kind === 'bill' ? setBackArchive : undefined}
                  archiveMaxSize={kind === 'bill' ? 2600 : undefined}
                  label="Back of bill (optional)"
                  maxSize={1400}
                />
              ) : null}
            </div>

            <Button
              className="mt-4 w-full"
              onClick={() => void analyse()}
              loading={scanning}
              disabled={photos.length === 0 || !configured}
              icon={<ScanLine className="size-4" />}
            >
              Analyse {photos.length > 1 ? 'photos' : 'photo'}
            </Button>
            {notice ? <p className="mt-2 text-xs text-muted">Enable AI in Settings to scan photos.</p> : null}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Extracted details</h2>
            {result ? (
              <div className="mt-3 animate-in">
                {kind === 'label' ? (
                  <>
                    <Row label="Name" value={asString(result, 'name')} />
                    <Row label="Brand" value={asString(result, 'brand')} />
                    <Row label="Model" value={asString(result, 'model')} />
                    <Row label="Serial" value={asString(result, 'serial')} />
                    <Row label="Category" value={asString(result, 'category')} />
                    <Row label="Notes" value={asString(result, 'notes')} />
                    <Button className="mt-4 w-full" onClick={() => void saveLabel()} loading={saving} icon={<Package className="size-4" />}>
                      Add to inventory
                    </Button>
                  </>
                ) : kind === 'manual' ? (
                  <>
                    <Row label="Title" value={asString(result, 'title')} />
                    <Row label="Brand" value={asString(result, 'brand')} />
                    <Row label="Model" value={asString(result, 'model')} />
                    <Row label="Notes" value={asString(result, 'notes')} />
                    <Button className="mt-4 w-full" onClick={() => void saveManual()} loading={saving} icon={<FileText className="size-4" />}>
                      Save to documents
                    </Button>
                  </>
                ) : (
                  <>
                    <Row label="Vendor" value={asString(result, 'vendor')} />
                    <Row label="Date" value={asString(result, 'date')} />
                    {kind === 'bill' ? <Row label="Due" value={asString(result, 'dueDate')} /> : null}
                    <Row label="Amount" value={result.amount !== undefined ? String(result.amount) : ''} />
                    <Row label="Category" value={asString(result, 'category')} />
                    <Row label="Description" value={asString(result, 'description')} />
                    {kind === 'bill' ? (
                      <Field label="Repeats" htmlFor="bill-frequency" className="pt-3">
                        <Select
                          id="bill-frequency"
                          value={String(billFrequency)}
                          onChange={(event) => setBillFrequency(Number(event.target.value))}
                        >
                          {BILL_FREQUENCIES.map((option) => (
                            <option key={option.days} value={option.days}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    ) : null}
                    {kind === 'bill' ? <Row label="Account" value={asString(result, 'accountNumber')} /> : null}
                    {items.length > 0 ? (
                      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-muted">
                        {items.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                    {kind === 'bill' ? (
                      <Button
                        className="mt-4 w-full"
                        onClick={() => void saveRecurringBill()}
                        loading={saving}
                        icon={<RefreshCw className="size-4" />}
                      >
                        Save as recurring bill
                      </Button>
                    ) : null}
                    <Button
                      variant={kind === 'bill' ? 'secondary' : 'primary'}
                      className="mt-2 w-full"
                      onClick={() => void saveReceipt()}
                      loading={saving}
                      icon={<ReceiptText className="size-4" />}
                    >
                      Save as expense
                    </Button>
                  </>
                )}
                <Button variant="ghost" className="mt-2 w-full" onClick={resetScan}>
                  Scan another
                </Button>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-line bg-cream/60 px-4 py-8 text-center">
                <ScanLine className="mx-auto size-7 text-muted/60" />
                <p className="mt-2 text-sm font-medium text-ink">Nothing scanned yet</p>
                <p className="mx-auto mt-1 max-w-xs text-xs text-muted">
                  {kind === 'label'
                    ? 'Photograph the rating plate or sticker on an appliance to capture the brand, model and serial number.'
                    : kind === 'receipt'
                      ? 'Photograph the front of a receipt or invoice. Add the back too if it holds extra details, and HouseSphere will turn it into an expense entry.'
                      : kind === 'bill'
                        ? 'Photograph a utility bill, rates notice or insurance notice. Add the back too if needed, then save it as a one-off expense or a recurring bill.'
                        : 'Photograph the cover of a manual to save it with your home documents.'}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      <p className="mt-5 text-center text-[11px] text-muted/80">
        AI features use Google Gemini or OpenAI. Your household data stays on this device except for the context sent when you ask a
        question. The built-in AI includes {usage.limit} free actions per day; your own key is unlimited.
      </p>
    </div>
  )
}
