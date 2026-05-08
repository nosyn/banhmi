import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { applyAll } from '../nestjs-to-banhmi'
import { rewriteImports } from '../rewrites/imports'
import { rewriteInjectToStatic } from '../rewrites/inject-to-static'
import { rewriteSwaggerToOpenapi } from '../rewrites/swagger-to-openapi'

const FIXTURE_PATH = join(import.meta.dir, 'fixtures', 'cats.service.ts')

describe('applyAll (integration)', () => {
  let original: string

  beforeEach(async () => {
    original = await Bun.file(FIXTURE_PATH).text()
  })

  afterEach(async () => {
    // Restore fixture after each test
    await Bun.write(FIXTURE_PATH, original)
  })

  it('rewrites all nestjs imports to banhmi in the fixture', () => {
    const out = applyAll(original)
    expect(out).toContain(`from '@banhmi/common'`)
    expect(out).toContain(`from '@banhmi/openapi'`)
    expect(out).not.toContain('@nestjs/')
  })

  it('rewrites @Inject to static inject in the fixture', () => {
    const out = applyAll(original)
    expect(out).toContain('static inject = [CAT_REPO] as const')
    expect(out).not.toContain('@Inject(CAT_REPO)')
  })

  it('rewrites ApiModelProperty to ApiProperty in the fixture', () => {
    const out = applyAll(original)
    expect(out).toContain('@ApiProperty()')
    expect(out).not.toContain('@ApiModelProperty()')
  })

  it('rewrites are idempotent (applying twice gives same result)', () => {
    const once = applyAll(original)
    const twice = applyAll(once)
    expect(twice).toBe(once)
  })

  it('pipeline composes correctly: imports → inject-to-static → swagger', () => {
    const source = [
      `import { Injectable, Inject } from '@nestjs/common'`,
      `import { ApiModelProperty } from '@nestjs/swagger'`,
      `@Injectable()`,
      `class Svc { constructor(@Inject(T) private t: T) {} }`,
    ].join('\n')

    const out = applyAll(source)
    expect(out).toContain(`from '@banhmi/common'`)
    expect(out).toContain(`from '@banhmi/openapi'`)
    expect(out).toContain('static inject = [T] as const')
    expect(out).not.toContain('@Inject(T)')
    // ApiModelProperty is in import statement which has been rewritten
    // (rewriteSwaggerToOpenapi renames identifier in import too)
  })
})
