import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'es2020',
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy /api/* to Vercel dev (run `vercel dev` on port 3001 separately)
      // or point to your deployed Vercel URL during local development
      '/api': {
        target: 'https://low-cortisol-news.vercel.app',
        changeOrigin: true,
      },
    },
  },
});
