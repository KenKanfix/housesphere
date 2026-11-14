import { Link } from 'react-router-dom'
import { ArrowUpRight, Cloud, Database, Lock, ShieldCheck, Sparkles, WifiOff } from 'lucide-react'
import { APP_NAME, APP_VERSION, CONTACT_URL, PRIVACY_POLICY_PATH } from '../lib/appInfo'
import { Badge, Card, PageHeader } from '../components/ui'
import { BrandMark } from '../components/AppShell'

const privacyPoints = [
  {
    icon: Database,
    title: 'Stored on your device',
    body: 'Everything you add — items, photos, receipts, documents, expenses and bills — is saved in your browser’s IndexedDB on this device. We do not run an account, cloud database or sync service.',
  },
  {
    icon: Cloud,
    title: 'AI features are optional and transient',
    body: 'When you use the assistant or scan a photo, the text and/or image is sent through our serverless API to the configured AI provider (Google Gemini or OpenAI) to generate the result. The API key stays server-side and the request is not stored by us.',
  },
  {
    icon: WifiOff,
    title: 'No tracking or advertising',
    body: 'HouseSphere has no analytics, advertising or tracking SDKs, and we do not sell or share your household data. The website host may keep standard technical logs to serve and secure the site.',
  },
  {
    icon: Lock,
    title: 'You control deletion',
    body: 'Delete individual records at any time, or use Settings → Clear all data to erase everything on this device. Uninstalling the app also removes its local data.',
  },
]

export function About() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="About" subtitle="What HouseSphere is, how it works and how your data is handled." />

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <BrandMark className="size-14" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{APP_NAME}</h2>
              <p className="text-xs text-muted">Your home, in one place</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="brand">Version {APP_VERSION}</Badge>
                <Badge tone="neutral">Local-first</Badge>
                <Badge tone="neutral">PWA · Android TWA</Badge>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">
            HouseSphere is a household management app for inventory, warranties, maintenance, projects, documents, expenses, recurring bills,
            trusted trades and an AI home assistant. It works offline and keeps your data on your own device.
          </p>
        </Card>

        <Card className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Privacy at a glance</h2>
              <p className="text-xs text-muted">The short version of our privacy policy.</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {privacyPoints.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={PRIVACY_POLICY_PATH}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              <Lock className="size-4" /> Read the full privacy policy
            </a>
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-brand/40"
            >
              Contact us <ArrowUpRight className="size-4" />
            </a>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Sparkles className="size-4" />
            </div>
            <h2 className="text-sm font-semibold text-ink">AI assistant and scanning</h2>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            The assistant is optional. When you ask a question or scan a label, receipt or bill, the content you provide is sent to the app’s
            serverless endpoint and forwarded to the configured AI provider to produce a response or extract details. Photos are used only for
            that request. Do not scan documents you are not comfortable sending to the AI provider.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            You can review the providers’ own policies at{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="font-medium text-brand hover:text-brand-dark">
              Google
            </a>{' '}
            and{' '}
            <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noreferrer" className="font-medium text-brand hover:text-brand-dark">
              OpenAI
            </a>
            .
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Permissions</h2>
          <ul className="mt-2 space-y-1.5 text-xs text-muted">
            <li>• Camera or photo library access is requested only when you choose to take or upload a photo.</li>
            <li>• Notifications are optional and used for local reminders about maintenance, bills and warranties.</li>
            <li>• No location, contacts or background tracking is used.</li>
          </ul>
          <p className="mt-4 text-[11px] text-muted/80">
            {APP_NAME} {APP_VERSION} · Made for homeowners and renters. See the{' '}
            <Link to="/settings" className="font-medium text-brand hover:text-brand-dark">
              Settings
            </Link>{' '}
            page for backup, export and data deletion tools.
          </p>
        </Card>
      </div>
    </div>
  )
}
