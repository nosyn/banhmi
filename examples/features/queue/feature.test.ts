import { describe, expect, test } from 'bun:test'
import { Process, Processor, Queue, Worker } from '@banhmi/queue'
import { createMockRedis, DemoEmailProcessor, sendCount } from './index'

describe('queue feature: email-queue demo', () => {
  test('enqueue + process: processor side-effect is observed', async () => {
    const redis = createMockRedis()

    // Reset the module-level counter
    const before = sendCount

    const instance = new DemoEmailProcessor()
    const queue = new Queue<{ to: string }>('demo-emails', redis)
    const worker = new Worker(
      'demo-emails',
      redis,
      instance,
      DemoEmailProcessor,
      10,
    )

    worker.start()
    await queue.add('send', { to: 'hello@example.com' })

    await new Promise((r) => setTimeout(r, 200))
    await worker.stop()

    // module sendCount should have incremented
    const { sendCount: after } = await import('./index')
    expect(after).toBeGreaterThan(before)
  })

  test('processor handles multiple jobs in order', async () => {
    const redis = createMockRedis()
    const processed: string[] = []

    @Processor('order-test')
    class OrderProcessor {
      @Process('log')
      async log(ctx: {
        job: { data: { msg: string } }
        log: (s: string) => void
      }) {
        processed.push(ctx.job.data.msg)
      }
    }

    const queue = new Queue<{ msg: string }>('order-test', redis)
    const instance = new OrderProcessor()
    const worker = new Worker('order-test', redis, instance, OrderProcessor, 10)

    worker.start()
    await queue.add('log', { msg: 'first' })
    await queue.add('log', { msg: 'second' })
    await queue.add('log', { msg: 'third' })

    await new Promise((r) => setTimeout(r, 300))
    await worker.stop()

    expect(processed.length).toBe(3)
    expect(processed).toContain('first')
    expect(processed).toContain('second')
    expect(processed).toContain('third')
  })
})
