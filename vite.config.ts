import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',  // Important for Electron - use relative paths
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
