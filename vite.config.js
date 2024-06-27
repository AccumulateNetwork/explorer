import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        targets: [
          'last 5 chrome version',
          'last 5 firefox version',
          'last 5 safari version',
        ],
        plugins: [
          ['@babel/plugin-proposal-decorators', { version: '2023-11' }],
        ],
      },
    }),
  ],

  //build.rollupOptions.output.manualChunks
  build: {
    outDir: 'build',
    sourcemap: true,
    chunkSizeWarningLimit: 2048,

    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-sdk': ['accumulate.js'],
          'vendor-antd': ['antd', '@ant-design/icons', 'rc-field-form'],
          'vendor-highlight': ['react-syntax-highlighter'],
          'vendor-factom': ['factom'],
          'vendor-web3-main': ['web3'],
          'vendor-web3-other': [
            '@metamask/providers',
            '@web3-react/core',
            '@web3-react/injected-connector',
            'eth-sig-util',
            'ethereumjs-util',
            'secp256k1',
          ],
        },
      },
    },
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
