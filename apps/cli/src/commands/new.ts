import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  appModuleTemplate,
  biomeConfigTemplate,
  mainTsTemplate,
  packageJsonTemplate,
  tsconfigTemplate,
} from '../templates/project'

export interface ScaffoldOptions {
  name: string
  outDir?: string
}

export async function scaffoldProject(options: ScaffoldOptions): Promise<void> {
  const { name, outDir = process.cwd() } = options
  const projectDir = join(outDir, name)
  const srcDir = join(projectDir, 'src')

  await mkdir(srcDir, { recursive: true })

  await Promise.all([
    Bun.write(join(projectDir, 'package.json'), packageJsonTemplate(name)),
    Bun.write(join(projectDir, 'tsconfig.json'), tsconfigTemplate()),
    Bun.write(join(projectDir, 'biome.json'), biomeConfigTemplate()),
    Bun.write(join(srcDir, 'main.ts'), mainTsTemplate(name)),
    Bun.write(join(srcDir, 'app.module.ts'), appModuleTemplate()),
  ])
}
