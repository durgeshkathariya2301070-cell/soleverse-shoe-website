import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind CSS v4 is added as a Vite plugin (no tailwind.config.js or postcss.config.js needed).
// Design tokens live in src/index.css inside the @theme block.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
