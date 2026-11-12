import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { handleAiRequest } from './server/aiHandler.ts'

function localAiApi(env: Record<string, string>) {
  return {
    name: 'housesphere-local-ai-api',
    configureServer(server: { middlewares: { use: (path: string, fn: unknown) => void } }) {
      server.middlewares.use('/api/ai', (req: any, res: any) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }

        if (req.method === 'GET') {
          send(200, { configured: Boolean(env.OPENAI_API_KEY), model: env.OPENAI_MODEL || 'gpt-4o-mini' })
          return
        }
        if (req.method !== 'POST') {
          send(405, { error: 'Method not allowed' })
          return
        }

        let raw = ''
        req.on('data', (chunk: { toString: () => string }) => {
          raw += chunk.toString()
        })
        req.on('end', async () => {
          try {
            const body = JSON.parse(raw || '{}')
            const result = await handleAiRequest(body, {
              OPENAI_API_KEY: env.OPENAI_API_KEY,
              OPENAI_MODEL: env.OPENAI_MODEL,
              OPENAI_BASE_URL: env.OPENAI_BASE_URL,
            })
            send(result.status, result.body)
          } catch {
            send(400, { error: 'Invalid request body' })
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      localAiApi(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'HouseSphere — Your home, in one place',
          short_name: 'HouseSphere',
          description:
            'Manage your home inventory, warranties, maintenance, projects, documents, expenses and trusted trades in one place.',
          id: '/',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f4f2ec',
          theme_color: '#0f766e',
          categories: ['productivity', 'lifestyle', 'utilities'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Add inventory item', short_name: 'Inventory', url: '/inventory?new=1', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
            { name: 'Ask the AI assistant', short_name: 'Assistant', url: '/assistant', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: [/^\/api\//, /^\/\.well-known\//],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: {
      host: true,
    },
  }
})
