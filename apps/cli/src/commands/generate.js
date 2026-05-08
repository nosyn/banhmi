import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  controllerTemplate,
  gatewayTemplate,
  moduleTemplate,
  serviceTemplate,
} from '../templates/generate'

const TEMPLATES = {
  controller: controllerTemplate,
  gateway: gatewayTemplate,
  module: moduleTemplate,
  service: serviceTemplate,
}
const EXTENSIONS = {
  controller: 'controller.ts',
  gateway: 'gateway.ts',
  module: 'module.ts',
  service: 'service.ts',
}
export async function generateFile(options) {
  const { name, outDir = process.cwd(), type } = options
  const targetDir = join(outDir, name)
  // Guard against path traversal
  if (
    !resolve(targetDir).startsWith(`${resolve(outDir)}/`) &&
    resolve(targetDir) !== resolve(outDir)
  ) {
    throw new Error(`Invalid name: "${name}" would escape the output directory`)
  }
  await mkdir(targetDir, { recursive: true })
  const content = TEMPLATES[type](name)
  const filename = `${name}.${EXTENSIONS[type]}`
  await Bun.write(join(targetDir, filename), content)
}
