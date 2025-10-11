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
        manualChunks(id) {
          // Core vendors - always loaded
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }

          // Map libraries - loaded on main map view
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'map-vendor';
          }

          // Split AI libraries separately - these are HUGE
          if (id.includes('@mediapipe/tasks-vision')) {
            return 'mediapipe-vendor';
          }

          if (id.includes('@tensorflow/tfjs')) {
            return 'tensorflow-vendor';
          }

          // Supabase - used everywhere but can be separate
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor';
          }

          // OpenAI - only used in voice/AI features
          if (id.includes('node_modules/openai')) {
            return 'openai-vendor';
          }

          // Other large vendors
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
