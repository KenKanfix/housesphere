import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Package, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import {
  categoryLabel,
  db,
  daysUntil,
  formatMoney,
  ITEM_CATEGORIES,
  now,
  uid,
  type Item,
  type ItemCategory,
} from '../lib/db'
import { useSettings } from '../lib/hooks'
import { useToast } from '../components/toastContext'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
} from '../components/ui'
import { ItemForm } from '../features/ItemForm'

export function Inventory() {
  const toast = useToast()
  const settings = useSettings()
  const [params, setParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [roomFilter, setRoomFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ItemCategory>('all')
  const [showForm, setShowForm] = useState(() => params.get('new') === '1')
  const [editing, setEditing] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState<Item | null>(null)
  const [busy, setBusy] = useState(false)
  const [showRoom, setShowRoom] = useState(false)
  const [roomName, setRoomName] = useState('')

  const items = useLiveQuery(() => db.items.orderBy('name').toArray(), []) ?? []
  const rooms = useLiveQuery(() => db.rooms.orderBy('name').toArray(), []) ?? []
  const warranties = useLiveQuery(() => db.warranties.toArray(), []) ?? []

  useEffect(() => {
    if (params.get('new') === '1') {
      const next = new URLSearchParams(params)
      next.delete('new')
      setParams(next, { replace: true })
    }
  }, [params, setParams])

  const roomNameFor = (id: string) => rooms.find((room) => room.id === id)?.name ?? 'Unassigned'

  const nextWarranty = (itemId: string) =>
    warranties
      .filter((warranty) => warranty.itemId === itemId)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0]

  const query = search.trim().toLowerCase()
  const filtered = items.filter((item) => {
    if (roomFilter !== 'all' && item.roomId !== roomFilter) return false
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
    if (!query) return true
    return [item.name, item.brand, item.model, item.serial, item.notes, roomNameFor(item.roomId)]
      .filter(Boolean)
      .some((field) => field!.toLowerCase().includes(query))
  })

  const roomCount = (id: string) => items.filter((item) => item.roomId === id).length

  const deleteItem = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await db.transaction('rw', db.items, db.warranties, async () => {
        await db.items.delete(deleting.id)
        await db.warranties.where('itemId').equals(deleting.id).delete()
      })
      toast('Item deleted')
      setDeleting(null)
    } catch {
      toast('Could not delete this item', 'error')
    } finally {
      setBusy(false)
    }
  }

  const addRoom = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = roomName.trim()
    if (!name) return
    try {
      const id = uid()
      await db.rooms.put({ id, name, createdAt: now() })
      setRoomFilter(id)
      setRoomName('')
      setShowRoom(false)
      toast(`Room "${name}" added`)
    } catch {
      toast('Could not add that room', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Home inventory"
        subtitle="A digital catalogue of everything you own, organised room by room."
        action={
          <>
            <Button variant="secondary" onClick={() => setShowRoom(true)} icon={<Plus className="size-4" />}>
              Room
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              icon={<Plus className="size-4" />}
            >
              Add item
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, brand, model or serial..."
          className="flex-1"
        />
        <Select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as 'all' | ItemCategory)}
          className="sm:w-48"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {ITEM_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setRoomFilter('all')}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            roomFilter === 'all'
              ? 'border-brand bg-brand text-white'
              : 'border-line bg-surface text-muted hover:border-brand/40 hover:text-ink'
          }`}
        >
          All rooms <span className="opacity-70">{items.length}</span>
        </button>
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => setRoomFilter(room.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              roomFilter === room.id
                ? 'border-brand bg-brand text-white'
                : 'border-line bg-surface text-muted hover:border-brand/40 hover:text-ink'
            }`}
          >
            {room.name} <span className="opacity-70">{roomCount(room.id)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="size-6" />}
          title={items.length === 0 ? 'Your inventory is empty' : 'Nothing matches that search'}
          description={
            items.length === 0
              ? 'Start with the big things: fridge, washing machine, TV, mower. Add photos, serial numbers and receipts as you go.'
              : 'Try a different room, category or search term.'
          }
          action={
            items.length === 0 ? (
              <Button
                onClick={() => {
                  setEditing(null)
                  setShowForm(true)
                }}
                icon={<Plus className="size-4" />}
              >
                Add your first item
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const warranty = nextWarranty(item.id)
            const days = warranty ? daysUntil(warranty.expiryDate) : null
            return (
              <Card key={item.id} className="flex flex-col overflow-hidden">
                <div className="relative aspect-[16/10] bg-brand-soft/50">
                  {item.photo ? (
                    <img src={item.photo} alt={item.name} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-brand/70">
                      <Package className="size-9" />
                    </div>
                  )}
                  {warranty ? (
                    <div className="absolute left-3 top-3">
                      <Badge tone={days! < 0 ? 'danger' : days! <= 30 ? 'amber' : 'ok'}>
                        {days! < 0 ? (
                          <>
                            <ShieldAlert className="size-3" /> Warranty expired
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="size-3" /> {days} days cover
                          </>
                        )}
                      </Badge>
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-ink">{item.name}</h3>
                      <p className="truncate text-xs text-muted">
                        {roomNameFor(item.roomId)} · {categoryLabel(ITEM_CATEGORIES, item.category)}
                      </p>
                    </div>
                    {item.price !== undefined ? (
                      <span className="shrink-0 text-sm font-semibold text-ink">{formatMoney(item.price, settings.currency)}</span>
                    ) : null}
                  </div>

                  {item.brand || item.model ? (
                    <p className="mt-2 truncate text-xs text-muted">
                      {[item.brand, item.model].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  {item.serial ? <p className="truncate text-[11px] text-muted/80">S/N {item.serial}</p> : null}

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <span className="text-[11px] text-muted">
                      {item.purchaseDate ? `Bought ${item.purchaseDate}` : 'No purchase date'}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <IconButton
                        label={`Edit ${item.name}`}
                        onClick={() => {
                          setEditing(item)
                          setShowForm(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton label={`Delete ${item.name}`} onClick={() => setDeleting(item)} className="hover:text-danger">
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showForm ? (
        <ItemForm
          initial={editing}
          defaultRoomId={roomFilter !== 'all' ? roomFilter : undefined}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      ) : null}

      <Modal open={showRoom} onClose={() => setShowRoom(false)} title="Add a room" description="Group items by where they live.">
        <form onSubmit={addRoom} className="space-y-4">
          <Field label="Room name" htmlFor="room-name">
            <Input
              id="room-name"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="e.g. Home office"
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowRoom(false)}>
              Cancel
            </Button>
            <Button type="submit">Add room</Button>
          </div>
          <p className="text-xs text-muted">
            Existing rooms: {rooms.map((room) => room.name).join(', ')}
          </p>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this item?"
        message={`"${deleting?.name ?? ''}" will be removed from your inventory, along with any warranties linked to it. This cannot be undone.`}
        busy={busy}
        onConfirm={deleteItem}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
