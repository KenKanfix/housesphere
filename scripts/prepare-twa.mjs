import { spawnSync } from 'node:child_process'
import { copyFile, mkdir } from 'node:fs/promises'

await mkdir('android', { recursive: true })
await copyFile('twa-manifest.json', 'android/twa-manifest.json')

const result = spawnSync(
  'bubblewrap',
  ['update', '--skipVersionUpgrade', '--manifest', './android/twa-manifest.json', '--directory', './android'],
  { stdio: 'inherit', shell: process.platform === 'win32' },
)

if (result.error) throw result.error
process.exit(result.status ?? 1)
