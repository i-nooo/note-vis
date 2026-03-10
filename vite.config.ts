import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

function notionSyncPlugin(): Plugin {
  return {
    name: 'notion-sync-api',
    configureServer(server) {
      server.middlewares.use('/api/sync-notion', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        try {
          const handler = await import('./api/sync-notion.js')
          // Vercel-style req/res adapter
          const result = await new Promise<{ status: number; body: unknown }>((resolve) => {
            const fakeRes = {
              status(code: number) {
                return {
                  json(data: unknown) {
                    resolve({ status: code, body: data })
                  },
                }
              },
            }
            handler.default(req, fakeRes)
          })
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [viteReact(), tailwindcss(), notionSyncPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
