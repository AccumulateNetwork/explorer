import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

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
    nodePolyfills({
      // Enable polyfills for specific Node.js modules
      include: ['buffer', 'process', 'stream', 'util'],
      // Make Buffer available globally
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],

  build: {
    outDir: 'build',
    // The local-wallet build is embedded into the wallet binary, so skip
    // sourcemaps there (~22MB) to keep the binary small. Otherwise emit them
    // 'hidden': generated for local debugging and Sentry, but not referenced
    // from the bundle. They are excluded from the production rsync as well —
    // they were being served publicly with full sourcesContent (#48).
    sourcemap: process.env.VITE_WALLET === 'local' ? false : 'hidden',
    // Restored to something that warns. Raised to 2048 while minification
    // was off; a real chunk should not reach half a megabyte.
    chunkSizeWarningLimit: 500,
    target: 'chrome90', // Very specific target to avoid decorator issues
    // Minification was disabled during the SDK decorator work. Decorators
    // are lowered by @babel/plugin-proposal-decorators before esbuild sees
    // them, so it is safe — verified against the wallet, signing and
    // account/transaction pages (#48).
    minify: 'esbuild',
    commonjsOptions: {
      transformMixedEsModules: true,
    },

    rollupOptions: {
      output: {
        manualChunks: {
          preload: ['./src/preload.js'],
          'vendor-sdk': ['accumulate.js'],
          'vendor-antd': ['antd', '@ant-design/icons', 'rc-field-form'],
          'vendor-highlight': ['react-syntax-highlighter'],
          // factom is deliberately not listed: naming it here puts it in the
          // initial graph, which defeats the dynamic import in SearchForm
          // (#54). Let Rollup split it at the import boundary instead.
          // @web3modal/ethers is deliberately not listed, for the same
          // reason as factom: naming it keeps it in the initial graph and
          // defeats the dynamic import in WalletConnect (#49).
          'vendor-web3': [
            'ethers',
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

    // Loopback only. The dev server proxies /v1 to a locally running wallet
    // (below), and that API's entire auth model is same-origin with a
    // per-run session token — binding every interface hands anyone on the
    // LAN a mintable token and, with auto-connect keeping the vault
    // unlocked, the ability to sign and send without a passphrase (#58).
    // Set VITE_DEV_HOST=0.0.0.0 deliberately for mobile testing.
    host: process.env.VITE_DEV_HOST || '127.0.0.1',

    watch: {
      useFsEvents: true,
    },

    // Proxy wallet API calls to a locally running `ccli webui` so the dev
    // server behaves like the embedded (same-origin) release build.
    // Override the target with WALLET_API (e.g. a custom --addr).
    proxy: {
      '/v1': {
        target: process.env.WALLET_API || 'http://127.0.0.1:8437',
        changeOrigin: false,
      },
    },
  },

  optimizeDeps: {
    esbuildOptions: {
      tsconfig: './tsconfig.json',
      target: 'es2020',
    },
    // exclude: ['accumulate.js'],
  },

  esbuild: {
    target: 'chrome90',
  },
});
