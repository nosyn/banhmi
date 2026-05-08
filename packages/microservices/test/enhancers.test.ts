import { describe, expect, test } from 'bun:test'
import { ForbiddenException } from '@banhmi/common'
import {
  DefaultMsExceptionFilter,
  type MsExceptionFilter,
  type MsExecutionContext,
  type MsGuard,
  runMsEnhancerPipeline,
} from '../src/enhancers/integration'
import type { MicroserviceMessage } from '../src/types'

function makeCtx(pattern = 'test', data: unknown = null): MsExecutionContext {
  const msg: MicroserviceMessage = { pattern, data }
  return {
    getMessage: () => msg,
    getClass: () => class {},
    getHandler: () => () => {},
  }
}

describe('runMsEnhancerPipeline', () => {
  test('calls handler and returns data', async () => {
    const ctx = makeCtx('ping', 'hello')
    const result = await runMsEnhancerPipeline(
      ctx,
      async () => ({ data: 'pong' }),
      [],
      [],
      [],
    )
    expect(result).toEqual({ data: 'pong' })
  })

  test('guard blocks execution and returns ForbiddenException error', async () => {
    const ctx = makeCtx()
    const blockingGuard: MsGuard = {
      canActivate: () => false,
    }

    const result = await runMsEnhancerPipeline(
      ctx,
      async () => ({ data: 'should not reach' }),
      [blockingGuard],
      [],
      [],
    )
    expect(result.error?.status).toBe(403)
  })

  test('guard allows execution', async () => {
    const ctx = makeCtx()
    const allowGuard: MsGuard = {
      canActivate: () => true,
    }

    const result = await runMsEnhancerPipeline(
      ctx,
      async () => ({ data: 'allowed' }),
      [allowGuard],
      [],
      [],
    )
    expect(result.data).toBe('allowed')
  })

  test('exception filter catches thrown error', async () => {
    const ctx = makeCtx()
    const filter: MsExceptionFilter = {
      catch: (_err, _ctx) => ({
        error: { message: 'Custom filter caught it', status: 422 },
      }),
    }

    const result = await runMsEnhancerPipeline(
      ctx,
      async () => {
        throw new Error('raw error')
      },
      [],
      [],
      [{ filterInstance: filter }],
    )
    expect(result.error?.message).toBe('Custom filter caught it')
    expect(result.error?.status).toBe(422)
  })

  test('typed filter only catches its type', async () => {
    class CustomError extends Error {}

    const ctx = makeCtx()
    const filter: MsExceptionFilter<CustomError> = {
      catch: (err, _ctx) => ({
        error: { message: `custom: ${err.message}`, status: 409 },
      }),
    }

    // CustomError — filter handles it
    const r1 = await runMsEnhancerPipeline(
      ctx,
      async () => {
        throw new CustomError('mine')
      },
      [],
      [],
      [{ filterInstance: filter, type: CustomError }],
    )
    expect(r1.error?.message).toBe('custom: mine')

    // Generic Error — falls through to default
    const r2 = await runMsEnhancerPipeline(
      ctx,
      async () => {
        throw new Error('generic')
      },
      [],
      [],
      [{ filterInstance: filter, type: CustomError }],
    )
    expect(r2.error?.message).toBe('generic')
    expect(r2.error?.status).toBe(500)
  })

  test('handler throwing ForbiddenException is serialised', async () => {
    const ctx = makeCtx()
    const result = await runMsEnhancerPipeline(
      ctx,
      async () => {
        throw new ForbiddenException()
      },
      [],
      [],
      [],
    )
    expect(result.error?.message).toContain('Forbidden')
  })
})

describe('DefaultMsExceptionFilter', () => {
  test('serialises Error to MicroserviceResponse', () => {
    const filter = new DefaultMsExceptionFilter()
    const ctx = makeCtx()
    const result = filter.catch(new Error('oops'), ctx)
    expect(result.error?.message).toBe('oops')
    expect(result.error?.status).toBe(500)
  })

  test('serialises object with status', () => {
    const filter = new DefaultMsExceptionFilter()
    const ctx = makeCtx()
    const err = Object.assign(new Error('not found'), { status: 404 })
    const result = filter.catch(err, ctx)
    expect(result.error?.status).toBe(404)
  })

  test('serialises non-Error values', () => {
    const filter = new DefaultMsExceptionFilter()
    const ctx = makeCtx()
    const result = filter.catch('string error', ctx)
    expect(result.error?.message).toBe('string error')
  })
})
