import mdx from '@mdx-js/rollup'
import { defineConfig } from '@tanstack/start/config'

export default defineConfig({
  server: {
    preset: 'static',
  },
  vite: {
    plugins: [
      mdx({
        remarkPlugins: [],
        rehypePlugins: [],
      }),
    ],
  },
})
