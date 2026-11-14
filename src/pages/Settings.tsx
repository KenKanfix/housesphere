import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bell,
  CheckCircle2,
  Database,
  DatabaseBackup,
  Download,
  HardDriveDownload,
  KeyRound,
  RefreshCw,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  CURRENCIES,
  db,
  downloadFile,
  ensureDefaults,
  now,
  todayISO,
  type AppSettings,
} from '../lib/db'
import { APP_VERSION, PRIVACY_POLICY_PATH } from '../lib/appInfo'
import { useInstallPrompt, useSettings } from '../lib/hooks'
import { getAiStatus, getAiUsage, type AiStatus, type AiUsage } from '../lib/ai'
import { loadDemoData } from '../lib/demo'
import { requestNotificationPermission } from '../lib/reminders'
import { useToast } from '../components/toastContext'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
  Select,
} from '../components/ui'

const TABLES = [
  'rooms',
  'items',
  'warranties',
  'maintenance',
  'projects',
  'documents',
  'expenses',
  'providers',
  'serviceRecords',
  'aiMessages',
  'settings',
] as const

function HouseholdProfileCard({ settings }: { settings: AppSettings }) {
  const toast = useToast()
  const [name, setName] = useState(settings.householdName)
  const [currency, setCurrency] = useState(settings.currency)

  const save = async () => {
    try {
      await db.settings.put({
        ...settings,
        id: 'app',
        householdName: name.trim() || 'My Home',
        currency,
        updatedAt: now(),
      })
      toast('Household settings saved')
    } catch {
      toast('Could not save your settings', 'error')
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Database className="size-4 text-brand" />
        <h2 className="text-sm font-semibold text-ink">Household profile</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Household name" htmlFor="settings-name">
          <Input
            id="settings-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. 12 Rosewood Avenue"
          />
        </Field>
        <Field label="Currency" htmlFor="settings-currency">
          <Select id="settings-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => void save()}>Save changes</Button>
      </div>
    </Card>
  )
}

function RemindersCard({ settings }: { settings: AppSettings }) {
  const toast = useToast()
  const [enabled, setEnabled] = useState(settings.reminderNotifications)

  const toggle = async () => {
    if (!enabled) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        toast('Notifications are blocked. Allow them in your browser settings first.', 'error')
        return
      }
      await db.settings.update('app', { reminderNotifications: true, updatedAt: now() })
      setEnabled(true)
      toast('Daily reminders enabled')
    } else {
      await db.settings.update('app', { reminderNotifications: false, updatedAt: now() })
      setEnabled(false)
      toast('Reminders turned off')
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Bell className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">Reminder notifications</h2>
            <p className="mt-0.5 max-w-md text-xs text-muted">
              HouseSphere checks for overdue maintenance, expiring warranties and renewals once a day when you open the app.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle reminder notifications"
          onClick={() => void toggle()}
          className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            enabled ? 'bg-brand' : 'bg-black/15'
          }`}
        >
          <span
            className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <p className="mt-3 text-[11px] text-muted/80">
        Notifications are supported in this browser: {typeof Notification !== 'undefined' ? 'yes' : 'no'}.
      </p>
    </Card>
  )
}

function AiSettingsCard({ settings }: { settings: AppSettings }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [aiUsage, setAiUsage] = useState<AiUsage>(() => getAiUsage())
  const [keyInput, setKeyInput] = useState('')
  const [model, setModel] = useState(settings.aiModel ?? '')
  const [provider, setProvider] = useState<'gemini' | 'openai'>(
    settings.aiProvider === 'openai' ? 'openai' : 'gemini',
  )
  const [saving, setSaving] = useState(false)

  const enabled = settings.aiEnabled ?? false
  const mode = settings.aiMode === 'own' ? 'own' : 'app'
  const hasKey = Boolean(settings.aiApiKey?.trim())

  useEffect(() => {
    void getAiStatus().then(setStatus)
  }, [])

  const refresh = () => {
    void getAiStatus().then(setStatus)
    setAiUsage(getAiUsage())
  }

  const update = async (patch: Partial<AppSettings>, message?: string) => {
    try {
      await db.settings.update('app', { ...patch, updatedAt: now() })
      if (message) toast(message)
    } catch {
      toast('Could not save your AI settings', 'error')
    }
  }

  const save = async () => {
    const key = keyInput.trim()
    setSaving(true)
    try {
      const patch: Partial<AppSettings> = {
        aiProvider: provider,
        aiModel: model.trim() || undefined,
        updatedAt: now(),
      }
      if (key) {
        patch.aiApiKey = key
        patch.aiMode = 'own'
        patch.aiEnabled = true
      }
      await db.settings.update('app', patch)
      setKeyInput('')
      setAiUsage(getAiUsage())
      toast(key ? 'Your API key is saved on this device' : 'AI settings saved')
    } catch {
      toast('Could not save your AI settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const removeKey = async () => {
    try {
      const current = await db.settings.get('app')
      if (current) {
        const { aiApiKey, ...rest } = current
        void aiApiKey
        await db.settings.put({ ...rest, aiMode: 'app', updatedAt: now() })
      }
      toast('Saved API key removed')
    } catch {
      toast('Could not remove the saved key', 'error')
    }
  }

  const serverReady = Boolean(status?.configured)
  const badgeTone = mode === 'own' ? (hasKey ? 'ok' : 'amber') : serverReady ? 'ok' : 'amber'
  const badgeLabel =
    mode === 'own'
      ? hasKey
        ? `Your key · ${provider === 'openai' ? 'OpenAI' : 'Gemini'}`
        : 'No key saved'
      : serverReady
        ? `Ready · ${status?.model ?? 'AI'}`
        : 'Server key not set'

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <KeyRound className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">AI home assistant</h2>
            <p className="mt-0.5 max-w-md text-xs text-muted">
              Optional chat and photo scanning. Everything else in HouseSphere works without AI.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle AI assistant"
          onClick={() => void update({ aiEnabled: !enabled }, enabled ? 'AI turned off' : 'AI turned on')}
          className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            enabled ? 'bg-brand' : 'bg-black/15'
          }`}
        >
          <span
            className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <Badge tone={badgeTone} className="mt-3">
        {badgeLabel}
      </Badge>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void update({ aiMode: 'app' })}
          className={`rounded-xl border p-3 text-left transition-colors ${
            mode === 'app' ? 'border-brand bg-brand-soft/40' : 'border-line bg-surface hover:border-brand/40'
          }`}
        >
          <p className="text-sm font-semibold text-ink">HouseSphere AI</p>
          <p className="mt-1 text-[11px] text-muted">Shared key · 3 free actions per day</p>
        </button>
        <button
          type="button"
          onClick={() => void update({ aiMode: 'own' })}
          className={`rounded-xl border p-3 text-left transition-colors ${
            mode === 'own' ? 'border-brand bg-brand-soft/40' : 'border-line bg-surface hover:border-brand/40'
          }`}
        >
          <p className="text-sm font-semibold text-ink">Use your own key</p>
          <p className="mt-1 text-[11px] text-muted">Unlimited · you pay the AI provider directly</p>
        </button>
      </div>

      {mode === 'app' ? (
        <div className="mt-3 rounded-xl bg-cream px-3.5 py-3 text-xs text-muted">
          {serverReady ? (
            <p>
              {aiUsage.remaining} of {aiUsage.limit} free AI actions left today. The counter resets at local midnight on this device.
            </p>
          ) : (
            <p>
              Built-in AI is not configured on this deployment yet. Use your own key below, or set{' '}
              <code className="rounded bg-black/5 px-1 py-0.5">GEMINI_API_KEY</code> (or{' '}
              <code className="rounded bg-black/5 px-1 py-0.5">OPENAI_API_KEY</code>) in your environment variables.
            </p>
          )}
          {aiUsage.remaining <= 0 ? (
            <p className="mt-1 font-medium text-amber">Today&apos;s free actions are used up. Switch to your own key for unlimited use.</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-3 rounded-xl bg-cream px-3.5 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Provider" htmlFor="ai-provider">
              <Select
                id="ai-provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value as 'gemini' | 'openai')}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </Select>
            </Field>
            <Field label="Model (optional)" htmlFor="ai-model">
              <Input
                id="ai-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder={provider === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini'}
              />
            </Field>
          </div>
          <Field label="API key" htmlFor="ai-key">
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              placeholder={hasKey ? 'A key is saved on this device — paste a new one to replace it' : 'Paste your API key'}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void save()} loading={saving}>
              Save
            </Button>
            {hasKey ? (
              <Button size="sm" variant="ghost" onClick={() => void removeKey()}>
                Remove saved key
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] text-muted/80">
            Your key is stored only on this device and is never included in exported backups. Requests pass through this app&apos;s
            serverless function, which does not log the key.
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={refresh} icon={<RefreshCw className="size-4" />}>
          Check status
        </Button>
        <Button size="sm" variant="soft" onClick={() => navigate('/assistant')}>
          Open assistant
        </Button>
      </div>
    </Card>
  )
}

export function SettingsPage() {
  const toast = useToast()
  const settings = useSettings()
  const { canInstall, installed, promptInstall } = useInstallPrompt()

  const [usage, setUsage] = useState<number | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [importing, setImporting] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const counts = useLiveQuery(
    async () => ({
      items: await db.items.count(),
      documents: await db.documents.count(),
      expenses: await db.expenses.count(),
      providers: await db.providers.count(),
    }),
    [],
  )

  const estimateStorage = () => {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      void navigator.storage.estimate().then((estimate) => setUsage(estimate.usage ?? 0))
    }
  }

  useEffect(() => {
    estimateStorage()
  }, [])

  const exportData = async () => {
    setBusyAction('export')
    try {
      const data: Record<string, unknown[]> = {}
      data.rooms = await db.rooms.toArray()
      data.items = await db.items.toArray()
      data.warranties = await db.warranties.toArray()
      data.maintenance = await db.maintenance.toArray()
      data.projects = await db.projects.toArray()
      data.documents = await db.documents.toArray()
      data.expenses = await db.expenses.toArray()
      data.providers = await db.providers.toArray()
      data.serviceRecords = await db.serviceRecords.toArray()
      data.aiMessages = await db.aiMessages.toArray()
      data.settings = (await db.settings.toArray()).map((row) => {
        const safe = { ...row }
        delete safe.aiApiKey
        return safe
      })

      const snapshot = {
        app: 'HouseSphere',
        version: 1,
        exportedAt: new Date().toISOString(),
        data,
      }
      downloadFile(`housesphere-backup-${todayISO()}.json`, JSON.stringify(snapshot, null, 2))
      toast('Backup downloaded')
    } catch {
      toast('Could not create the backup', 'error')
    } finally {
      setBusyAction('')
    }
  }

  const importData = async (file?: File) => {
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed || parsed.app !== 'HouseSphere' || !parsed.data || typeof parsed.data !== 'object') {
        throw new Error('Not a HouseSphere backup file')
      }
      const data = parsed.data as Record<string, unknown>
      await db.transaction(
        'rw',
        [
          db.rooms,
          db.items,
          db.warranties,
          db.maintenance,
          db.projects,
          db.documents,
          db.expenses,
          db.providers,
          db.serviceRecords,
          db.aiMessages,
          db.settings,
        ],
        async () => {
          const existingKey = (await db.settings.get('app'))?.aiApiKey
          for (const table of TABLES) {
            const rows = data[table]
            if (Array.isArray(rows) && rows.length > 0) {
              const target = db.table(table)
              if (table === 'settings') {
                const safe = rows.map((row) => {
                  const copy = { ...(row as Record<string, unknown>) }
                  delete copy.aiApiKey
                  if (existingKey) copy.aiApiKey = existingKey
                  return copy
                })
                await target.bulkPut(safe)
              } else {
                await target.bulkPut(rows)
              }
            }
          }
        },
      )
      await ensureDefaults()
      toast('Backup imported')
      estimateStorage()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not import that file', 'error')
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  const loadDemo = async () => {
    setBusyAction('demo')
    try {
      const loaded = await loadDemoData()
      toast(
        loaded ? 'Sample data loaded — explore the app' : 'Sample data only loads when your inventory is empty',
        loaded ? 'success' : 'info',
      )
      estimateStorage()
    } catch {
      toast('Could not load sample data', 'error')
    } finally {
      setBusyAction('')
    }
  }

  const clearAll = async () => {
    setConfirmClear(false)
    try {
      await db.delete()
      localStorage.removeItem('housesphere:last-reminder')
      localStorage.removeItem('housesphere:ai-usage')
      window.location.reload()
    } catch {
      toast('Could not clear the local database', 'error')
    }
  }

  const installedUsage = usage !== null ? `${(usage / (1024 * 1024)).toFixed(1)} MB used on this device` : 'Calculating…'

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" subtitle="Household preferences, reminders, backups and app installation." />

      <div className="space-y-5">
        <HouseholdProfileCard key={`profile-${settings.updatedAt}`} settings={settings} />

        <RemindersCard key={`reminders-${settings.updatedAt}`} settings={settings} />

        <AiSettingsCard key={`ai-${settings.updatedAt}`} settings={settings} />

        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <DatabaseBackup className="size-4 text-brand" />
            <h2 className="text-sm font-semibold text-ink">Data & backup</h2>
          </div>
          <p className="text-xs text-muted">
            {counts
              ? `${counts.items} items · ${counts.documents} documents · ${counts.expenses} expenses · ${counts.providers} providers`
              : 'Loading data…'}
          </p>
          <p className="mt-1 text-[11px] text-muted/80">{installedUsage}</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => void exportData()} loading={busyAction === 'export'} icon={<Download className="size-4" />}>
              Export backup
            </Button>
            <Button
              variant="secondary"
              onClick={() => importRef.current?.click()}
              loading={importing}
              icon={<Upload className="size-4" />}
            >
              Import backup
            </Button>
            <Button variant="secondary" onClick={() => void loadDemo()} loading={busyAction === 'demo'} icon={<HardDriveDownload className="size-4" />}>
              Load sample data
            </Button>
            <Button variant="danger" onClick={() => setConfirmClear(true)} icon={<Trash2 className="size-4" />}>
              Clear all data
            </Button>
          </div>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => void importData(event.target.files?.[0])}
          />
          <p className="mt-3 text-[11px] text-muted/80">
            Backups include photos and documents as data, so the file can be large. Keep it somewhere safe.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Smartphone className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">Install HouseSphere</h2>
                <p className="mt-0.5 max-w-md text-xs text-muted">
                  Add HouseSphere to your home screen for an app-like experience with offline access.
                </p>
              </div>
            </div>
            {installed ? (
              <Badge tone="ok">
                <CheckCircle2 className="size-3" /> Installed
              </Badge>
            ) : null}
          </div>

          {!installed ? (
            <div className="mt-4">
              {canInstall ? (
                <Button onClick={() => void promptInstall()} icon={<Smartphone className="size-4" />}>
                  Install HouseSphere
                </Button>
              ) : (
                <div className="rounded-xl bg-cream px-3.5 py-3 text-xs text-muted">
                  <p className="font-medium text-ink">Install from your browser menu</p>
                  <p className="mt-1">iPhone / iPad: Share → Add to Home Screen.</p>
                  <p>Android Chrome: menu → Install app or Add to Home screen.</p>
                  <p>Desktop Chrome / Edge: install icon in the address bar.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted">HouseSphere is running as an installed app.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink">About HouseSphere</h2>
          </div>
          <p className="mt-2 text-xs text-muted">
            HouseSphere is a local-first household management app. Everything you add is stored in IndexedDB on this device — no account and
            no cloud sync. Export a backup before clearing browser data or changing devices.
          </p>
          <p className="mt-2 text-xs text-muted">
            The Android version is packaged as a Trusted Web Activity (TWA) so the same codebase ships to the Play Store. TWA setup
            instructions are in the project README.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted/70">
            <span>Version {APP_VERSION} · Made for homeowners and renters.</span>
            <Link to="/about" className="font-medium text-brand hover:text-brand-dark">
              About
            </Link>
            <a href={PRIVACY_POLICY_PATH} className="font-medium text-brand hover:text-brand-dark">
              Privacy policy
            </a>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all HouseSphere data?"
        message="Every item, receipt, document, project and expense stored on this device will be permanently deleted. Export a backup first if you want to keep it."
        confirmLabel="Delete everything"
        onConfirm={() => void clearAll()}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  )
}
