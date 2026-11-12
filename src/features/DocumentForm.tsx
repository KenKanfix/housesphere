import { useState } from 'react'
import { db, DOCUMENT_TYPES, now, uid, type DocumentType, type HouseholdDocument } from '../lib/db'
import { toNumber, trimmed } from '../lib/form'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui'
import { FileInput } from '../components/FileInput'

export function DocumentForm({ initial, onClose }: { initial?: HouseholdDocument | null; onClose: () => void }) {
  const toast = useToast()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [type, setType] = useState<DocumentType>(initial?.type ?? 'insurance')
  const [issuer, setIssuer] = useState(initial?.issuer ?? '')
  const [reference, setReference] = useState(initial?.reference ?? '')
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? '')
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? '')
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : '')
  const [fileData, setFileData] = useState<string | undefined>(initial?.fileData)
  const [fileName, setFileName] = useState<string | undefined>(initial?.fileName)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Give the document a name.')
      return
    }
    setSaving(true)
    try {
      const timestamp = now()
      await db.documents.put({
        id: initial?.id ?? uid(),
        title: title.trim(),
        type,
        issuer: trimmed(issuer),
        reference: trimmed(reference),
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
        amount: toNumber(amount),
        fileData,
        fileName,
        notes: trimmed(notes),
        createdAt: initial?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      toast(initial ? 'Document updated' : 'Document saved')
      onClose()
    } catch {
      setError('Could not save this document. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={initial ? 'Edit document' : 'Add document'}
      description="Insurance, building records, inspections, manuals and invoices."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Document name" htmlFor="document-title">
          <Input
            id="document-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Home & contents insurance"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="document-type">
            <Select id="document-type" value={type} onChange={(event) => setType(event.target.value as DocumentType)}>
              {DOCUMENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Issuer" htmlFor="document-issuer">
            <Input
              id="document-issuer"
              value={issuer}
              onChange={(event) => setIssuer(event.target.value)}
              placeholder="Insurer, council, manufacturer..."
            />
          </Field>
          <Field label="Reference or policy number" htmlFor="document-reference">
            <Input
              id="document-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="Amount" htmlFor="document-amount">
            <Input
              id="document-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Issue date" htmlFor="document-issue">
            <Input id="document-issue" type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} />
          </Field>
          <Field label="Expiry or renewal date" htmlFor="document-expiry">
            <Input
              id="document-expiry"
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
            />
          </Field>
        </div>

        <FileInput
          data={fileData}
          fileName={fileName}
          onChange={(data, name) => {
            setFileData(data)
            setFileName(name)
          }}
        />

        <Field label="Notes" htmlFor="document-notes">
          <Textarea
            id="document-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Cover amount, exclusions, where the original is kept..."
          />
        </Field>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Save changes' : 'Add document'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
