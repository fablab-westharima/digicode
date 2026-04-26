import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// CF Pages auto-injects CF_PAGES_COMMIT_SHA at build time (full 40-char SHA).
// Trim to 7 chars to match conventional short-SHA. Fallback 'dev' for local Vite dev.
const commitSha = (process.env.CF_PAGES_COMMIT_SHA || 'dev').slice(0, 7)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(commitSha),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/shared": path.resolve(__dirname, "../../../shared"),
    },
  },
})
