import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Served from a custom domain (snt.marcus-ma.com) at the root, not
  // nested under /HaveYouSaidThx/ the way the default github.io URL is.
  base: '/',
  plugins: [react()],
})
