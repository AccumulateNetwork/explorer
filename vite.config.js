import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { version: '2023-11' }],
        ],
      },
    }),
  ],

  build: {
    outDir: 'build',
  },

  server: {
    // this ensures that the browser opens upon server start
    open: true,
    // this sets a default port to 3000
    port: 3000,

    host: '0.0.0.0',

    watch: {
      useFsEvents: true,
    },
  },

  optimizeDeps: {
    esbuildOptions: {
      tsconfig: './tsconfig.json',
    },
    // exclude: ['accumulate.js'],
  },
});
