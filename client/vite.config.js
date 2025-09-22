import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useHttps = env.HTTPS === 'true' || env.HTTPS === '1'
  let https = false
  if (useHttps) {
    try {
      const keyPath = env.SSL_KEY_PATH
      const certPath = env.SSL_CERT_PATH
      if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        https = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath)
        }
      } else {
        https = true // self-signed by Vite
      }
    } catch {
      https = true
    }
  }
  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      https
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            tfjs: ['@tensorflow/tfjs-core', '@tensorflow/tfjs-converter', '@tensorflow/tfjs-backend-webgl'],
            mediapipe: ['@mediapipe/hands', '@mediapipe/camera_utils'],
            vendor: ['react', 'react-dom', 'react-router-dom', 'socket.io-client', 'lucide-react']
          }
        }
      },
      chunkSizeWarningLimit: 2000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    }
  }
})


