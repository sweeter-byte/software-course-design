import { createRequire } from 'node:module'
import path from 'node:path'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const reactPath = path.dirname(require.resolve('react/package.json'))
const reactDomPath = path.dirname(require.resolve('react-dom/package.json'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: reactPath,
      'react-dom': reactDomPath,
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    // Ship source maps to production so the in-page RootErrorBoundary's
    // stack trace (and browser devtools) point at real .tsx files instead
    // of minified `index-*.js` offsets. Acceptance testers can screenshot
    // the readable stack frames straight from the error overlay.
    sourcemap: true,
  },
})
