export function trimmed(value: string): string | undefined {
  const result = value.trim()
  return result.length > 0 ? result : undefined
}

export function toNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
