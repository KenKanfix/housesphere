import { Capacitor } from '@capacitor/core'
import type { CustomerInfo } from '@revenuecat/purchases-capacitor'
import { isPro, setIsPro } from '../lib/entitlement'
import { getAppUserId } from '../lib/userId'

export const ENTITLEMENT_ID = 'pro'

const SDK_KEY: string | undefined =
  (import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined) || undefined

let configured = false

export function isNativeDevice(): boolean {
  return Capacitor.isNativePlatform()
}

export function billingEnabled(): boolean {
  return isNativeDevice() && Boolean(SDK_KEY)
}

function entitlementActive(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements?.active?.[ENTITLEMENT_ID])
}

function applyEntitlement(customerInfo: CustomerInfo): void {
  const active = entitlementActive(customerInfo)
  if (active !== isPro()) setIsPro(active)
}

export async function configurePurchases(): Promise<void> {
  if (configured || !billingEnabled()) return
  configured = true
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    await Purchases.configure({ apiKey: SDK_KEY!, appUserID: getAppUserId() })
    await Purchases.addCustomerInfoUpdateListener((info) => applyEntitlement(info))
    const { customerInfo } = await Purchases.getCustomerInfo()
    applyEntitlement(customerInfo)
    if (!entitlementActive(customerInfo) && isPro()) {
      try {
        const { customerInfo: fresh } = await Purchases.restorePurchases()
        applyEntitlement(fresh)
      } catch {
        return
      }
    }
  } catch {
    configured = false
  }
}

export interface BillingResult {
  ok: boolean
  cancelled?: boolean
  message?: string
}

export async function purchasePro(): Promise<BillingResult> {
  if (!billingEnabled()) {
    return { ok: false, message: 'Purchases are only available in the native app.' }
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const offerings = await Purchases.getOfferings()
    const pkg = offerings?.current?.monthly
    if (!pkg) {
      return { ok: false, message: 'No monthly Pro plan is available yet. Check the RevenueCat offering.' }
    }
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
    applyEntitlement(customerInfo)
    return { ok: true }
  } catch (err) {
    const e = err as { userCancelled?: unknown; code?: unknown }
    if (e?.userCancelled === true || String(e?.code) === '1') return { ok: false, cancelled: true }
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Purchase failed. Please try again.',
    }
  }
}

export async function restorePurchasesBilling(): Promise<BillingResult> {
  if (!billingEnabled()) {
    return { ok: false, message: 'Purchases are only available in the native app.' }
  }
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const { customerInfo } = await Purchases.restorePurchases()
    applyEntitlement(customerInfo)
    return {
      ok: true,
      message: entitlementActive(customerInfo) ? 'Purchase restored.' : 'No prior purchase found.',
    }
  } catch (err) {
    const e = err as { userCancelled?: unknown }
    if (e?.userCancelled === true) return { ok: false, cancelled: true }
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Restore failed. Please try again.',
    }
  }
}
