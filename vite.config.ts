import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
  base: '/payslip-tracker/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          chartjs: ['chart.js', 'react-chartjs-2', 'chartjs-plugin-annotation'],
          pdfjs: ['pdfjs-dist'],
        },
      },
    },
  },
})
