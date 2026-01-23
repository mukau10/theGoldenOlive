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
  // Disable all code splitting - everything in one bundle
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        // Force everything into one chunk
        inlineDynamicImports: true
      }
    }
  }
})
