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
          // TEMPORARY FIX: Simplified chunking to avoid React loading issues
          // Only split out the HUGE AI libraries

          if (id.includes('@mediapipe/tasks-vision')) {
            return 'mediapipe-vendor';
          }

          if (id.includes('@tensorflow/tfjs')) {
            return 'tensorflow-vendor';
          }

          // Keep everything else (including React) in the main vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
