import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import stripConsolePlugin from './vite-plugin-strip-console.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    stripConsolePlugin() // Strip console.log in production builds for performance
  ],
  build: {
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large vendor libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'map-vendor': ['leaflet', 'react-leaflet'],
          'ai-vendor': ['@mediapipe/tasks-vision', '@tensorflow/tfjs'],
        }
      }
    }
  }
})
