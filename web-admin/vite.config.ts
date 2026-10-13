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

          // 3. Worker App: dist/chicken-worker/index.html & dist/chicken-worker.html
          const cwDir = resolve(distDir, 'chicken-worker');
          if (!fs.existsSync(cwDir)) fs.mkdirSync(cwDir, { recursive: true });
          fs.copyFileSync(indexHtml, resolve(cwDir, 'index.html'));
          fs.copyFileSync(indexHtml, resolve(distDir, 'chicken-worker.html'));

          // 4. Also alias chicken-shop-worker
          const cwDir2 = resolve(distDir, 'chicken-shop-worker');
          if (!fs.existsSync(cwDir2)) fs.mkdirSync(cwDir2, { recursive: true });
          fs.copyFileSync(indexHtml, resolve(cwDir2, 'index.html'));
          fs.copyFileSync(indexHtml, resolve(distDir, 'chicken-shop-worker.html'));

          console.log('[Vite Build] Successfully generated static route files for /chicken-management and /chicken-worker');
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
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', '@supabase/supabase-js'],
  },
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
