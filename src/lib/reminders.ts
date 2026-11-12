import { db, daysUntil, todayISO } from './db'

const REMINDER_KEY = 'housesphere:last-reminder'

export interface Reminder {
  title: string
  date: string
  kind: 'maintenance' | 'warranty' | 'document'
  days: number
}

export async function getDueReminders(): Promise<Reminder[]> {
  const [tasks, warranties, documents] = await Promise.all([
    db.maintenance.toArray(),
    db.warranties.toArray(),
    db.documents.toArray(),
  ])

  const reminders: Reminder[] = []

  for (const task of tasks) {
    const days = daysUntil(task.nextDue)
    if (days <= 7) reminders.push({ title: task.title, date: task.nextDue, kind: 'maintenance', days })
  }
  for (const warranty of warranties) {
    const days = daysUntil(warranty.expiryDate)
    if (days <= 30) reminders.push({ title: warranty.title, date: warranty.expiryDate, kind: 'warranty', days })
  }
  for (const document of documents) {
    if (!document.expiryDate) continue
    const days = daysUntil(document.expiryDate)
    if (days <= 30) reminders.push({ title: document.title, date: document.expiryDate, kind: 'document', days })
  }

  return reminders.sort((a, b) => a.days - b.days)
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export async function maybeSendReminder(): Promise<void> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  const settings = await db.settings.get('app')
  if (!settings?.reminderNotifications) return
  if (localStorage.getItem(REMINDER_KEY) === todayISO()) return

  const reminders = await getDueReminders()
  if (reminders.length === 0) return

  const first = reminders[0]
  const when = first.days < 0 ? 'is overdue' : first.days === 0 ? 'is due today' : `is due in ${first.days} days`
  const extra = reminders.length > 1 ? ` ${reminders.length - 1} more item${reminders.length === 2 ? '' : 's'} need attention.` : ''

  new Notification('HouseSphere reminders', {
    body: `${first.title} ${when}.${extra}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'housesphere-daily',
  })

  localStorage.setItem(REMINDER_KEY, todayISO())
}
