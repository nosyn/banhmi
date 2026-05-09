import { EVENT_EMITTER_TOKEN, type EventEmitter } from '@banhmi/events'
import { ApiOperation, ApiResponse, ApiTags } from '@banhmi/openapi'
import type { SseEvent } from '@banhmi/sse'
import { Sse, sseToReadableStream } from '@banhmi/sse'
import { Controller, Injectable, StreamableFile } from 'banhmi'

/**
 * SSE controller — streams `task.created` and `task.deleted` events to
 * connected clients on `GET /events`.
 */
@ApiTags('events')
@Controller()
@Injectable()
export class EventsController {
  static inject = [EVENT_EMITTER_TOKEN] as const

  constructor(private readonly emitter: EventEmitter) {}

  @ApiOperation({ summary: 'Subscribe to task events via SSE' })
  @ApiResponse({
    status: 200,
    description: 'SSE stream — task.created / task.deleted events',
  })
  @Sse('/events')
  stream() {
    const emitter = this.emitter

    async function* source(): AsyncIterable<SseEvent> {
      // Buffer events that arrive while the generator is yielding
      const queue: SseEvent[] = []
      // Signal: set by the listener each time an event arrives
      const signals: Array<() => void> = []

      const onCreated = (task: unknown) => {
        queue.push({ event: 'task.created', data: task })
        const wake = signals.shift()
        wake?.()
      }
      const onDeleted = (payload: unknown) => {
        queue.push({ event: 'task.deleted', data: payload })
        const wake = signals.shift()
        wake?.()
      }

      emitter.on('task.created', onCreated)
      emitter.on('task.deleted', onDeleted)

      try {
        while (true) {
          if (queue.length > 0) {
            // biome-ignore lint/style/noNonNullAssertion: queue.length > 0 guarantees shift() returns
            yield queue.shift()!
          } else {
            // Wait for either an event or a heartbeat timeout
            await new Promise<void>((res) => {
              signals.push(res)
              // Heartbeat every 5 s keeps the connection alive
              setTimeout(() => {
                const idx = signals.indexOf(res)
                if (idx !== -1) signals.splice(idx, 1)
                res()
              }, 5_000)
            })
          }
        }
      } finally {
        emitter.off('task.created', onCreated)
        emitter.off('task.deleted', onDeleted)
      }
    }

    return new StreamableFile(sseToReadableStream(source()))
  }
}
