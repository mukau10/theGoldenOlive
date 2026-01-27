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
  build: {
    chunkSizeWarningLimit: 1000,
    // Disable code splitting completely to avoid React 19 Activity error
    // This prevents the React 19 Activity error that occurs with dynamic imports
    rollupOptions: {
      output: {
        inlineDynamicImports: true, // Inline all dynamic imports into single bundle
        format: 'es', // Keep ES modules format
        // Optimize file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Enable minification with esbuild (faster than terser)
    minify: 'esbuild',
    // Source maps for production debugging (can be disabled for smaller builds)
    sourcemap: false,
    // Target modern browsers to avoid eval polyfills
    target: 'es2015',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-i18next',
    ],
  },
})
