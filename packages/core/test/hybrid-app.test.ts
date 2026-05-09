import { describe, expect, test } from 'bun:test'
import type { HttpAdapter, HybridMicroserviceOptions } from '../src/application'
import { BanhmiApplication } from '../src/application'
import { Container } from '../src/container'
import type { ModuleNode } from '../src/module-graph'

// ─── Stubs ────────────────────────────────────────────────────────────────────

class StubAdapter implements HttpAdapter {
  listenCalled = false
  closeCalled = false

  registerController() {}
  async listen(_port: number) {
    this.listenCalled = true
  }
  async close() {
    this.closeCalled = true
  }
  use() {}
}

class StubTransport {
  listenerCalled = false
  closeCalled = false
  private handler: ((msg: unknown) => Promise<unknown>) | null = null

  async listen(handler: (msg: unknown) => Promise<unknown>): Promise<void> {
    this.listenerCalled = true
    this.handler = handler
  }

  async close(): Promise<void> {
    this.closeCalled = true
    this.handler = null
  }

  async emit(msg: unknown): Promise<unknown> {
    if (!this.handler) throw new Error('Not listening')
    return this.handler(msg)
  }

  async send(_pattern: string, _data: unknown) {
    return { data: undefined }
  }
}

function makeApp(adapter: HttpAdapter): BanhmiApplication {
  const container = new Container()
  const moduleTree: ModuleNode = {
    module: class {},
    imports: [],
    controllers: [],
    providers: [],
  }
  return new BanhmiApplication(container, moduleTree, adapter)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BanhmiApplication hybrid app', () => {
  test('connectMicroservice returns this for chaining', () => {
    const adapter = new StubAdapter()
    const app = makeApp(adapter)
    const transport = new StubTransport()
    const ms: HybridMicroserviceOptions = { transport }
    const result = app.connectMicroservice(ms)
    expect(result).toBe(app)
  })

  test('startAllMicroservices starts registered transports', async () => {
    const adapter = new StubAdapter()
    const app = makeApp(adapter)
    const t1 = new StubTransport()
    const t2 = new StubTransport()

    app.connectMicroservice({ transport: t1 })
    app.connectMicroservice({ transport: t2 })

    expect(t1.listenerCalled).toBe(false)
    expect(t2.listenerCalled).toBe(false)

    await app.startAllMicroservices()

    expect(t1.listenerCalled).toBe(true)
    expect(t2.listenerCalled).toBe(true)
  })

  test('startAllMicroservices with no microservices resolves without error', async () => {
    const adapter = new StubAdapter()
    const app = makeApp(adapter)
    await expect(app.startAllMicroservices()).resolves.toBeUndefined()
  })
})
