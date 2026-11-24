import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const FOLDER_KEY = 'housesphere:backup-folder'
const DEFAULT_FOLDER = 'HouseSphere/Backups'

export function nativeBackupsAvailable(): boolean {
  return Capacitor.isNativePlatform()
}

export function getNativeBackupFolder(): string {
  try {
    return localStorage.getItem(FOLDER_KEY)?.trim() || DEFAULT_FOLDER
  } catch {
    return DEFAULT_FOLDER
  }
}

export function setNativeBackupFolder(folder: string): string {
  const parts = folder
    .replace(/\\/g, '/')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
  const value = parts.join('/') || DEFAULT_FOLDER
  try {
    localStorage.setItem(FOLDER_KEY, value)
  } catch {
    return value
  }
  return value
}

export async function saveBackupNative(filename: string, content: string): Promise<string | null> {
  if (!nativeBackupsAvailable()) return null
  const folder = getNativeBackupFolder()
  try {
    const result = await Filesystem.writeFile({
      path: `${folder}/${filename}`,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    return result.uri
  } catch {
    return null
  }
}

export async function shareBackupNative(filename: string, uri: string): Promise<boolean> {
  if (!nativeBackupsAvailable()) return false
  try {
    await Share.share({ title: filename, files: [uri], dialogTitle: 'Save HouseSphere backup' })
    return true
  } catch {
    return false
  }
}
