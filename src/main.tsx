import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ensureDefaults } from './lib/db'

registerSW({ immediate: true })

async function start() {
  try {
    await ensureDefaults()
  } catch (error) {
    console.error('Could not prepare the local database', error)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start()
