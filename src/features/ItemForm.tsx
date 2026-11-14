import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ReceiptText, ScanLine } from 'lucide-react'
import {
  db,
  ITEM_CATEGORIES,
  now,
  uid,
  type Item,
  type ItemCategory,
} from '../lib/db'
import { getAiStatus, scanImage } from '../lib/ai'
import { toNumber, trimmed } from '../lib/form'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui'
import { PhotoInput } from '../components/PhotoInput'

export function ItemForm({
  initial,
  defaultRoomId,
  onClose,
}: {
  initial?: Item | null
  defaultRoomId?: string
  onClose: () => void
}) {
  const toast = useToast()
  const rooms = useLiveQuery(() => db.rooms.orderBy('name').toArray(), []) ?? []

  const [name, setName] = useState(initial?.name ?? '')
  const [roomId, setRoomId] = useState(initial?.roomId ?? defaultRoomId ?? '')
  const [category, setCategory] = useState<ItemCategory>(initial?.category ?? 'Appliance')
  const [brand, setBrand] = useState(initial?.brand ?? '')
  const [model, setModel] = useState(initial?.model ?? '')
  const [serial, setSerial] = useState(initial?.serial ?? '')
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '')
  const [price, setPrice] = useState(initial?.price !== undefined ? String(initial.price) : '')
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo)
  const [receipt, setReceipt] = useState<string | undefined>(initial?.receipt)
  const [warrantyExpiry, setWarrantyExpiry] = useState(initial?.warrantyExpiry ?? '')
  const [extendedWarranty, setExtendedWarranty] = useState(
    Boolean(
      initial?.extendedWarrantyExpiry ||
        initial?.extendedWarrantyProvider ||
        initial?.extendedWarrantyNotes ||
        initial?.extendedWarrantyCost !== undefined,
    ),
  )
  const [extendedWarrantyProvider, setExtendedWarrantyProvider] = useState(initial?.extendedWarrantyProvider ?? '')
  const [extendedWarrantyExpiry, setExtendedWarrantyExpiry] = useState(initial?.extendedWarrantyExpiry ?? '')
  const [extendedWarrantyCost, setExtendedWarrantyCost] = useState(
    initial?.extendedWarrantyCost !== undefined ? String(initial.extendedWarrantyCost) : '',
  )
  const [extendedWarrantyNotes, setExtendedWarrantyNotes] = useState(initial?.extendedWarrantyNotes ?? '')
  const [scanning, setScanning] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const effectiveRoomId = roomId || rooms[0]?.id || ''

  useEffect(() => {
    void getAiStatus().then((status) => setConfigured(Boolean(status.configured)))
  }, [])

  const scanReceipt = async () => {
    if (!receipt || scanning) return
    setScanning(true)
    try {
      const data = await scanImage('receipt', [receipt])
      let filled = 0
      const dateValue = typeof data.date === 'string' ? data.date.trim() : ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue) && !purchaseDate) {
        setPurchaseDate(dateValue)
        filled += 1
      }
      const rawAmount = data.amount
      const amountValue = typeof rawAmount === 'number' ? rawAmount : Number(String(rawAmount ?? '').replace(/[^0-9.]/g, ''))
      if (Number.isFinite(amountValue) && amountValue > 0 && !price) {
        setPrice(String(amountValue))
        filled += 1
      }
      toast(filled > 0 ? 'Filled purchase details from the receipt' : 'Receipt saved — add details manually', filled > 0 ? 'success' : 'error')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not read that receipt.', 'error')
    } finally {
      setScanning(false)
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the item a name.')
      return
    }
    if (!effectiveRoomId) {
      setError('Choose a room.')
      return
    }
    setSaving(true)
    try {
      const timestamp = now()
      const item: Item = {
        id: initial?.id ?? uid(),
        name: name.trim(),
        roomId: effectiveRoomId,
        category,
        brand: trimmed(brand),
        model: trimmed(model),
        serial: trimmed(serial),
        purchaseDate: purchaseDate || undefined,
        price: toNumber(price),
        photo,
        receipt,
        warrantyExpiry: warrantyExpiry || undefined,
        extendedWarrantyProvider: extendedWarranty ? trimmed(extendedWarrantyProvider) : undefined,
        extendedWarrantyExpiry: extendedWarranty ? extendedWarrantyExpiry || undefined : undefined,
        extendedWarrantyCost: extendedWarranty ? toNumber(extendedWarrantyCost) : undefined,
        extendedWarrantyNotes: extendedWarranty ? trimmed(extendedWarrantyNotes) : undefined,
        notes: trimmed(notes),
        createdAt: initial?.createdAt ?? timestamp,
        updatedAt: timestamp,
      }
      await db.items.put(item)
      toast(initial ? 'Item updated' : 'Item added to your inventory')
      onClose()
    } catch {
      setError('Could not save this item. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={initial ? 'Edit item' : 'Add inventory item'}
      description="Track the things you own, room by room."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Item name" htmlFor="item-name">
          <Input
            id="item-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. French door fridge"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Room" htmlFor="item-room">
            <Select id="item-room" value={effectiveRoomId} onChange={(event) => setRoomId(event.target.value)}>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" htmlFor="item-category">
            <Select id="item-category" value={category} onChange={(event) => setCategory(event.target.value as ItemCategory)}>
              {ITEM_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand" htmlFor="item-brand">
            <Input id="item-brand" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Samsung" />
          </Field>
          <Field label="Model" htmlFor="item-model">
            <Input id="item-model" value={model} onChange={(event) => setModel(event.target.value)} placeholder="SRF5700SD" />
          </Field>
          <Field label="Serial number" htmlFor="item-serial">
            <Input id="item-serial" value={serial} onChange={(event) => setSerial(event.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Purchase date" htmlFor="item-purchase">
            <Input id="item-purchase" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
          </Field>
          <Field label="Purchase price" htmlFor="item-price">
            <Input
              id="item-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
            />
          </Field>
        </div>

        <PhotoInput value={photo} onChange={setPhoto} label="Item photo" />

        <div className="rounded-xl border border-line bg-cream/60 p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <ReceiptText className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Receipt or invoice</p>
              <p className="text-xs text-muted">Keep a copy, or scan it to fill the purchase date and price.</p>
            </div>
          </div>
          <div className="mt-3">
            <PhotoInput
              value={receipt}
              onChange={setReceipt}
              label="Receipt photo"
              maxSize={1400}
              hint="A clear photo of the whole receipt works best."
            />
          </div>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            size="sm"
            onClick={() => void scanReceipt()}
            loading={scanning}
            disabled={!receipt || !configured}
            icon={<ScanLine className="size-4" />}
          >
            Scan receipt to fill details
          </Button>
          {configured === false ? <p className="mt-2 text-xs text-muted">Add an AI API key to enable scanning.</p> : null}
        </div>

        <div className="space-y-4 rounded-xl border border-line bg-cream/60 p-4">
          <div>
            <p className="text-sm font-semibold text-ink">Warranty</p>
            <p className="text-xs text-muted">Set when cover ends so HouseSphere can remind you before it runs out.</p>
          </div>
          <Field label="Warranty ends" htmlFor="item-warranty-end">
            <Input
              id="item-warranty-end"
              type="date"
              value={warrantyExpiry}
              onChange={(event) => setWarrantyExpiry(event.target.value)}
            />
          </Field>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={extendedWarranty}
              onChange={(event) => setExtendedWarranty(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-brand"
            />
            <span>
              <span className="block text-sm font-medium text-ink">Extended warranty</span>
              <span className="mt-0.5 block text-xs text-muted">Cover bought on top of the standard warranty.</span>
            </span>
          </label>
          {extendedWarranty ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Extended warranty ends" htmlFor="item-ext-warranty-end">
                <Input
                  id="item-ext-warranty-end"
                  type="date"
                  value={extendedWarrantyExpiry}
                  onChange={(event) => setExtendedWarrantyExpiry(event.target.value)}
                />
              </Field>
              <Field label="Provider" htmlFor="item-ext-warranty-provider">
                <Input
                  id="item-ext-warranty-provider"
                  value={extendedWarrantyProvider}
                  onChange={(event) => setExtendedWarrantyProvider(event.target.value)}
                  placeholder="e.g. Retailer care plan"
                />
              </Field>
              <Field label="Cost" htmlFor="item-ext-warranty-cost">
                <Input
                  id="item-ext-warranty-cost"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={extendedWarrantyCost}
                  onChange={(event) => setExtendedWarrantyCost(event.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Notes" htmlFor="item-ext-warranty-notes">
                <Input
                  id="item-ext-warranty-notes"
                  value={extendedWarrantyNotes}
                  onChange={(event) => setExtendedWarrantyNotes(event.target.value)}
                  placeholder="Policy or reference number"
                />
              </Field>
            </div>
          ) : null}
        </div>

        <Field label="Notes" htmlFor="item-notes">
          <Textarea
            id="item-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Where it is, filter sizes, quirks, spare parts..."
          />
        </Field>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Save changes' : 'Add item'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
