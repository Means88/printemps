import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()], build: { rollupOptions: { output: { format: 'cjs' } } } },
  renderer: { server:{watch:{ignored:['**/.venv/**','**/.cache/**','**/.runtime/**','**/release/**']}}, root: '.', publicDir: 'public', plugins: [react(), tailwindcss()], build: { rollupOptions: { input: 'index.html' } } }
})
