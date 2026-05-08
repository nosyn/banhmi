import { describe, expect, it } from 'bun:test'
import { rewriteImports } from '../rewrites/imports'

describe('rewriteImports', () => {
  it('rewrites @nestjs/common to @banhmi/common', () => {
    const input = `import { Module } from '@nestjs/common'`
    expect(rewriteImports(input)).toBe(`import { Module } from '@banhmi/common'`)
  })

  it('rewrites @nestjs/core to @banhmi/core', () => {
    const input = `import { NestFactory } from '@nestjs/core'`
    expect(rewriteImports(input)).toBe(`import { NestFactory } from '@banhmi/core'`)
  })

  it('rewrites @nestjs/swagger to @banhmi/openapi', () => {
    const input = `import { ApiProperty } from '@nestjs/swagger'`
    expect(rewriteImports(input)).toBe(`import { ApiProperty } from '@banhmi/openapi'`)
  })

  it('rewrites @nestjs/config to @banhmi/config', () => {
    const input = `import { ConfigModule } from '@nestjs/config'`
    expect(rewriteImports(input)).toBe(`import { ConfigModule } from '@banhmi/config'`)
  })

  it('rewrites @nestjs/jwt to @banhmi/jwt', () => {
    const input = `import { JwtModule } from '@nestjs/jwt'`
    expect(rewriteImports(input)).toBe(`import { JwtModule } from '@banhmi/jwt'`)
  })

  it('rewrites @nestjs/throttler to @banhmi/throttler', () => {
    const input = `import { ThrottlerModule } from '@nestjs/throttler'`
    expect(rewriteImports(input)).toBe(
      `import { ThrottlerModule } from '@banhmi/throttler'`,
    )
  })

  it('rewrites @nestjs/microservices to @banhmi/microservices', () => {
    const input = `import { ClientsModule } from '@nestjs/microservices'`
    expect(rewriteImports(input)).toBe(
      `import { ClientsModule } from '@banhmi/microservices'`,
    )
  })

  it('rewrites @nestjs/passport to @banhmi/auth', () => {
    const input = `import { AuthGuard } from '@nestjs/passport'`
    expect(rewriteImports(input)).toBe(`import { AuthGuard } from '@banhmi/auth'`)
  })

  it('handles double-quoted imports', () => {
    const input = `import { Injectable } from "@nestjs/common"`
    expect(rewriteImports(input)).toBe(`import { Injectable } from "@banhmi/common"`)
  })

  it('rewrites multiple imports in the same file', () => {
    const input = [
      `import { Module } from '@nestjs/common'`,
      `import { NestFactory } from '@nestjs/core'`,
      `import { ApiProperty } from '@nestjs/swagger'`,
    ].join('\n')
    const expected = [
      `import { Module } from '@banhmi/common'`,
      `import { NestFactory } from '@banhmi/core'`,
      `import { ApiProperty } from '@banhmi/openapi'`,
    ].join('\n')
    expect(rewriteImports(input)).toBe(expected)
  })

  it('does not touch non-nestjs imports', () => {
    const input = `import { something } from 'some-other-package'`
    expect(rewriteImports(input)).toBe(input)
  })
})
