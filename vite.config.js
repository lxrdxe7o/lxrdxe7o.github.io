import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // For lxrdxe7o.github.io (user site), use '/'
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
