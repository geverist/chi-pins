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
        // Strip console.log and console.info in production for performance
        // Keep console.error and console.warn for debugging
        drop_console: true,
        pure_funcs: ['console.log', 'console.info']
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
