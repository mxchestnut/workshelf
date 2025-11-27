import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Use URL-based resolution to avoid Node.js type dependencies

// https://vitejs.dev/config/
// Force rebuild: 2025-11-09
const rootDir = new URL('.', import.meta.url).pathname

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          matrix: ['matrix-js-sdk'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'],
          epub: ['react-reader', 'epubjs'],
          lucide: ['lucide-react']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
