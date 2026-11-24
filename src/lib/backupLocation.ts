const DB_NAME = 'housesphere-backup-location'
const STORE = 'handles'
const KEY = 'folder'

export interface BackupFolder {
  name: string
  handle: FileSystemDirectoryHandle
}

interface PermissionHandle extends FileSystemDirectoryHandle {
  queryPermission?: (options: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (options: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
}

interface DirectoryPickerOptions {
  mode?: 'read' | 'readwrite'
}

type DirectoryPicker = (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function folderPickerAvailable(): boolean {
  return typeof window !== 'undefined' && typeof (window as Window & { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker === 'function'
}

export async function getBackupFolder(): Promise<BackupFolder | null> {
  try {
    const db = await openDb()
    const value = await new Promise<BackupFolder | null>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      request.onsuccess = () => resolve((request.result as BackupFolder | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return value
  } catch {
    return null
  }
}

export async function setBackupFolder(handle: FileSystemDirectoryHandle): Promise<BackupFolder> {
  const value: BackupFolder = { name: handle.name, handle }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
  db.close()
  return value
}

export async function clearBackupFolder(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    db.close()
  } catch {
    return
  }
}

export async function pickBackupFolder(): Promise<BackupFolder | null> {
  const picker = (window as Window & { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker
  if (!picker) return null
  try {
    const handle = await picker.call(window, { mode: 'readwrite' })
    return await setBackupFolder(handle)
  } catch {
    return null
  }
}

async function ensurePermission(handle: PermissionHandle): Promise<boolean> {
  if (typeof handle.queryPermission !== 'function' || typeof handle.requestPermission !== 'function') return true
  try {
    if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
  } catch {
    return false
  }
}

export async function writeBackupToFolder(filename: string, content: string): Promise<boolean> {
  const folder = await getBackupFolder()
  if (!folder) return false
  if (!(await ensurePermission(folder.handle as PermissionHandle))) return false
  try {
    const fileHandle = await folder.handle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return true
  } catch {
    return false
  }
}
