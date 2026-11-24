import { FREE_AI_DAILY_LIMIT, PRO_AI_DAILY_LIMIT } from './pricing'

const PRO_KEY = 'housesphere:pro'
export const ENTITLEMENT_EVENT = 'housesphere:entitlement'

export function isPro(): boolean {
  try {
    return localStorage.getItem(PRO_KEY) === '1'
  } catch {
    return false
  }
}

export function setIsPro(value: boolean): void {
  try {
    localStorage.setItem(PRO_KEY, value ? '1' : '0')
  } catch {
    return
  }
  window.dispatchEvent(new Event(ENTITLEMENT_EVENT))
}

export function getDailyAiLimit(): number {
  return isPro() ? PRO_AI_DAILY_LIMIT : FREE_AI_DAILY_LIMIT
}
