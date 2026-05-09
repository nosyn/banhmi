import mdx from '@mdx-js/rollup'
import rehypeShiki from '@shikijs/rehype'
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
        rehypePlugins: [
          [
            rehypeShiki,
            {
              themes: {
                light: 'github-light',
                dark: 'github-dark-dimmed',
              },
              langs: [
                'typescript',
                'tsx',
                'javascript',
                'jsx',
                'json',
                'bash',
                'sh',
                'yaml',
                'mdx',
                'css',
              ],
              defaultColor: false,
            },
          ],
        ],
      }),
    },
    tanstackStart(),
    viteReact(),
  ],
})

export default config
