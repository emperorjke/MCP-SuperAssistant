import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Read manifest to get entry points
const manifest = JSON.parse(readFileSync('./public/manifest.json', 'utf8'));

export default defineConfig({
  plugins: [react()],
  
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Content script entry
        'content/index': resolve(__dirname, 'src/content-script-init.ts'),
        
        // Background script entry
        'background/index': resolve(__dirname, 'src/background.ts'),
        
        // Popup entry
        'popup/index': resolve(__dirname, 'src/popup/index.html'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.tsx'),
      },
      
      output: {
        format: 'iife',
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name.includes('content')) {
            return 'content/[name].iife.js';
          }
          if (chunkInfo.name.includes('background')) {
            return 'background/[name].iife.js';
          }
          if (chunkInfo.name.includes('popup')) {
            return 'popup/[name].js';
          }
          return '[name].js';
        },
        
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            if (assetInfo.name.includes('content')) {
              return 'content/style.css';
            }
            if (assetInfo.name.includes('popup')) {
              return 'popup/style.css';
            }
          }
          return 'assets/[name].[hash][extname]';
        },
      },
    },
    
    // Optimize for Chrome extension
    target: 'chrome88',
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV === 'development',
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  // Special handling for Chrome extension development
  server: {
    port: 3000,
    hmr: {
      port: 3001,
    },
  },

  // Ensure proper module resolution for Chrome extension
  esbuild: {
    target: 'chrome88',
  },
});