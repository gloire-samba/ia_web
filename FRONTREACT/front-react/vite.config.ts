import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import checker from 'vite-plugin-checker'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Le plugin qui affiche les erreurs TypeScript dans le terminal
    checker({
      typescript: true,
    })
  ],
  server: {
    host: true, // Autorise Docker à exposer le port
    port: 5173,
    watch: {
      usePolling: true, // Permet le hot-reload dans Docker
    }
  },
  // L'exclusion qui empêche le plantage au démarrage
  optimizeDeps: {
    exclude: ['npm-run-path', 'unicorn-magic']
  }
})