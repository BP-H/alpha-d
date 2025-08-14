import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',           // ← ADD THIS (critical for Vercel)
  build: {
    outDir: 'dist',    // ← ADD THIS (tells Vercel where built files are)
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react';
            if (id.includes('three')) return 'three';
            return 'vendor';
          }
        }
      }
    }
  }
});
