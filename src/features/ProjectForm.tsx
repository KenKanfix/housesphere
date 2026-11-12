import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, PROJECT_STATUSES, uid, type Project, type ProjectStatus } from '../lib/db'
import { toNumber, trimmed } from '../lib/form'
import { useToast } from '../components/toastContext'
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui'
import { PhotoInput } from '../components/PhotoInput'

export function ProjectForm({ initial, onClose }: { initial?: Project | null; onClose: () => void }) {
  const toast = useToast()
  const providers = useLiveQuery(() => db.providers.orderBy('name').toArray(), []) ?? []

  const [title, setTitle] = useState(initial?.title ?? '')
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'planning')
  const [budget, setBudget] = useState(initial?.budget !== undefined ? String(initial.budget) : '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? '')
  const [providerId, setProviderId] = useState(initial?.providerId ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [beforePhoto, setBeforePhoto] = useState<string | undefined>(initial?.beforePhoto)
  const [afterPhoto, setAfterPhoto] = useState<string | undefined>(initial?.afterPhoto)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Give the project a name.')
      return
    }
    setSaving(true)
    try {
      const timestamp = now()
      await db.projects.put({
        id: initial?.id ?? uid(),
        title: title.trim(),
        status,
        budget: toNumber(budget),
        startDate: startDate || undefined,
        targetDate: targetDate || undefined,
        providerId: providerId || undefined,
        description: trimmed(description),
        beforePhoto,
        afterPhoto,
        createdAt: initial?.createdAt ?? timestamp,
        updatedAt: timestamp,
      })
      toast(initial ? 'Project updated' : 'Project created')
      onClose()
    } catch {
      setError('Could not save this project. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      onClose={onClose}
      title={initial ? 'Edit project' : 'New project'}
      description="Plan renovations and improvements with budgets and photos."
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Project name" htmlFor="project-title">
          <Input
            id="project-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Kitchen refresh"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="project-status">
            <Select id="project-status" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Budget" htmlFor="project-budget">
            <Input
              id="project-budget"
              type="number"
              min="0"
              step="0.01"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field label="Start date" htmlFor="project-start">
            <Input id="project-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label="Target completion" htmlFor="project-target">
            <Input
              id="project-target"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </Field>
          <Field label="Contractor" htmlFor="project-provider" className="sm:col-span-2">
            <Select id="project-provider" value={providerId} onChange={(event) => setProviderId(event.target.value)}>
              <option value="">No contractor selected</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} — {provider.trade}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Scope and notes" htmlFor="project-notes">
          <Textarea
            id="project-notes"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What will be done, quotes received, decisions made..."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <PhotoInput value={beforePhoto} onChange={setBeforePhoto} label="Before photo" />
          <PhotoInput value={afterPhoto} onChange={setAfterPhoto} label="After photo" />
        </div>

        {error ? <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
