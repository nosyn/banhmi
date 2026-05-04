import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { scaffoldProject } from '../src/commands/new'

const TMP_DIR = join(import.meta.dir, '__tmp_new__')

describe('scaffoldProject', () => {
  afterEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true })
  })

  test('creates project directory with required files', async () => {
    await scaffoldProject({ name: 'my-app', outDir: TMP_DIR })

    expect(
      await Bun.file(join(TMP_DIR, 'my-app', 'package.json')).exists(),
    ).toBe(true)
    expect(
      await Bun.file(join(TMP_DIR, 'my-app', 'src', 'main.ts')).exists(),
    ).toBe(true)
    expect(
      await Bun.file(join(TMP_DIR, 'my-app', 'src', 'app.module.ts')).exists(),
    ).toBe(true)
    expect(await Bun.file(join(TMP_DIR, 'my-app', 'biome.json')).exists()).toBe(
      true,
    )
    expect(
      await Bun.file(join(TMP_DIR, 'my-app', 'tsconfig.json')).exists(),
    ).toBe(true)
  })

  test('package.json contains project name', async () => {
    await scaffoldProject({ name: 'hello-world', outDir: TMP_DIR })
    const pkgJson = (await Bun.file(
      join(TMP_DIR, 'hello-world', 'package.json'),
    ).json()) as {
      name: string
    }
    expect(pkgJson.name).toBe('hello-world')
  })

  test('main.ts bootstraps the app with the project name', async () => {
    await scaffoldProject({ name: 'test-app', outDir: TMP_DIR })
    const main = await Bun.file(
      join(TMP_DIR, 'test-app', 'src', 'main.ts'),
    ).text()
    expect(main).toContain('BanhmiFactory')
    expect(main).toContain('listen')
    expect(main).toContain('test-app')
  })

  test('app.module.ts exports AppModule', async () => {
    await scaffoldProject({ name: 'test-app', outDir: TMP_DIR })
    const content = await Bun.file(
      join(TMP_DIR, 'test-app', 'src', 'app.module.ts'),
    ).text()
    expect(content).toContain('AppModule')
    expect(content).toContain('@Module')
  })
})
