// Demo: @banhmi/queue — BullMQ-style Redis queues.
//
// POST /email/send — enqueues an email job
// GET  /email/sent — returns the send count from the processor

import type { ProcessorContext } from '@banhmi/queue'
import { InjectQueue, Process, Processor, type Queue } from '@banhmi/queue'
import type { RouteCtx } from 'banhmi'
import { Controller, Get, Injectable, Post } from 'banhmi'

// counter shared between producer and processor in this demo
export let sendCount = 0

@Injectable()
@Processor('demo-emails')
export class DemoEmailProcessor {
  @Process('send')
  async send(ctx: ProcessorContext<{ to: string }>) {
    ctx.log(`Sending to ${ctx.job.data.to}`)
    sendCount++
  }
}

@Controller()
export class EmailController {
  static inject = [InjectQueue('demo-emails')] as const

  constructor(private readonly queue: Queue<{ to: string }>) {}

  @Post('/email/send')
  async sendEmail(ctx: RouteCtx) {
    const body = (await ctx.req.json()) as { to: string }
    await this.queue.add('send', { to: body.to })
    return { queued: true }
  }

  @Get('/email/sent')
  getSentCount(_ctx: RouteCtx) {
    return { sent: sendCount }
  }
}

// Use an in-memory mock for the demo (no real Redis needed for the test)
import type { Redis } from 'ioredis'

/** Creates a minimal in-memory Redis mock suitable for unit tests. */
export function createMockRedis() {
  const data: Record<string, Record<string, string>> = {}
  const lists: Record<string, string[]> = {}
  const sortedSets: Record<string, Array<{ score: number; id: string }>> = {}

  return {
    hset: async (key: string, fields: Record<string, string>) => {
      data[key] = { ...(data[key] ?? {}), ...fields }
      return 1
    },
    hgetall: async (key: string) => data[key] ?? null,
    lpush: async (key: string, ...ids: string[]) => {
      if (!lists[key]) lists[key] = []
      lists[key].unshift(...ids)
      return lists[key].length
    },
    rpop: async (key: string) => {
      const list = lists[key]
      if (!list || list.length === 0) return null
      return list.pop() ?? null
    },
    zadd: async (key: string, score: number, id: string) => {
      if (!sortedSets[key]) sortedSets[key] = []
      sortedSets[key].push({ score, id })
      return 1
    },
    zrangebyscore: async (key: string, _min: string, max: number) => {
      const set = sortedSets[key]
      if (!set) return []
      return set.filter((e) => e.score <= max).map((e) => e.id)
    },
    zrem: async (key: string, id: string) => {
      const set = sortedSets[key]
      if (!set) return 0
      const idx = set.findIndex((e) => e.id === id)
      if (idx >= 0) set.splice(idx, 1)
      return 1
    },
  } as unknown as Redis
}
