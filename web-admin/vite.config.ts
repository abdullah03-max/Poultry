import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

// Plugin to generate physical route files in dist for Vercel & static hosting
function copyChickenRoutesPlugin() {
  return {
    name: 'copy-chicken-routes',
    closeBundle() {
      try {
        const distDir = resolve(__dirname, 'dist');
        const indexHtml = resolve(distDir, 'index.html');
        if (fs.existsSync(indexHtml)) {
          // 1. Create dist/chicken-management/index.html & dist/chicken-management.html
          const cmDir = resolve(distDir, 'chicken-management');
          if (!fs.existsSync(cmDir)) fs.mkdirSync(cmDir, { recursive: true });
          fs.copyFileSync(indexHtml, resolve(cmDir, 'index.html'));
          fs.copyFileSync(indexHtml, resolve(distDir, 'chicken-management.html'));

          // 2. Also alias chiken-mangement
          const cmDir2 = resolve(distDir, 'chiken-mangement');
          if (!fs.existsSync(cmDir2)) fs.mkdirSync(cmDir2, { recursive: true });
          fs.copyFileSync(indexHtml, resolve(cmDir2, 'index.html'));
          fs.copyFileSync(indexHtml, resolve(distDir, 'chiken-mangement.html'));

          console.log('[Vite Build] Successfully generated static route files for /chicken-management');
        }
      } catch (e) {
        console.warn('[Vite Build] Could not copy route files:', e);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), copyChickenRoutesPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mobile: resolve(__dirname, 'mobile.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-leaflet': ['leaflet'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
