import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/node_modules/react/') || normalized.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (normalized.includes('/node_modules/three/')) {
            return 'three-vendor';
          }
          return undefined;
        }
      }
    }
  }
});
