export function packageJsonTemplate(name: string): string {
  return JSON.stringify(
    {
      name,
      version: '0.0.1',
      type: 'module',
      scripts: {
        dev: 'bun run --watch src/main.ts',
        start: 'bun run src/main.ts',
        test: 'bun test',
        lint: 'biome check src/',
        format: 'biome format --write src/',
      },
      dependencies: {
        banhmi: 'latest',
      },
      devDependencies: {
        '@biomejs/biome': 'latest',
        typescript: '^5.7.0',
      },
    },
    null,
    2,
  )
}

export function tsconfigTemplate(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        skipLibCheck: true,
        experimentalDecorators: false,
      },
      include: ['src'],
    },
    null,
    2,
  )
}

export function mainTsTemplate(appName: string): string {
  const safeName = JSON.stringify(appName)
  return `import { BanhmiFactory } from 'banhmi'
import { AppModule } from './app.module'

const app = await BanhmiFactory.create(AppModule)

app.listen(parseInt(Bun.env.PORT ?? '3000', 10))
console.log(${safeName} + ' listening on port ' + (Bun.env.PORT ?? '3000'))
`
}

export function appModuleTemplate(): string {
  return `import { Module } from 'banhmi'

@Module({})
export class AppModule {}
`
}

export function biomeConfigTemplate(): string {
  return JSON.stringify(
    {
      $schema: 'https://biomejs.dev/schemas/1.9.0/schema.json',
      organizeImports: { enabled: true },
      linter: {
        enabled: true,
        rules: { recommended: true },
      },
      formatter: {
        enabled: true,
        indentStyle: 'space',
        indentWidth: 2,
      },
      javascript: {
        formatter: {
          quoteStyle: 'single',
          semicolons: 'asNeeded',
          trailingCommas: 'all',
        },
      },
    },
    null,
    2,
  )
}
