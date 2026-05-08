import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import remarkGfm from 'remark-gfm'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

const config = defineConfig({
  plugins: [
    nitro(),
    viteTsConfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkGfm],
      }),
    },
    tanstackStart(),
    viteReact(),
  ],
})

export default config
