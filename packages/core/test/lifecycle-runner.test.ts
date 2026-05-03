import { describe, expect, mock, test } from 'bun:test'
import { Injectable } from '@bunnest/common'
import { Container } from '../src/container'
import { LifecycleRunner } from '../src/lifecycle-runner'

describe('LifecycleRunner', () => {
  test('calls onModuleInit on providers that implement it', async () => {
    const initFn = mock(() => Promise.resolve())

    @Injectable()
    class InitService {
      static inject = [] as const
      onModuleInit = initFn
    }

    @Injectable()
    class PlainService {
      static inject = [] as const
    }

    const container = new Container()
    container.register(InitService)
    container.register(PlainService)

    const runner = new LifecycleRunner(container)
    await runner.runModuleInit([InitService, PlainService])

    expect(initFn).toHaveBeenCalledTimes(1)
  })

  test('calls onModuleDestroy on providers that implement it', async () => {
    const destroyFn = mock(() => Promise.resolve())

    @Injectable()
    class CleanupService {
      static inject = [] as const
      onModuleDestroy = destroyFn
    }

    const container = new Container()
    container.register(CleanupService)

    const runner = new LifecycleRunner(container)
    await runner.runModuleDestroy([CleanupService])

    expect(destroyFn).toHaveBeenCalledTimes(1)
  })
})
