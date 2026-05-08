/**
 * Bun plugin that auto-injects `@ApiProperty()` on undecorated typed class
 * properties at load time.
 *
 * Opt-in by adding this file to your `bunfig.toml` preload list or by calling
 * `Bun.plugin(...)` manually.
 *
 * @example
 * // bunfig.toml
 * preload = ["@banhmi/openapi/cli"]
 *
 * @example
 * // Programmatic opt-in
 * import '@banhmi/openapi/cli'
 */
import { transformSource } from './transform'

const plugin: import('bun').BunPlugin = {
  name: '@banhmi/openapi/cli',
  setup(build) {
    build.onLoad({ filter: /\.[cm]?tsx?$/ }, async (args) => {
      const source = await Bun.file(args.path).text()
      const transformed = transformSource(source)
      return {
        contents: transformed,
        loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts',
      }
    })
  },
}

Bun.plugin(plugin)
