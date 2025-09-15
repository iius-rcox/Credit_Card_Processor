import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        // Disable HMR in production builds
        isProduction: process.env.NODE_ENV === 'production'
      }
    }
  })],
  define: {
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.DOCKER_ENV ? 'http://backend:8000' : 'http://localhost:8000',
        changeOrigin: false,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Set host header to match the backend's trusted hosts configuration
            // This fixes the "Invalid host header" error from TrustedHostMiddleware
            proxyReq.setHeader('host', 'localhost:8000');
            
            // Preserve all headers, especially authentication headers
            if (req.headers['x-dev-user']) {
              proxyReq.setHeader('x-dev-user', req.headers['x-dev-user']);
            }
            // Preserve Windows authentication headers
            if (req.headers['remote-user']) {
              proxyReq.setHeader('remote-user', req.headers['remote-user']);
            }
            if (req.headers['x-remote-user']) {
              proxyReq.setHeader('x-remote-user', req.headers['x-remote-user']);
            }
            // Preserve any other authentication headers
            Object.keys(req.headers).forEach(header => {
              if (header.startsWith('x-') || header === 'authorization' || header.includes('user')) {
                proxyReq.setHeader(header, req.headers[header]);
              }
            });
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    target: 'es2020',
    cssCodeSplit: true,
    // Ensure clean production build
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'pinia'],
          components: [
            './src/components/FileUpload.vue',
            './src/components/ProgressTracker.vue',
          ],
          results: [
            './src/components/ResultsDisplay.vue',
            './src/components/ExportActions.vue',
          ],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: [
          'console.log',
          'console.info',
          'console.debug',
          'console.warn',
        ],
      },
      mangle: {
        safari10: true,
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.js',
        '**/*.spec.js',
        'src/main.js',
        'dist/**',
      ],
      include: ['src/**/*.{js,vue}'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
})
