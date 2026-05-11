import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
// @ts-ignore - virtual module from router plugin
import router from '@tanstack/router-plugin/vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    router(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },
  build: {
    target: 'ES2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three'],
          'r3f-vendor': ['@react-three/fiber', '@react-three/drei'],
          'router-vendor': ['@tanstack/react-router'],
          'motion-vendor': ['framer-motion'],
        },
      },
    },
  },
})