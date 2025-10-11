import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        // Strip console.log, console.info, and console.debug in production
        // Keep console.error and console.warn for critical debugging
        drop_console: false, // Don't drop all, be selective
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true // Fix Safari 10 bugs
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'ai-vendor': ['@mediapipe/tasks-vision', '@tensorflow/tfjs'],
        }
      }
    }
  }
})
