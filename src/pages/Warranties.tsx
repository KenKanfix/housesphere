import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Eye, Pencil, Plus, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import { db, daysUntil, formatDate, formatDue, type Warranty } from '../lib/db'
import { useToast } from '../components/toastContext'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  SearchInput,
  Stat,
  Tabs,
} from '../components/ui'
import { WarrantyForm } from '../features/WarrantyForm'

type Filter = 'all' | 'review' | 'active' | 'expiring' | 'expired'

const isFilter = (value: string | null): value is Filter =>
  value === 'review' || value === 'active' || value === 'expiring' || value === 'expired'

export function Warranties() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const filterParam = params.get('filter')
  const filter: Filter = isFilter(filterParam) ? filterParam : 'all'
  const setFilter = (value: Filter) => {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('filter')
    else next.set('filter', value)
    setParams(next, { replace: true })
  }
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Warranty | null>(null)
  const [deleting, setDeleting] = useState<Warranty | null>(null)
  const [viewing, setViewing] = useState<Warranty | null>(null)
  const [busy, setBusy] = useState(false)

  const warranties = useLiveQuery(() => db.warranties.toArray(), []) ?? []
  const items = useLiveQuery(() => db.items.toArray(), []) ?? []

  const itemName = (id?: string) => items.find((item) => item.id === id)?.name ?? 'No linked item'

  const expired = warranties.filter((warranty) => daysUntil(warranty.expiryDate) < 0)
  const expiring = warranties.filter((warranty) => {
    const days = daysUntil(warranty.expiryDate)
    return days >= 0 && days <= 30
  })
  const active = warranties.filter((warranty) => daysUntil(warranty.expiryDate) >= 0)
  const review = warranties.filter((warranty) => daysUntil(warranty.expiryDate) <= 90)

  const query = search.trim().toLowerCase()
  const filtered = warranties
    .filter((warranty) => {
      if (filter === 'review' && daysUntil(warranty.expiryDate) > 90) return false
      if (filter === 'active' && daysUntil(warranty.expiryDate) < 0) return false
      if (filter === 'expiring') {
        const days = daysUntil(warranty.expiryDate)
        if (days < 0 || days > 30) return false
      }
      if (filter === 'expired' && daysUntil(warranty.expiryDate) >= 0) return false
      if (!query) return true
      return [warranty.title, warranty.provider, itemName(warranty.itemId)]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query))
    })
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await db.warranties.delete(deleting.id)
      toast('Warranty deleted')
      setDeleting(null)
    } catch {
      toast('Could not delete this warranty', 'error')
    } finally {
      setBusy(false)
    }
  }

  const statusBadge = (warranty: Warranty) => {
    const days = daysUntil(warranty.expiryDate)
    if (days < 0) {
      return (
        <Badge tone="danger">
          <ShieldAlert className="size-3" /> Expired
        </Badge>
      )
    }
    if (days <= 30) {
      return (
        <Badge tone="amber">
          <ShieldAlert className="size-3" /> {formatDue(warranty.expiryDate)}
        </Badge>
      )
    }
    return (
      <Badge tone="ok">
        <ShieldCheck className="size-3" /> Active
      </Badge>
    )
  }

  return (
    <div>
      <PageHeader
        title="Warranties & receipts"
        subtitle="Never lose track of cover again. Keep expiry dates and receipts together."
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            icon={<Plus className="size-4" />}
          >
            Add warranty
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat icon={<ShieldCheck className="size-4" />} label="Active" value={active.length} />
        <Stat icon={<ShieldAlert className="size-4" />} label="Expiring soon" value={expiring.length} tone="amber" hint="Next 30 days" />
        <Stat icon={<ShieldAlert className="size-4" />} label="Expired" value={expired.length} tone="danger" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          className="sm:w-auto"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: 'All', count: warranties.length },
            { value: 'review', label: 'Review 90d', count: review.length },
            { value: 'active', label: 'Active', count: active.length },
            { value: 'expiring', label: 'Expiring', count: expiring.length },
            { value: 'expired', label: 'Expired', count: expired.length },
          ]}
        />
        <SearchInput value={search} onChange={setSearch} placeholder="Search warranties..." className="flex-1" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-6" />}
          title={warranties.length === 0 ? 'No warranties saved yet' : 'Nothing matches that filter'}
          description="Add a warranty for your fridge, TV or hot water system and HouseSphere will remind you before it expires."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              icon={<Plus className="size-4" />}
            >
              Add a warranty
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {filtered.map((warranty) => {
            const item = items.find((entry) => entry.id === warranty.itemId)
            return (
              <div key={warranty.id} className="flex items-start gap-3 px-4 py-4 sm:items-center">
                <div
                  className={
                    daysUntil(warranty.expiryDate) < 0
                      ? 'hidden size-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger sm:flex'
                      : 'hidden size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand sm:flex'
                  }
                >
                  <ShieldCheck className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink">{warranty.title}</h3>
                    {statusBadge(warranty)}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {item ? item.name : itemName(warranty.itemId)}
                    {warranty.provider ? ` · ${warranty.provider}` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted/85">
                    Expires {formatDate(warranty.expiryDate)}
                    {warranty.purchaseDate ? ` · Bought ${formatDate(warranty.purchaseDate)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {warranty.receipt ? (
                    <IconButton label="View receipt" onClick={() => setViewing(warranty)}>
                      <Eye className="size-4" />
                    </IconButton>
                  ) : null}
                  <IconButton
                    label={`Edit ${warranty.title}`}
                    onClick={() => {
                      setEditing(warranty)
                      setShowForm(true)
                    }}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label={`Delete ${warranty.title}`} onClick={() => setDeleting(warranty)} className="hover:text-danger">
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {showForm ? (
        <WarrantyForm
          initial={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      ) : null}

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? 'Receipt'}
        description={viewing?.fileName ?? 'Stored on this device'}
        size="lg"
      >
        {viewing?.receipt ? (
          <div className="space-y-4">
            <img src={viewing.receipt} alt="Receipt" className="max-h-[60svh] w-full rounded-xl border border-line object-contain" />
            <div className="flex justify-end">
              <a
                href={viewing.receipt}
                download={viewing.fileName ?? 'receipt.jpg'}
                className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-brand/40"
              >
                Download receipt
              </a>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this warranty?"
        message={`"${deleting?.title ?? ''}" and its receipt will be removed. This cannot be undone.`}
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
