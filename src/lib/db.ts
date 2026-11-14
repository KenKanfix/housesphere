import Dexie, { type EntityTable } from 'dexie'

export type ItemCategory = 'Appliance' | 'Furniture' | 'Electronics' | 'Tools' | 'Outdoor' | 'Other'
export type MaintenanceCategory = 'HVAC' | 'Plumbing' | 'Electrical' | 'Safety' | 'Exterior' | 'Garden' | 'General'
export type ExpenseCategory =
  | 'electricity'
  | 'gas'
  | 'water'
  | 'maintenance'
  | 'appliance'
  | 'insurance'
  | 'project'
  | 'other'
export type DocumentType = 'insurance' | 'building' | 'inspection' | 'manual' | 'invoice' | 'other'
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed'

export interface Room {
  id: string
  name: string
  createdAt: number
}

export interface Item {
  id: string
  name: string
  roomId: string
  category: ItemCategory
  brand?: string
  model?: string
  serial?: string
  purchaseDate?: string
  price?: number
  photo?: string
  receipt?: string
  warrantyExpiry?: string
  extendedWarrantyProvider?: string
  extendedWarrantyExpiry?: string
  extendedWarrantyCost?: number
  extendedWarrantyNotes?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export function latestWarrantyExpiry(item: Item): string | undefined {
  const dates = [item.warrantyExpiry, item.extendedWarrantyExpiry].filter((date): date is string => Boolean(date))
  if (dates.length === 0) return undefined
  return dates.reduce((latest, date) => (date > latest ? date : latest))
}

export interface Warranty {
  id: string
  title: string
  itemId?: string
  provider?: string
  purchaseDate?: string
  expiryDate: string
  receipt?: string
  fileName?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface MaintenanceTask {
  id: string
  title: string
  category: MaintenanceCategory
  intervalDays: number
  lastCompleted?: string
  nextDue: string
  estimatedCost?: number
  providerId?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface Project {
  id: string
  title: string
  status: ProjectStatus
  budget?: number
  startDate?: string
  targetDate?: string
  providerId?: string
  description?: string
  beforePhoto?: string
  afterPhoto?: string
  createdAt: number
  updatedAt: number
}

export interface HouseholdDocument {
  id: string
  title: string
  type: DocumentType
  issuer?: string
  reference?: string
  issueDate?: string
  expiryDate?: string
  amount?: number
  fileData?: string
  fileName?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface Expense {
  id: string
  date: string
  category: ExpenseCategory
  amount: number
  vendor?: string
  description?: string
  projectId?: string
  itemId?: string
  createdAt: number
  updatedAt: number
}

export interface RecurringBill {
  id: string
  name: string
  category: ExpenseCategory
  amount?: number
  frequencyDays: number
  nextDue: string
  lastPaid?: string
  provider?: string
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface BillPhoto {
  id: string
  billId: string
  kind: 'front' | 'back'
  data: string
  createdAt: number
}

export interface Provider {
  id: string
  name: string
  trade: string
  phone?: string
  email?: string
  website?: string
  address?: string
  notes?: string
  rating?: number
  createdAt: number
  updatedAt: number
}

export interface ServiceRecord {
  id: string
  providerId: string
  date: string
  description: string
  cost?: number
  createdAt: number
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

export interface AppSettings {
  id: 'app'
  householdName: string
  currency: string
  reminderNotifications: boolean
  createdAt: number
  updatedAt: number
}

class HouseSphereDB extends Dexie {
  rooms!: EntityTable<Room, 'id'>
  items!: EntityTable<Item, 'id'>
  warranties!: EntityTable<Warranty, 'id'>
  maintenance!: EntityTable<MaintenanceTask, 'id'>
  projects!: EntityTable<Project, 'id'>
  documents!: EntityTable<HouseholdDocument, 'id'>
  expenses!: EntityTable<Expense, 'id'>
  bills!: EntityTable<RecurringBill, 'id'>
  billPhotos!: EntityTable<BillPhoto, 'id'>
  providers!: EntityTable<Provider, 'id'>
  serviceRecords!: EntityTable<ServiceRecord, 'id'>
  aiMessages!: EntityTable<AiMessage, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('housesphere')
    this.version(1).stores({
      rooms: 'id, name',
      items: 'id, name, roomId, category, purchaseDate',
      warranties: 'id, itemId, expiryDate',
      maintenance: 'id, nextDue, category',
      projects: 'id, status, title',
      documents: 'id, type, expiryDate',
      expenses: 'id, date, category, projectId',
      providers: 'id, name, trade',
      serviceRecords: 'id, providerId, date',
      aiMessages: 'id, createdAt',
      settings: 'id',
    })
    this.version(2).stores({
      bills: 'id, nextDue, category',
    })
    this.version(3).stores({
      billPhotos: 'id, billId',
    })
  }
}

export const db = new HouseSphereDB()

export const DEFAULT_ROOMS = [
  'Kitchen',
  'Living Room',
  'Dining Room',
  'Bedroom',
  'Bathroom',
  'Laundry',
  'Study',
  'Garage',
  'Garden',
  'Other',
]

export const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'Appliance', label: 'Appliance' },
  { value: 'Furniture', label: 'Furniture' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Tools', label: 'Tools' },
  { value: 'Outdoor', label: 'Outdoor' },
  { value: 'Other', label: 'Other' },
]

export const MAINTENANCE_CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: 'HVAC', label: 'Heating & cooling' },
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Exterior', label: 'Exterior' },
  { value: 'Garden', label: 'Garden' },
  { value: 'General', label: 'General' },
]

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'electricity', label: 'Electricity' },
  { value: 'gas', label: 'Gas' },
  { value: 'water', label: 'Water' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'appliance', label: 'Appliance' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'project', label: 'Project' },
  { value: 'other', label: 'Other' },
]

