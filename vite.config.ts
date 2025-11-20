import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 3000,
    open: true,
  },
  // Ensure proper routing for SPA
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
