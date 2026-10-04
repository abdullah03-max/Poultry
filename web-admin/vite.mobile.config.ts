import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-mobile-to-index',
      closeBundle() {
        const outDir = path.resolve(__dirname, '../mobile-worker/android/app/src/main/assets/www');
        const mobileHtml = path.join(outDir, 'mobile.html');
        const indexHtml = path.join(outDir, 'index.html');
        if (fs.existsSync(mobileHtml)) {
          fs.copyFileSync(mobileHtml, indexHtml);
        }
      },
    },
  ],
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../mobile-worker/android/app/src/main/assets/www'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'mobile.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});
