const USER_ID_KEY = 'housesphere:app-user-id'

export function getAppUserId(): string {
  try {
    const existing = localStorage.getItem(USER_ID_KEY)
    if (existing) return existing
    const id = `u_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
    localStorage.setItem(USER_ID_KEY, id)
    return id
  } catch {
    return `u_${Date.now().toString(36)}`
  }
}
