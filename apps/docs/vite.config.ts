import mdx from '@mdx-js/rollup'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tanstackStart({
      srcDirectory: 'app',
    }),
    viteReact(),
    mdx({
      remarkPlugins: [],
      rehypePlugins: [],
    }),
  ],
  build: {
    rollupOptions: {
      external: ['/pagefind/pagefind.js'],
    },
  },
})
