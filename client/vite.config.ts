import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  css: {
    postcss: {
      from: undefined,
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
})