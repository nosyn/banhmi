import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  appModuleTemplate,
  biomeConfigTemplate,
  mainTsTemplate,
  packageJsonTemplate,
  tsconfigTemplate,
} from '../templates/project'
export async function scaffoldProject(options) {
  const { name, outDir = process.cwd() } = options
  const projectDir = join(outDir, name)
  // Guard against path traversal
  if (
    !resolve(projectDir).startsWith(`${resolve(outDir)}/`) &&
    resolve(projectDir) !== resolve(outDir)
  ) {
    throw new Error(
      `Invalid project name: "${name}" would escape the output directory`,
    )
  }
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
