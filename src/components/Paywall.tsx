import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { billingEnabled, purchasePro } from '../billing/revenuecat'
import { FREE_AI_DAILY_LIMIT, PRO_AI_DAILY_LIMIT, PRO_MONTHLY_PRICE } from '../lib/pricing'
import { PRIVACY_POLICY_PATH, TERMS_POLICY_PATH } from '../lib/appInfo'
import { Button } from './ui'

interface PaywallProps {
  onClose: () => void
}

export function Paywall({ onClose }: PaywallProps) {
  const [activating, setActivating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const subscribe = async () => {
    setActivating(true)
    setMessage(null)
    if (!billingEnabled()) {
      setActivating(false)
      setMessage('Checkout is only available in the mobile app.')
      return
    }
    const result = await purchasePro()
    setActivating(false)
    if (result.ok) {
      onClose()
    } else if (result.cancelled) {
      setMessage('Purchase cancelled.')
    } else {
      setMessage(result.message ?? 'Payment failed. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-surface p-6 pb-8 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Sparkles className="size-6" />
          </div>
          <h2 className="text-xl font-bold text-ink">HouseSphere Pro</h2>
          <p className="mt-1 text-sm text-muted">More scans for receipts, invoices, labels and bills.</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Free</p>
            <p className="mt-2 text-3xl font-bold text-ink">{FREE_AI_DAILY_LIMIT}</p>
            <p className="text-xs text-muted">actions / day</p>
          </div>
          <div className="rounded-2xl border border-brand bg-brand-soft/50 p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-brand">Pro</p>
            <p className="mt-2 text-3xl font-bold text-brand">{PRO_AI_DAILY_LIMIT}</p>
            <p className="text-xs text-brand">actions / day</p>
          </div>
        </div>

        <Button className="mt-6 w-full" onClick={() => void subscribe()} loading={activating}>
          Upgrade to Pro — US${PRO_MONTHLY_PRICE.toFixed(2)}/mo
        </Button>
        {message ? (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs font-medium text-amber">
            {message}
          </p>
        ) : null}

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted/80">
          HouseSphere Pro is an auto-renewing monthly subscription at US${PRO_MONTHLY_PRICE.toFixed(2)}. Payment is
          charged to your Google Play or App Store account and renews automatically unless cancelled at least 24
          hours before the end of the current period. Manage or cancel in your store account settings.
        </p>
        <p className="mt-2 text-center text-[11px] text-muted">
          <a className="underline" href={PRIVACY_POLICY_PATH} target="_blank" rel="noreferrer">
            Privacy policy
          </a>
          {' · '}
          <a className="underline" href={TERMS_POLICY_PATH} target="_blank" rel="noreferrer">
            Terms of use
          </a>
        </p>
        <Button className="mt-2 w-full" variant="ghost" onClick={onClose}>
          Maybe later
        </Button>
      </div>
    </div>
  )
}
