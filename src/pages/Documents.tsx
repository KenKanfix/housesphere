import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BookOpen,
  Building2,
  ClipboardCheck,
  Eye,
  FileText,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import {
  categoryLabel,
  db,
  daysUntil,
  DOCUMENT_TYPES,
  formatDate,
  formatMoney,
  type DocumentType,
  type HouseholdDocument,
} from '../lib/db'
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
  Stat,
  Tabs,
} from '../components/ui'
import { DocumentForm } from '../features/DocumentForm'

type Filter = 'all' | DocumentType

const TYPE_ICONS: Record<DocumentType, typeof FileText> = {
  insurance: ShieldCheck,
  building: Building2,
  inspection: ClipboardCheck,
  manual: BookOpen,
  invoice: ReceiptText,
  other: FileText,
}

export function Documents() {
  const toast = useToast()
  const settings = useSettings()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<HouseholdDocument | null>(null)
  const [deleting, setDeleting] = useState<HouseholdDocument | null>(null)
  const [viewing, setViewing] = useState<HouseholdDocument | null>(null)
  const [busy, setBusy] = useState(false)

  const documents = useLiveQuery(() => db.documents.toArray(), []) ?? []

  const withExpiry = documents.filter((document) => document.expiryDate)
  const renewals = withExpiry.filter((document) => {
    const days = daysUntil(document.expiryDate)
    return days >= 0 && days <= 90
  })
  const expired = withExpiry.filter((document) => daysUntil(document.expiryDate) < 0)

  const query = search.trim().toLowerCase()
  const filtered = documents
    .filter((document) => {
      if (filter !== 'all' && document.type !== filter) return false
      if (!query) return true
      return [document.title, document.issuer, document.reference, document.notes]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query))
    })
    .sort((a, b) => {
      if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate)
      if (a.expiryDate) return -1
      if (b.expiryDate) return 1
      return b.createdAt - a.createdAt
    })

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await db.documents.delete(deleting.id)
      toast('Document deleted')
      setDeleting(null)
    } catch {
      toast('Could not delete this document', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Insurance & documents"
        subtitle="Policies, building records, inspection reports, manuals and invoices."
        action={
          <Button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            icon={<Plus className="size-4" />}
          >
            Add document
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat icon={<FileText className="size-4" />} label="Documents" value={documents.length} />
        <Stat icon={<ShieldCheck className="size-4" />} label="Renewals due" value={renewals.length} tone="amber" hint="Next 90 days" />
        <Stat icon={<ShieldCheck className="size-4" />} label="Expired" value={expired.length} tone={expired.length > 0 ? 'danger' : 'brand'} />
      </div>

      <div className="mb-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." />
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: 'All', count: documents.length },
            ...DOCUMENT_TYPES.map((type) => ({
              value: type.value,
              label: type.label,
              count: documents.filter((document) => document.type === type.value).length,
            })),
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-6" />}
          title={documents.length === 0 ? 'No documents stored yet' : 'Nothing matches that filter'}
          description="Add your home insurance, building documents, inspection reports and appliance manuals so they are always on hand."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setShowForm(true)
              }}
              icon={<Plus className="size-4" />}
            >
              Add a document
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {filtered.map((document) => {
            const Icon = TYPE_ICONS[document.type]
            const days = document.expiryDate ? daysUntil(document.expiryDate) : null
            return (
              <div key={document.id} className="flex items-start gap-3 px-4 py-4">
                <div className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand sm:flex">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-ink">{document.title}</h3>
                    {days !== null ? (
                      <Badge tone={days < 0 ? 'danger' : days <= 30 ? 'amber' : days <= 90 ? 'neutral' : 'ok'}>
                        {days < 0 ? 'Expired' : `${days} days left`}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {categoryLabel(DOCUMENT_TYPES, document.type)}
                    {document.issuer ? ` · ${document.issuer}` : ''}
                    {document.reference ? ` · ${document.reference}` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted/85">
                    {document.issueDate ? `Issued ${formatDate(document.issueDate)}` : 'No issue date'}
                    {document.expiryDate ? ` · Renews ${formatDate(document.expiryDate)}` : ''}
                    {document.amount !== undefined ? ` · ${formatMoney(document.amount, settings.currency)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {document.fileData ? (
                    <IconButton label="View document" onClick={() => setViewing(document)}>
                      <Eye className="size-4" />
                    </IconButton>
                  ) : null}
                  <IconButton
                    label={`Edit ${document.title}`}
                    onClick={() => {
                      setEditing(document)
                      setShowForm(true)
                    }}
                  >
                    <Pencil className="size-4" />
                  </IconButton>
                  <IconButton label={`Delete ${document.title}`} onClick={() => setDeleting(document)} className="hover:text-danger">
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {showForm ? (
        <DocumentForm
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
        title={viewing?.title ?? 'Document'}
        description={viewing?.fileName ?? 'Stored on this device'}
        size="lg"
      >
        {viewing?.fileData ? (
          <div className="space-y-4">
            {viewing.fileData.startsWith('data:image') ? (
              <img src={viewing.fileData} alt={viewing.title} className="max-h-[60svh] w-full rounded-xl border border-line object-contain" />
            ) : (
              <iframe src={viewing.fileData} title={viewing.title} className="h-[60svh] w-full rounded-xl border border-line bg-white" />
            )}
            <div className="flex justify-end">
              <a
                href={viewing.fileData}
                download={viewing.fileName ?? 'document'}
                className="inline-flex h-10 items-center rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-brand/40"
              >
                Download file
              </a>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this document?"
        message={`"${deleting?.title ?? ''}" and its attached file will be removed from this device.`}
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
