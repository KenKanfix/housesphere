import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Clock,
  Globe,
  HardHat,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  Users,
} from 'lucide-react'
import { db, formatDate, formatMoney, TRADES, type Provider } from '../lib/db'
import { useSettings } from '../lib/hooks'
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
  Select,
  Stat,
} from '../components/ui'
import { ProviderForm } from '../features/ProviderForm'
import { ServiceRecordForm } from '../features/ServiceRecordForm'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function websiteHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function Stars({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-xs text-muted">Not rated</span>
  return (
    <span className="flex items-center gap-0.5 text-amber" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} className="size-3" fill={value <= rating ? 'currentColor' : 'none'} />
      ))}
    </span>
  )
}

export function Providers() {
  const toast = useToast()
  const settings = useSettings()
  const [search, setSearch] = useState('')
  const [tradeFilter, setTradeFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Provider | null>(null)
  const [deleting, setDeleting] = useState<Provider | null>(null)
  const [history, setHistory] = useState<Provider | null>(null)
  const [serviceFor, setServiceFor] = useState<Provider | null>(null)
  const [recordDeleting, setRecordDeleting] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const providers = useLiveQuery(() => db.providers.toArray(), []) ?? []
  const records = useLiveQuery(() => db.serviceRecords.toArray(), []) ?? []

  const recordsFor = (providerId: string) =>
    records.filter((record) => record.providerId === providerId).sort((a, b) => b.date.localeCompare(a.date))

  const uniqueTrades = new Set(providers.map((provider) => provider.trade)).size

  const query = search.trim().toLowerCase()
  const filtered = providers
    .filter((provider) => {
      if (tradeFilter !== 'all' && provider.trade !== tradeFilter) return false
      if (!query) return true
      return [provider.name, provider.trade, provider.phone, provider.email, provider.notes]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query))
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await db.transaction('rw', db.providers, db.serviceRecords, async () => {
        await db.serviceRecords.where('providerId').equals(deleting.id).delete()
        await db.providers.delete(deleting.id)
      })
      toast('Provider deleted')
      setDeleting(null)
    } catch {
      toast('Could not delete this provider', 'error')
    } finally {
      setBusy(false)
    }
  }

  const removeRecord = async () => {
    if (!recordDeleting) return
    try {
      await db.serviceRecords.delete(recordDeleting)
      toast('Service record deleted')
      setRecordDeleting(null)
    } catch {
      toast('Could not delete this record', 'error')
    }
  }

  const historyRecords = history ? recordsFor(history.id) : []

  return (
    <div>
      <PageHeader
        title="Service providers"
        subtitle="Your trusted electricians, plumbers, builders and gardeners, with service history."
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            icon={<Plus className="size-4" />}
          >
            Add provider
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat icon={<Users className="size-4" />} label="Providers" value={providers.length} />
        <Stat icon={<HardHat className="size-4" />} label="Trades covered" value={uniqueTrades} />
        <Stat icon={<Clock className="size-4" />} label="Service records" value={records.length} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search providers..." className="flex-1" />
        <Select
          value={tradeFilter}
          onChange={(event) => setTradeFilter(event.target.value)}
          className="sm:w-52"
          aria-label="Filter by trade"
        >
          <option value="all">All trades</option>
          {TRADES.map((trade) => (
            <option key={trade} value={trade}>
              {trade}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" />}
          title={providers.length === 0 ? 'No providers saved yet' : 'No providers match this search'}
          description="Save the tradespeople you trust with their contact details and a history of the work they have done."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              icon={<Plus className="size-4" />}
            >
              Add a provider
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((provider) => {
            const providerRecords = recordsFor(provider.id)
            const latest = providerRecords[0]
            return (
              <Card key={provider.id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-ink text-sm font-semibold text-white">
                    {initials(provider.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-ink">{provider.name}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{provider.trade}</Badge>
                      <Stars rating={provider.rating} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs">
                  {provider.phone ? (
                    <a href={`tel:${provider.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 text-muted hover:text-brand">
                      <Phone className="size-3.5 shrink-0" /> {provider.phone}
                    </a>
                  ) : null}
                  {provider.email ? (
                    <a href={`mailto:${provider.email}`} className="flex items-center gap-2 truncate text-muted hover:text-brand">
                      <Mail className="size-3.5 shrink-0" /> <span className="truncate">{provider.email}</span>
                    </a>
                  ) : null}
                  {provider.website ? (
                    <a
                      href={websiteHref(provider.website)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 truncate text-muted hover:text-brand"
                    >
                      <Globe className="size-3.5 shrink-0" /> <span className="truncate">{provider.website}</span>
                    </a>
                  ) : null}
                  {provider.address ? (
                    <p className="flex items-start gap-2 text-muted">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" /> <span className="line-clamp-2">{provider.address}</span>
                    </p>
                  ) : null}
                </div>

                {provider.notes ? <p className="mt-3 line-clamp-2 text-xs text-muted/90">{provider.notes}</p> : null}

                <div className="mt-4 rounded-xl bg-cream px-3 py-2.5 text-xs">
                  {latest ? (
                    <>
                      <p className="font-medium text-ink">{latest.description}</p>
                      <p className="mt-0.5 text-muted">
                        {formatDate(latest.date)}
                        {latest.cost !== undefined ? ` · ${formatMoney(latest.cost, settings.currency)}` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted">No service history recorded yet.</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <Button size="sm" variant="soft" onClick={() => setHistory(provider)} icon={<Clock className="size-4" />}>
                    History ({providerRecords.length})
                  </Button>
                  <div className="flex items-center gap-0.5">
                    <IconButton
                      label={`Edit ${provider.name}`}
                      onClick={() => {
                        setEditing(provider)
                        setShowForm(true)
                      }}
                    >
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={`Delete ${provider.name}`} onClick={() => setDeleting(provider)} className="hover:text-danger">
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showForm ? (
        <ProviderForm
          initial={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      ) : null}

      {serviceFor ? (
        <ServiceRecordForm
          providerId={serviceFor.id}
          providerName={serviceFor.name}
          onClose={() => setServiceFor(null)}
        />
      ) : null}

      <Modal
        open={Boolean(history)}
        onClose={() => setHistory(null)}
        title={history ? `${history.name} — service history` : 'Service history'}
        description={`${historyRecords.length} record${historyRecords.length === 1 ? '' : 's'}`}
        footer={
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (history) {
                  const provider = history
                  setHistory(null)
                  setServiceFor(provider)
                }
              }}
              icon={<Plus className="size-4" />}
            >
              Log service
            </Button>
          </div>
        }
      >
        {historyRecords.length === 0 ? (
          <p className="text-sm text-muted">No service has been logged for this provider yet.</p>
        ) : (
          <div className="space-y-3">
            {historyRecords.map((record) => (
              <div key={record.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Clock className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{record.description}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(record.date)}
                    {record.cost !== undefined ? ` · ${formatMoney(record.cost, settings.currency)}` : ''}
                  </p>
                </div>
                <IconButton label="Delete service record" onClick={() => setRecordDeleting(record.id)} className="hover:text-danger">
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this provider?"
        message={`"${deleting?.name ?? ''}" and their service history will be removed. This cannot be undone.`}
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={Boolean(recordDeleting)}
        title="Delete this service record?"
        message="This record will be removed from the provider's history."
        onConfirm={removeRecord}
        onCancel={() => setRecordDeleting(null)}
      />
    </div>
  )
}
