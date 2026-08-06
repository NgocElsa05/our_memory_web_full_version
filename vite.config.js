import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Build id đổi mỗi lần deploy — iOS PWA dùng để tự reload khi có bản mới */
const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function versionJsonPlugin() {
  const payload = JSON.stringify(
    { buildId, builtAt: new Date().toISOString() },
    null,
    0
  )

  return {
    name: 'om-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: payload,
      })
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/version.json')) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(payload)
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
  },
  plugins: [react(), versionJsonPlugin()],
})
