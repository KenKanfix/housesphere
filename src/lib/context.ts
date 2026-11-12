import {
  categoryLabel,
  db,
  EXPENSE_CATEGORIES,
  formatDate,
  formatMoney,
  todayISO,
  type ExpenseCategory,
} from './db'

export async function buildHouseholdContext(): Promise<string> {
  const [settings, rooms, items, warranties, tasks, projects, documents, expenses, providers] = await Promise.all([
    db.settings.get('app'),
    db.rooms.toArray(),
    db.items.toArray(),
    db.warranties.toArray(),
    db.maintenance.toArray(),
    db.projects.toArray(),
    db.documents.toArray(),
    db.expenses.toArray(),
    db.providers.toArray(),
  ])

  const currency = settings?.currency ?? 'AUD'
  const money = (value: number) => formatMoney(value, currency)
  const roomName = (id: string) => rooms.find((room) => room.id === id)?.name ?? 'Unassigned'
  const itemName = (id?: string) => items.find((item) => item.id === id)?.name ?? 'Unknown item'
  const providerName = (id?: string) => providers.find((provider) => provider.id === id)?.name ?? ''

  const lines: string[] = []
  lines.push(`Household: ${settings?.householdName ?? 'My Home'} (currency ${currency})`)
  lines.push(`Today: ${todayISO()}`)

  lines.push(`\nINVENTORY (${items.length} items):`)
  for (const item of items.slice(0, 40)) {
    const warranty = warranties
      .filter((entry) => entry.itemId === item.id)
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0]
    lines.push(
      `- ${item.name} | ${roomName(item.roomId)} | ${item.category}${item.brand ? ` | ${item.brand}` : ''}${
        item.model ? ` ${item.model}` : ''
      }${item.serial ? ` | serial ${item.serial}` : ''}${item.price !== undefined ? ` | ${money(item.price)}` : ''}${
        warranty ? ` | warranty ends ${warranty.expiryDate}` : ''
      }`,
    )
  }

  const upcomingWarranties = warranties
    .slice()
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
    .slice(0, 10)
  if (upcomingWarranties.length > 0) {
    lines.push(`\nWARRANTIES (${warranties.length}):`)
    for (const warranty of upcomingWarranties) {
      lines.push(
        `- ${warranty.title} | item: ${warranty.itemId ? itemName(warranty.itemId) : 'unlinked'} | expires ${warranty.expiryDate}${
          warranty.provider ? ` | ${warranty.provider}` : ''
        }`,
      )
    }
  }

  const upcomingTasks = tasks.slice().sort((a, b) => a.nextDue.localeCompare(b.nextDue)).slice(0, 12)
  if (upcomingTasks.length > 0) {
    lines.push(`\nMAINTENANCE (${tasks.length} tasks):`)
    for (const task of upcomingTasks) {
      lines.push(
        `- ${task.title} | ${task.category} | every ${task.intervalDays} days | next due ${task.nextDue}${
          task.lastCompleted ? ` | last done ${task.lastCompleted}` : ''
        }${task.providerId ? ` | ${providerName(task.providerId)}` : ''}`,
      )
    }
  }

  if (projects.length > 0) {
    lines.push(`\nPROJECTS (${projects.length}):`)
    for (const project of projects) {
      const spent = expenses.filter((expense) => expense.projectId === project.id).reduce((sum, expense) => sum + expense.amount, 0)
      lines.push(
        `- ${project.title} | ${project.status} | budget ${project.budget !== undefined ? money(project.budget) : 'not set'} | spent ${money(
          spent,
        )}${project.targetDate ? ` | target ${project.targetDate}` : ''}`,
      )
    }
  }

  const docsWithExpiry = documents
    .filter((document) => document.expiryDate)
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''))
    .slice(0, 10)
  if (docsWithExpiry.length > 0) {
    lines.push(`\nDOCUMENTS (${documents.length}):`)
    for (const document of docsWithExpiry) {
      lines.push(`- ${document.title} | ${document.type} | expires ${document.expiryDate}${document.issuer ? ` | ${document.issuer}` : ''}`)
    }
  } else if (documents.length > 0) {
    lines.push(`\nDOCUMENTS: ${documents.map((document) => document.title).join(', ')}`)
  }

  const thisYear = todayISO().slice(0, 4)
  const thisMonth = todayISO().slice(0, 7)
  const thisMonthExpenses = expenses.filter((expense) => expense.date.startsWith(thisMonth))
  const yearExpenses = expenses.filter((expense) => expense.date.startsWith(thisYear))
  const byCategory = new Map<ExpenseCategory, number>()
  for (const expense of thisMonthExpenses) {
    byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amount)
  }
  lines.push(
    `\nEXPENSES: this month ${money(thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0))}, this year ${money(
      yearExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    )}.`,
  )
  if (byCategory.size > 0) {
    lines.push(
      `This month by category: ${[...byCategory.entries()]
        .map(([category, total]) => `${categoryLabel(EXPENSE_CATEGORIES, category)} ${money(total)}`)
        .join(', ')}.`,
    )
  }

  if (providers.length > 0) {
    lines.push(`\nTRUSTED TRADES (${providers.length}):`)
    for (const provider of providers) {
      lines.push(
        `- ${provider.name} | ${provider.trade}${provider.phone ? ` | ${provider.phone}` : ''}${provider.rating ? ` | ${provider.rating}/5` : ''}`,
      )
    }
  }

  lines.push(`\nFull record dates are ISO format. Answer using this data only where relevant.`)
  return lines.join('\n')
}

export function summariseAttention(warrantyDates: string[], taskDates: string[], documentDates: string[]): number {
  const soon = (date: string) => {
    const target = new Date(`${date}T00:00:00`).getTime()
    const today = new Date(`${todayISO()}T00:00:00`).getTime()
    return Math.round((target - today) / 86_400_000) <= 30
  }
  return [...warrantyDates, ...taskDates, ...documentDates].filter(soon).length
}

export function formatContextDate(date: string): string {
  return formatDate(date)
}
