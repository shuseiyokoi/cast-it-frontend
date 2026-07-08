import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Backend URL can be overridden: CAST_IT_API_URL=http://localhost:32768 npm run dev
const backend = process.env.CAST_IT_API_URL ?? 'http://localhost:8000'

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/, not the domain root.
  base: process.env.VITE_STATIC_SNAPSHOT === 'true' ? '/cast-it-frontend/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/media': { target: backend, changeOrigin: true },
    },
  },
})