export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'insurance', label: 'Insurance' },
  { value: 'building', label: 'Building & property' },
  { value: 'inspection', label: 'Inspection report' },
  { value: 'manual', label: 'Manual' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other', label: 'Other' },
]

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
]

export const TRADES = [
  'Electrician',
  'Plumber',
  'Builder',
  'HVAC technician',
  'Gardener',
  'Cleaner',
  'Handyman',
  'Painter',
  'Roofer',
  'Other',
]

export const INTERVAL_OPTIONS = [
  { label: 'Monthly', days: 30 },
  { label: 'Every 3 months', days: 90 },
  { label: 'Every 6 months', days: 180 },
  { label: 'Yearly', days: 365 },
  { label: 'Every 2 years', days: 730 },
]

export const BILL_FREQUENCIES = [
  { label: 'Weekly', days: 7 },
  { label: 'Fortnightly', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Quarterly', days: 91 },
  { label: 'Half-yearly', days: 182 },
  { label: 'Yearly', days: 365 },
]

export const CURRENCIES = [
  { code: 'AUD', label: 'AUD — Australian dollar' },
  { code: 'NZD', label: 'NZD — New Zealand dollar' },
  { code: 'USD', label: 'USD — US dollar' },
  { code: 'GBP', label: 'GBP — British pound' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'CAD', label: 'CAD — Canadian dollar' },
]

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function now(): number {
  return Date.now()
}

export function todayISO(): string {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function toISODate(date: Date): string {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function addDaysISO(days: number, from: string = todayISO()): string {
  const date = new Date(`${from}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function daysUntil(isoDate?: string): number {
  if (!isoDate) return Number.POSITIVE_INFINITY
  const target = new Date(`${isoDate}T00:00:00`)
  const today = new Date(`${todayISO()}T00:00:00`)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function formatDate(isoDate?: string, style: 'short' | 'long' = 'short'): string {
  if (!isoDate) return '—'
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  }).format(date)
}

export function formatMoney(amount: number | undefined, currency = 'AUD', compact = false): string {
  const value = amount ?? 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: compact && Math.abs(value) >= 10_000 ? 'compact' : 'standard',
      maximumFractionDigits: compact && Math.abs(value) >= 10_000 ? 1 : 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function formatDue(isoDate?: string): string {
  if (!isoDate) return 'No date'
  const days = daysUntil(isoDate)
  if (!Number.isFinite(days)) return 'No date'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days < 0) return `${Math.abs(days)} days ago`
  if (days < 31) return `in ${days} days`
  return formatDate(isoDate)
}

export function dueStatus(isoDate?: string): 'overdue' | 'soon' | 'ok' {
  const days = daysUntil(isoDate)
  if (days < 0) return 'overdue'
  if (days <= 30) return 'soon'
  return 'ok'
}

export function categoryLabel<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value
}

export function intervalLabel(days: number): string {
  const match = INTERVAL_OPTIONS.find((option) => option.days === days)
  if (match) return match.label
  if (days === 1) return 'Daily'
  if (days === 7) return 'Weekly'
  return `Every ${days} days`
}

export function frequencyToDays(value?: string): number {
  const key = (value ?? '').trim().toLowerCase()
  if (!key) return 30
  if (key.includes('fortnight') || (key.includes('week') && key.includes('2'))) return 14
  if (key.includes('week')) return 7
  if (key.includes('quarter') || key.includes('3 month') || key.includes('three month')) return 91
  if (key.includes('half') || key.includes('semi') || key.includes('biannual') || key.includes('6 month') || key.includes('six month')) return 182
  if (key.includes('biennial') || key.includes('2 year') || key.includes('two year')) return 730
  if (key.includes('year') || key.includes('annual') || key.includes('12 month')) return 365
  return 30
}

export function billFrequencyLabel(days: number): string {
  const match = BILL_FREQUENCIES.find((option) => option.days === days)
  if (match) return match.label
  return intervalLabel(days)
}

export function billPaymentsPerYear(frequencyDays: number): number {
  const table: Record<number, number> = { 7: 52, 14: 26, 30: 12, 91: 4, 182: 2, 365: 1 }
  if (table[frequencyDays] !== undefined) return table[frequencyDays]
  return frequencyDays > 0 ? 365 / frequencyDays : 12
}

export function yearlyBillCost(bill: RecurringBill): number {
  if (bill.amount === undefined) return 0
  return bill.amount * billPaymentsPerYear(bill.frequencyDays)
}

export function monthlyBillCost(bill: RecurringBill): number {
  return yearlyBillCost(bill) / 12
}

export async function ensureDefaults(): Promise<void> {
  const settingsCount = await db.settings.count()
  if (settingsCount === 0) {
    const timestamp = now()
    await db.settings.put({
      id: 'app',
      householdName: 'My Home',
      currency: 'AUD',
      reminderNotifications: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  const roomCount = await db.rooms.count()
  if (roomCount === 0) {
    await db.rooms.bulkAdd(
      DEFAULT_ROOMS.map((name, index) => ({
        id: uid(),
        name,
        createdAt: now() + index,
      })),
    )
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function compressImage(file: File, maxSize = 1400, quality = 0.78): Promise<string> {
  if (!file.type.startsWith('image/')) return fileToDataUrl(file)
  const dataUrl = await fileToDataUrl(file)

  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        resolve(dataUrl)
        return
      }
      context.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
}

export function downloadFile(filename: string, content: string, type = 'application/json'): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function currentMonthKey(): string {
  return todayISO().slice(0, 7)
}
