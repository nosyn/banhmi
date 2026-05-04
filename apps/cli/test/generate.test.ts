import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { generateFile } from '../src/commands/generate'

const TMP_DIR = join(import.meta.dir, '__tmp_gen__')

describe('generateFile', () => {
  afterEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true })
  })

  test('generates a controller file', async () => {
    await generateFile({ type: 'controller', name: 'cats', outDir: TMP_DIR })
    const content = await Bun.file(
      join(TMP_DIR, 'cats', 'cats.controller.ts'),
    ).text()
    expect(content).toContain('@Controller')
    expect(content).toContain('CatsController')
  })

  test('generates a service file', async () => {
    await generateFile({ type: 'service', name: 'cats', outDir: TMP_DIR })
    const content = await Bun.file(
      join(TMP_DIR, 'cats', 'cats.service.ts'),
    ).text()
    expect(content).toContain('@Injectable')
    expect(content).toContain('CatsService')
  })

  test('generates a module file', async () => {
    await generateFile({ type: 'module', name: 'cats', outDir: TMP_DIR })
    const content = await Bun.file(
      join(TMP_DIR, 'cats', 'cats.module.ts'),
    ).text()
    expect(content).toContain('@Module')
    expect(content).toContain('CatsModule')
  })

  test('generates a gateway file', async () => {
    await generateFile({ type: 'gateway', name: 'events', outDir: TMP_DIR })
    const content = await Bun.file(
      join(TMP_DIR, 'events', 'events.gateway.ts'),
    ).text()
    expect(content).toContain('@WebSocketGateway')
    expect(content).toContain('EventsGateway')
  })

  test('handles hyphenated names with PascalCase conversion', async () => {
    await generateFile({
      type: 'controller',
      name: 'user-profile',
      outDir: TMP_DIR,
    })
    const content = await Bun.file(
      join(TMP_DIR, 'user-profile', 'user-profile.controller.ts'),
    ).text()
    expect(content).toContain('UserProfileController')
  })
})
