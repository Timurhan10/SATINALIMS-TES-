import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages alt yolu: https://timurhan10.github.io/SATINALIMS-TES-/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
